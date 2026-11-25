import { Component, Input, OnChanges, OnDestroy, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { MessageService } from 'primeng/api';
import { FileUploadComponent } from '@features/non-conformite/components/file-upload/file-upload.component';
import { AuditGestionService, contenu, messageErreur } from '../../services/audit.service';
import { PreuveConstat } from '../../models/audit.model';

/** Les règles du serveur (ReglesDePieceJointe, lib-storage), vérifiées avant l'envoi. */
const EXTENSIONS_ADMISES = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp',
    'txt', 'csv', 'rtf', 'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg', 'zip'];
const TAILLE_MAX_MO = 25;

/**
 * Smart Component : gère les preuves d'un constat ou d'une notation RQAP-BF
 * (chargement, envoi immédiat ou différé avant création, téléchargement et retrait)
 * et délègue tout le rendu au composant standard <app-file-upload>.
 */
@Component({
    selector: 'app-preuves-constat',
    standalone: true,
    imports: [CommonModule, FileUploadComponent],
    template: `
        <app-file-upload
            [existingFiles]="preuves"
            [maxFiles]="maxPreuves"
            [maxFileSizeMB]="tailleMaxMo"
            [allowedExts]="extensionsAdmises"
            [readonly]="estLectureSeule"
            [showDownload]="true"
            [immediate]="!!constatId"
            [uploading]="envoi"
            [hint]="texteFormats"
            [disabledMessage]="messageIndisponible"
            [pendingHint]="messageEnAttente"
            emptyMessage="Glissez-déposez vos preuves ici"
            (filesAdded)="onFilesAdded($event)"
            (fileUploaded)="onQueueChange($event)"
            (removeExisting)="retirerParIndex($event)"
            (downloadExisting)="telechargerParIndex($event)">
        </app-file-upload>
    `
})
export class PreuvesConstatComponent implements OnChanges, OnDestroy {
    @Input() constatId?: string | null;
    @Input() modifiable = false;
    /** Ce que portent les pièces : un constat, ou la notation d'un critère RQAP-BF (observation 31). */
    @Input() source: 'constat' | 'notation' = 'constat';

    @ViewChild(FileUploadComponent) private uploader?: FileUploadComponent;

    preuves: PreuveConstat[] = [];
    /** Choisis avant que le constat n'existe : déposés par deposerEnAttente. */
    enAttente: File[] = [];
    envoi = false;

    readonly extensionsAdmises = EXTENSIONS_ADMISES;
    readonly tailleMaxMo = TAILLE_MAX_MO;
    readonly maxPreuves = 20;
    readonly texteFormats = `PDF, bureau, images, ZIP · ${TAILLE_MAX_MO} Mo max`;

    private destroy$ = new Subject<void>();

    constructor(private auditService: AuditGestionService, private messageService: MessageService) {}

    get estLectureSeule(): boolean {
        return !this.modifiable || (!this.constatId && this.source === 'notation');
    }

    get messageIndisponible(): string {
        if (this.modifiable && !this.constatId && this.source === 'notation') {
            return 'Enregistrez la notation pour y joindre une pièce.';
        }
        return 'Aucune preuve jointe.';
    }

    get messageEnAttente(): string {
        return this.modifiable && !this.constatId && this.source === 'constat' && this.enAttente.length > 0
            ? "Ces fichiers seront joints automatiquement à l'enregistrement du constat."
            : '';
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['constatId']) {
            if (this.constatId) {
                this.enAttente = [];
                this.uploader?.clear(false);
            }
            this.charger();
        }
    }

    charger(): void {
        this.preuves = [];
        if (!this.constatId) {
            return;
        }
        const lecture$ = this.source === 'notation'
            ? this.auditService.getPreuvesNotation(this.constatId)
            : this.auditService.getPreuves(this.constatId);
        lecture$.pipe(takeUntil(this.destroy$)).subscribe({
            next: res => (this.preuves = contenu<PreuveConstat>(res)),
            error: () => (this.preuves = [])
        });
    }

    /** Déclenché par <app-file-upload> quand des fichiers valides sont ajoutés. */
    onFilesAdded(fichiers: File[]): void {
        if (!fichiers.length || !this.constatId) {
            // Si !constatId (mode différé), la file locale est déjà synchronisée par onQueueChange().
            return;
        }
        this.envoyer(this.constatId, fichiers);
    }

    /** Synchronise la file d'attente locale (ajout ou suppression avant le 1er enregistrement). */
    onQueueChange(items: { file: File }[]): void {
        if (!this.constatId && this.source === 'constat') {
            this.enAttente = (items ?? []).map(x => x.file);
        }
    }

    /** Dépose, sur le constat qui vient d'être créé, les fichiers choisis avant son enregistrement. */
    deposerEnAttente(constatId: string): void {
        const fichiers = [...this.enAttente];
        this.enAttente = [];
        this.uploader?.clear(false);
        if (fichiers.length) {
            this.envoyer(constatId, fichiers);
        }
    }

    /** Oublie les fichiers en attente : la saisie passe à un autre constat. */
    vider(): void {
        this.enAttente = [];
        this.uploader?.clear(false);
    }

    /** Un seul envoi pour tous les fichiers, donc un seul message s'il échoue. */
    private envoyer(constatId: string, fichiers: File[]): void {
        this.envoi = true;
        const envoi$ = this.source === 'notation'
            ? this.auditService.ajouterPreuvesNotation(constatId, fichiers)
            : this.auditService.ajouterPreuves(constatId, fichiers);
        envoi$.pipe(takeUntil(this.destroy$)).subscribe({
            next: () => {
                this.envoi = false;
                if (this.constatId === constatId) {
                    this.charger();
                }
            },
            error: err => {
                this.envoi = false;
                const quoi = fichiers.length > 1
                    ? `Les ${fichiers.length} fichiers n'ont pas pu être joints.`
                    : `« ${fichiers[0].name} » n'a pas pu être joint.`;
                this.messageService.add({ severity: 'error', summary: 'Preuves non jointes', detail: messageErreur(err, quoi), life: 8000 });
            }
        });
    }

    retirerParIndex(index: number): void {
        const p = this.preuves[index];
        if (p?.id) {
            this.retirer(p);
        }
    }

    telechargerParIndex(index: number): void {
        const p = this.preuves[index];
        if (p?.id) {
            this.telecharger(p);
        }
    }

    retirer(p: PreuveConstat): void {
        const retrait$ = this.source === 'notation'
            ? this.auditService.supprimerPreuveNotation(p.id!)
            : this.auditService.supprimerPreuve(p.id!);
        retrait$.pipe(takeUntil(this.destroy$)).subscribe({
            next: () => this.charger(),
            error: err => this.messageService.add({ severity: 'error', summary: 'Erreur', detail: messageErreur(err, 'Le retrait a échoué.'), life: 8000 })
        });
    }

    telecharger(p: PreuveConstat): void {
        const fichier$ = this.source === 'notation'
            ? this.auditService.telechargerPreuveNotation(p.id!)
            : this.auditService.telechargerPreuve(p.id!);
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