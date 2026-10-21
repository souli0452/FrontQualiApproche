import { Component, Input, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgPrimeModule } from '@prime-ng';
import { Subject, takeUntil } from 'rxjs';
import { MessageService } from 'primeng/api';
import { AuditGestionService, contenu, messageErreur } from '../../services/audit.service';
import { PreuveConstat } from '../../models/audit.model';

/** Les règles du serveur (ReglesDePieceJointe, lib-storage), vérifiées avant l'envoi. */
const EXTENSIONS_ADMISES = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp',
    'txt', 'csv', 'rtf', 'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg', 'zip'];
const TAILLE_MAX_MO = 25;

/**
 * Les éléments de preuve d'un constat : liste, téléchargement, et — tant que le constat se
 * modifie — dépôt et retrait. Avant le premier enregistrement, les fichiers choisis attendent
 * ici : la saisie les dépose (deposerEnAttente) dès que le constat existe.
 */
@Component({
    selector: 'app-preuves-constat',
    standalone: true,
    imports: [CommonModule, NgPrimeModule],
    template: `
        <div class="flex flex-wrap items-center gap-2">
            <span *ngIf="constatId && !preuves.length && !modifiable" class="text-xs text-surface-400">Aucune preuve jointe.</span>
            <span *ngFor="let p of preuves"
                  class="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-xs bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-200">
                <i class="pi pi-paperclip text-xs"></i>
                <button type="button" class="bg-transparent border-0 p-0 cursor-pointer text-inherit hover:underline" (click)="telecharger(p)">{{ p.nom }}</button>
                <button *ngIf="modifiable" type="button" class="bg-transparent border-0 p-0.5 cursor-pointer text-surface-400 hover:text-red-500"
                        (click)="retirer(p)" aria-label="Retirer la preuve"><i class="pi pi-times text-[10px]"></i></button>
            </span>
            <span *ngFor="let f of enAttente; let i = index" title="Sera jointe à l'enregistrement du constat"
                  class="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-xs border border-dashed border-primary text-primary">
                <i class="pi pi-clock text-xs"></i>
                <span>{{ f.name }}</span>
                <button *ngIf="modifiable" type="button" class="bg-transparent border-0 p-0.5 cursor-pointer text-surface-400 hover:text-red-500"
                        (click)="enAttente.splice(i, 1)" aria-label="Ne pas joindre ce fichier"><i class="pi pi-times text-[10px]"></i></button>
            </span>
            <span *ngIf="modifiable && !constatId && source === 'notation'" class="text-xs text-surface-400">Enregistrez la notation pour y joindre une pièce.</span>
            <label *ngIf="modifiable && (constatId || source === 'constat')" class="p-button p-button-outlined p-button-sm cursor-pointer !py-1">
                <i class="pi" [ngClass]="envoi ? 'pi-spin pi-spinner' : 'pi-upload'"></i>
                <span class="ml-2">Joindre un fichier</span>
                <input type="file" class="hidden" multiple [accept]="accept" (change)="joindre($event)" [disabled]="envoi" />
            </label>
            <span *ngIf="modifiable" class="text-xs text-surface-500">PDF, documents de bureau, images ou ZIP · {{ tailleMaxMo }} Mo max par fichier</span>
            <span *ngIf="modifiable && !constatId && enAttente.length" class="text-xs text-surface-500 w-full">
                Ces fichiers seront joints à l'enregistrement du constat.
            </span>
        </div>
    `
})
export class PreuvesConstatComponent implements OnChanges, OnDestroy {
    @Input() constatId?: string | null;
    @Input() modifiable = false;
    /** Ce que portent les pièces : un constat, ou la notation d'un critère RQAP-BF (observation 31). */
    @Input() source: 'constat' | 'notation' = 'constat';

    preuves: PreuveConstat[] = [];
    /** Choisis avant que le constat n'existe : déposés par deposerEnAttente. */
    enAttente: File[] = [];
    envoi = false;
    readonly accept = EXTENSIONS_ADMISES.map(e => '.' + e).join(',');
    readonly tailleMaxMo = TAILLE_MAX_MO;
    private destroy$ = new Subject<void>();

