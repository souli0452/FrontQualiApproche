import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subject, takeUntil } from 'rxjs';

import { NgPrimeModule } from '@prime-ng';
import { showToast, StatusEnum } from '../../../../utils/global/global-utils';
import { FileUploadComponent } from '@features/non-conformite/components/file-upload/file-upload.component';
import { SelectInputComponent } from '@shared/ui/select-input/select-input.component';
import { DocumentQms } from '@features/gestion-documentaire/models/document.model';
import { TypeDemande } from '@features/gestion-documentaire/models/demande.model';
import { DemandeDocumentService } from '@features/gestion-documentaire/services/demande.service';
import { QmsDocumentService } from '@features/gestion-documentaire/services/document.service';

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
    imports: [CommonModule, ReactiveFormsModule, NgPrimeModule, FileUploadComponent, SelectInputComponent],
    providers: [MessageService],
    templateUrl: './qms-demande-create.component.html'
})
export class QmsDemandeCreateComponent implements OnInit, OnDestroy {

    formulaire: FormGroup;
    /** Document choisi, pour le rappeler à l'écran sans le rechercher. */
    documentChoisi?: DocumentQms;
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
        protected readonly documentService: QmsDocumentService,
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

    /**
     * Prend note du document retenu.
     *
     * <p>La liste n'est plus chargée d'un bloc — elle ne l'était d'ailleurs qu'à hauteur de dix
     * documents — si bien que l'écran ne peut plus retrouver le choix dans un tableau local. Le
     * document est donc relu à la sélection, une fois, pour l'encart de rappel.</p>
     */
    onDocumentChoisi(id: string | null): void {
        if (!id) {
            this.documentChoisi = undefined;
            return;
        }
        this.documentService.getDocumentById(id).pipe(takeUntil(this.destroy$)).subscribe({
            next: (document) => (this.documentChoisi = document),
            error: () => (this.documentChoisi = undefined)
        });
    }

    /** Vrai quand la demande vise une suppression : l'écran le dit alors franchement. */
    get estUneSuppression(): boolean {
        return this.formulaire.get('type')?.value === 'SUPPRESSION';
    }

    /**
     * Ce que le sélecteur propose, selon ce qui est demandé.
     *
     * <p>Une modification ne porte que sur un document <b>en vigueur</b> — le serveur le refuse en
     * 409 sinon. Proposer les autres revenait à faire saisir une demande entière pour la voir
     * rejetée à l'envoi. Une suppression, elle, vise justement souvent un brouillon abandonné ou un
     * document devenu obsolète : sa liste reste entière.</p>
     */
    get chargeurDeDocuments() {
        return this.estUneSuppression
            ? this.documentService.chargerOptionsDocuments
            : this.documentService.chargerOptionsDocumentsEnVigueur;
    }

    /**
     * Le type de demande vient de changer : un document retenu qui ne convient plus est relâché.
     *
     * <p>Passer de « suppression » à « modification » avec un brouillon déjà choisi laissait dans le
     * formulaire une sélection que la nouvelle liste ne contient pas — l'utilisateur ne l'aurait
     * découvert qu'au refus du serveur.</p>
     */
    onTypeChange(): void {
        if (this.estUneSuppression || !this.documentChoisi) {
            return;
        }
        const enVigueur = this.documentChoisi.esTraiter === true && this.documentChoisi.obsolete !== true;
        if (!enVigueur) {
            this.formulaire.patchValue({ documentId: null });
            this.documentChoisi = undefined;
            this.messageService.add({
                severity: 'info', summary: 'Document à choisir de nouveau',
                detail: "Une modification ne se demande que sur un document en vigueur : choisissez-en un dans la liste.",
                life: 5000
            });
        }
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
