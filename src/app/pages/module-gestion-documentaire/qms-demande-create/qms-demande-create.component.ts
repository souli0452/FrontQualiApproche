import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subject, takeUntil } from 'rxjs';

import { NgPrimeModule } from '../../../../prime-ng.module';
import { FileUploadComponent } from '../../../components/non-conformite/file-upload/file-upload.component';
import { DocumentQms } from '../../../models/gestion-documentaire.model';
import { TypeDemande } from '../../../models/demande-document.model';
import { DemandeDocumentService } from '../../../services/module-gestion-documentaire/demande-document.service';
import { QmsDocumentService } from '../../../services/module-gestion-documentaire/qms-document.service';
import { showToast, StatusEnum } from '../../../utils/global/global-utils';

/**
 * Dépôt d'une demande de modification ou de suppression de document.
 *
 * <p>Écran bâti comme la création d'un document et la déclaration d'une non-conformité : la saisie
 * aux deux tiers, le dépôt de pièce et les conseils au tiers, un guide complet à portée de clic.
 * Ce n'était pas qu'une affaire d'aspect — une demande se rédige, elle ne se remplit pas : c'est
 * l'objectif et la description que lira le responsable qualité, et l'écran doit aider à les
 * écrire.</p>
 */
@Component({
    selector: 'app-qms-demande-create',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, NgPrimeModule, FileUploadComponent],
    providers: [MessageService],
    templateUrl: './qms-demande-create.component.html'
})
export class QmsDemandeCreateComponent implements OnInit, OnDestroy {

    formulaire: FormGroup;
    documents: DocumentQms[] = [];
    pieceJointe?: File;

    loading = false;
    guideOuvert = false;

    private readonly destroy$ = new Subject<void>();

    readonly typesDemande = [
        { label: 'Modification du document', value: 'MODIFICATION' as TypeDemande },
        { label: 'Suppression du document', value: 'SUPPRESSION' as TypeDemande }
    ];

    constructor(
        private readonly fb: FormBuilder,
        private readonly router: Router,
        private readonly route: ActivatedRoute,
        private readonly demandeService: DemandeDocumentService,
        private readonly documentService: QmsDocumentService,
        private readonly messageService: MessageService
    ) {
        this.formulaire = this.fb.group({
            documentId: [null, Validators.required],
            type: ['MODIFICATION', Validators.required],
            objectif: [null, [Validators.required, Validators.minLength(5)]],
            description: [null]
        });
    }

    ngOnInit(): void {
        this.chargerDocuments();

        // Une demande se dépose souvent depuis la fiche du document : l'y pré-remplir évite de le
        // rechercher dans une liste où il figure déjà.
        const documentId = this.route.snapshot.queryParamMap.get('documentId');
        if (documentId) {
            this.formulaire.patchValue({ documentId });
        }
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    private chargerDocuments(): void {
        this.documentService.searchDocuments({}).pipe(takeUntil(this.destroy$)).subscribe({
            next: (documents) => (this.documents = documents ?? []),
            error: () => console.warn('Liste des documents indisponible.')
        });
    }

    /** Vrai quand la demande vise une suppression : l'écran le dit alors franchement. */
    get estUneSuppression(): boolean {
        return this.formulaire.get('type')?.value === 'SUPPRESSION';
    }

    /** Document choisi, pour le rappeler à l'écran sans le rechercher. */
    get documentChoisi(): DocumentQms | undefined {
        const id = this.formulaire.get('documentId')?.value;
        return this.documents.find(document => document.id === id);
    }

    handleFileUpload(fichiers: any[]): void {
        this.pieceJointe = fichiers?.length ? fichiers[0].file : undefined;
    }

    retour(): void {
        this.router.navigate(['/gestion-documentaire/demandes']);
    }

    soumettre(): void {
        if (this.formulaire.invalid) {
            this.formulaire.markAllAsTouched();
            this.messageService.add({
                severity: 'warn', summary: 'Demande incomplète',
                detail: 'Le document concerné et l’objectif sont nécessaires à son instruction.'
            });
            return;
        }

        const valeur = this.formulaire.getRawValue();
        this.loading = true;
        this.demandeService.creer(valeur.documentId, valeur.type, valeur.objectif,
                valeur.description, this.pieceJointe)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: () => {
                    this.loading = false;
                    this.messageService.add({
                        severity: 'success', summary: 'Demande déposée',
                        detail: 'Elle suit désormais son circuit d’instruction.'
                    });
                    setTimeout(() => this.retour(), 1200);
                },
                error: (err) => {
                    this.loading = false;
                    showToast(StatusEnum.error, err.status, 'Dépôt impossible', this.messageService, err);
                }
            });
    }
}