    constructor(private auditService: AuditGestionService, private messageService: MessageService) {}

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['constatId']) {
            this.charger();
        }
    }

    charger(): void {
        this.preuves = [];
        if (!this.constatId) {
            return;
        }
        const lecture$ = this.source === 'notation' ? this.auditService.getPreuvesNotation(this.constatId) : this.auditService.getPreuves(this.constatId);
        lecture$.pipe(takeUntil(this.destroy$)).subscribe({
            next: res => (this.preuves = contenu<PreuveConstat>(res)),
            error: () => (this.preuves = [])
        });
    }

    joindre(event: Event): void {
        const input = event.target as HTMLInputElement;
        const fichiers = this.admissibles(Array.from(input.files ?? []));
        input.value = '';
        if (!fichiers.length) {
            return;
        }
        if (!this.constatId) {
            // Une notation n'a pas de dépôt différé : elle s'enregistre d'abord.
            if (this.source === 'constat') {
                this.enAttente.push(...fichiers);
            }
            return;
        }
        this.envoyer(this.constatId, fichiers);
    }

    /** Dépose, sur le constat qui vient d'être créé, les fichiers choisis avant son enregistrement. */
    deposerEnAttente(constatId: string): void {
        const fichiers = this.enAttente;
        this.enAttente = [];
        if (fichiers.length) {
            this.envoyer(constatId, fichiers);
        }
    }

    /** Oublie les fichiers en attente : la saisie passe à un autre constat. */
    vider(): void {
        this.enAttente = [];
    }

    /** Un seul envoi pour tous les fichiers, donc un seul message s'il échoue. */
    private envoyer(constatId: string, fichiers: File[]): void {
        this.envoi = true;
        const envoi$ = this.source === 'notation' ? this.auditService.ajouterPreuvesNotation(constatId, fichiers) : this.auditService.ajouterPreuves(constatId, fichiers);
        envoi$.pipe(takeUntil(this.destroy$)).subscribe({
            next: () => {
                this.envoi = false;
                if (this.constatId === constatId) {
                    this.charger();
                }
            },
            error: err => {
                this.envoi = false;
                const quoi = fichiers.length > 1 ? `Les ${fichiers.length} fichiers n'ont pas pu être joints.` : `« ${fichiers[0].name} » n'a pas pu être joint.`;
                this.messageService.add({ severity: 'error', summary: 'Preuves non jointes', detail: messageErreur(err, quoi), life: 8000 });
            }
        });
    }

    /** Écarte, avec un seul message, ce que le serveur refuserait : format inconnu ou fichier trop lourd. */
    private admissibles(fichiers: File[]): File[] {
        const refuses: string[] = [];
        const retenus = fichiers.filter(f => {
            const point = f.name.lastIndexOf('.');
            const ext = point < 0 ? '' : f.name.substring(point + 1).toLowerCase();
            const ok = EXTENSIONS_ADMISES.includes(ext) && f.size <= TAILLE_MAX_MO * 1024 * 1024;
            if (!ok) {
                refuses.push(f.name);
            }
            return ok;
        });
        if (refuses.length) {
            this.messageService.add({
                severity: 'warn', summary: 'Fichier écarté', life: 8000,
                detail: `${refuses.join(', ')} : format non admis ou plus de ${TAILLE_MAX_MO} Mo. Formats acceptés : PDF, documents de bureau, images, ZIP.`
            });
        }
        return retenus;
    }

    retirer(p: PreuveConstat): void {
        const retrait$ = this.source === 'notation' ? this.auditService.supprimerPreuveNotation(p.id!) : this.auditService.supprimerPreuve(p.id!);
        retrait$.pipe(takeUntil(this.destroy$)).subscribe({
            next: () => this.charger(),
            error: err => this.messageService.add({ severity: 'error', summary: 'Erreur', detail: messageErreur(err, 'Le retrait a échoué.'), life: 8000 })
        });
    }

    telecharger(p: PreuveConstat): void {
        const fichier$ = this.source === 'notation' ? this.auditService.telechargerPreuveNotation(p.id!) : this.auditService.telechargerPreuve(p.id!);
        fichier$.pipe(takeUntil(this.destroy$)).subscribe({
            next: blob => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = p.nom ?? 'preuve';
                a.click();
                URL.revokeObjectURL(url);
            },
            error: err => this.messageService.add({ severity: 'error', summary: 'Erreur', detail: messageErreur(err, 'Le téléchargement a échoué.'), life: 8000 })
        });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }
}
