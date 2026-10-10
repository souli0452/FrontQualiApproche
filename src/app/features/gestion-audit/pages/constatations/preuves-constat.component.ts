import { Component, Input, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgPrimeModule } from '@prime-ng';
import { Subject, takeUntil } from 'rxjs';
import { MessageService } from 'primeng/api';
import { AuditGestionService, contenu, messageErreur } from '../../services/audit.service';
import { PreuveConstat } from '../../models/audit.model';

/**
 * Les éléments de preuve d'un constat : liste, téléchargement, et — tant que le constat se
 * modifie — dépôt et retrait. Un constat pas encore enregistré n'a pas de preuve.
 */
@Component({
    selector: 'app-preuves-constat',
    standalone: true,
    imports: [CommonModule, NgPrimeModule],
    template: `
        <div class="flex flex-wrap items-center gap-2">
            <span *ngIf="!constatId" class="text-xs text-surface-400">Enregistrez le constat pour y joindre une preuve.</span>
            <span *ngIf="constatId && !preuves.length && !modifiable" class="text-xs text-surface-400">Aucune preuve jointe.</span>
            <span *ngFor="let p of preuves"
                  class="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-xs bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-200">
                <i class="pi pi-paperclip text-xs"></i>
                <button type="button" class="bg-transparent border-0 p-0 cursor-pointer text-inherit hover:underline" (click)="telecharger(p)">{{ p.nom }}</button>
                <button *ngIf="modifiable" type="button" class="bg-transparent border-0 p-0.5 cursor-pointer text-surface-400 hover:text-red-500"
                        (click)="retirer(p)" aria-label="Retirer la preuve"><i class="pi pi-times text-[10px]"></i></button>
            </span>
            <label *ngIf="constatId && modifiable" class="p-button p-button-outlined p-button-secondary p-button-sm cursor-pointer !py-1">
                <i class="pi" [ngClass]="envoi ? 'pi-spin pi-spinner' : 'pi-upload'"></i>
                <span class="ml-2">Joindre un fichier</span>
                <input type="file" class="hidden" multiple (change)="joindre($event)" [disabled]="envoi" />
            </label>
        </div>
    `
})
export class PreuvesConstatComponent implements OnChanges, OnDestroy {
    @Input() constatId?: string | null;
    @Input() modifiable = false;

    preuves: PreuveConstat[] = [];
    envoi = false;
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
        this.auditService.getPreuves(this.constatId).pipe(takeUntil(this.destroy$)).subscribe({
            next: res => (this.preuves = contenu<PreuveConstat>(res)),
            error: () => (this.preuves = [])
        });
    }

    joindre(event: Event): void {
        const input = event.target as HTMLInputElement;
        const fichiers = Array.from(input.files ?? []);
        input.value = '';
        if (!this.constatId || !fichiers.length) {
            return;
        }
        this.envoi = true;
        let restants = fichiers.length;
        fichiers.forEach(f => this.auditService.ajouterPreuve(this.constatId!, f).pipe(takeUntil(this.destroy$)).subscribe({
            next: () => { if (--restants === 0) { this.envoi = false; this.charger(); } },
            error: err => {
                if (--restants === 0) { this.envoi = false; this.charger(); }
                this.messageService.add({ severity: 'error', summary: 'Erreur', detail: messageErreur(err, `« ${f.name} » n'a pas pu être joint.`), life: 8000 });
            }
        }));
    }

    retirer(p: PreuveConstat): void {
        this.auditService.supprimerPreuve(p.id!).pipe(takeUntil(this.destroy$)).subscribe({
            next: () => this.charger(),
            error: err => this.messageService.add({ severity: 'error', summary: 'Erreur', detail: messageErreur(err, 'Le retrait a échoué.'), life: 8000 })
        });
    }

    telecharger(p: PreuveConstat): void {
        this.auditService.telechargerPreuve(p.id!).pipe(takeUntil(this.destroy$)).subscribe({
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
