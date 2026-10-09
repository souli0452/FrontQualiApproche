import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Subject, takeUntil } from 'rxjs';

import { NgPrimeModule } from '@prime-ng';
import { FormGroupColumn, TableColumn } from '../../../../models/generique.model';
import { HeaderPage } from '@shared/header-page/header-page';
import { AlertService } from '@shared/alert-message/alert-message.service';
import { BasePaginationComponent } from '../../../../shared/pagination/pagination';
import { hasAnyPermission } from '@core/auth/auth-utils';
import { PrioriteDocument } from '@features/gestion-documentaire/models/referentiel.model';
import { AppCrudGenericComponent } from '@shared/app-crud-generic/app-crud-generic.component';
import { PrioriteDocumentService } from '@features/gestion-documentaire/services/referentiel.service';

/**
 * Référentiel des priorités de document (Urgent, Normal, Faible...).
 */
@Component({
    selector: 'app-priorite-document',
    standalone: true,
    imports: [
        HeaderPage,
        CommonModule, 
        AppCrudGenericComponent, 
        NgPrimeModule
    ],
    providers: [],
    template: `
        <app-header-page 
            [title]="pageLabel" 
            [subtitle]="'Ajoutez ou modifiez les priorités des documents'"
            [breadcrumbs]="breadcrumbs"
            [buttonText]="'Nouvelle Priorité'" 
            buttonIcon="pi pi-plus"
            (actionClick)="crudGeneric.openNew()"
        />
        <div class="page-layout">
            <app-crud-generic
                #crudGeneric
                [requireRqPassword]="true"
                [deleteConfirmField]="'libelle'"
                [showAddButton]="false"
                detailLongDescription="Ce référentiel définit les niveaux de priorité applicables aux documents du SMQ. Ils permettent de hiérarchiser les flux de relecture et d'approbation dans les circuits de validation, d'attribuer des codes couleurs d'alerte et de sensibiliser les acteurs sur les délais de traitement attendus."
                formLongDescription="Renseignez les critères de cette priorité documentaire. Définissez le libellé, le rang d'affichage (1 pour le plus urgent) ainsi qu'une couleur d'identification au format hexadécimal (ex: #dc2626 pour le rouge). Les champs marqués d'un astérisque sont obligatoires."
                [dialogWidth]="'40rem'"
                [loading]="loading"
                [pageLabel]="pageLabel"
                [tableCols]="tableCols"
                [listeObject]="dataList"
                [formGroup]="formGroup"
                [formCols]="formCols"
                [isAffich]="true"
                [closeDialog]="closeDialog"
                [formHeader]="formHeader"
                (newItemEvent)="onSave($event)"
                (removeEvent)="onDelete($event)"
                [isPagination]="true"
                [totalElements]="totalElements"
                [currentPage]="currentPage"
                [pageSize]="pageSize"
                (pageChangeEvent)="onPageChange($event)"
                [consultation]="!peutEcrire"
                [notModif]="!peutEcrire"
                [notDelete]="!peutEcrire">
            </app-crud-generic>
        </div>
    `
})
export class PrioriteDocumentComponent extends BasePaginationComponent implements OnInit, OnDestroy {

    closeDialog = false;
    peutEcrire = false;

    readonly pageLabel = 'Priorités de document';
    readonly formHeader = 'Création et mise à jour d\'une priorité';

    formGroup: UntypedFormGroup;
    formCols: FormGroupColumn[];
    tableCols: TableColumn[];

    private readonly destroy$ = new Subject<boolean>();

    constructor(
        protected fb: UntypedFormBuilder,
        protected messageService: MessageService,
        protected service: PrioriteDocumentService,
        private alertService: AlertService
    ) {
        super();

        this.formCols = [
            { field: 'id', label: '', header: 'Id', type: 'string', visible: false, required: false },
            {
                field: 'libelle', label: 'Libellé de la priorité (ex : Urgent, Normal, Faible)', 
                helpText: 'Libellé de la priorité (ex : Urgent, Normal, Faible)', 
                placeholder: 'Exemple : Urgent', header: 'Libellé',
                type: 'string', visible: true, required: true
            },
            {
                field: 'description', label: 'Signification et délai cible pour vos équipes',
                helpText: 'Signification et délai cible pour vos équipes',
                placeholder: 'Exemple : Traitement impératif sous 48h ouvrées', 
                header: 'Description', type: 'text', visible: true, required: false
            },
            {
                field: 'couleur', label: 'Couleur d\'identification', 
                header: 'Couleur',
                helpText: "Choisissez une couleur distinctive. Elle servira de badge visuel pour identifier immédiatement le degré d'urgence du document dans les listes et circuits de validation.", 
                type: 'color', visible: true, required: false, class: 'md:col-6'
            },
            {
                field: 'score', label: 'Rang d\'affichage (1 pour le plus urgent)', 
                helpText: "Ce nombre détermine la position de la priorité dans les menus déroulants et les classements. Le rang 1 est toujours traité en priorité.",
                placeholder: '1', header: 'Rang', 
                type: 'knob', min: 1, max: 4, visible: true, required: false, class: 'md:col-6'
            }
        ];

        this.tableCols = [
            { field: 'score', header: 'Rang', type: 'number', filter: false, width: '5rem' },
            { field: 'libelle', header: 'Libellé', type: 'string', filter: true },
            { 
                field: 'score', 
                header: 'Couleur', 
                type: 'meter', 
                colorField: 'couleur', 
                max: 4, 
                showValue: false, 
                filter: false, 
                width: '8rem' 
            },
            { field: 'description', header: 'Description', type: 'string', filter: true }
        ];

        this.formGroup = this.fb.group({
            id: [null],
            libelle: [null, Validators.required],
            score: [1],
            couleur: ['#3b82f6'],
            description: [null]
        });
    }

    breadcrumbs = [
        { label: 'Tableau de bord', routerLink: '/' },
        { label: 'Gestion Documentaire', routerLink: '/gestion-documentaire' },
        { label: 'Priorités de document', routerLink: '' }
    ];

    ngOnInit(): void {
        this.peutEcrire = hasAnyPermission(['priorite-document-write', 'CONFIG_GLOBAL_MANAGE']);
        this.fetchObject();
    }

    ngOnDestroy(): void {
        this.destroy$.next(true);
        this.destroy$.complete();
    }

    fetchObject(): void {
        this.loading = true;
        this.service.findAll(this.currentPage, this.pageSize)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (priorites) => {
                    this.applyPagination(priorites);
                },
                error: (error) => {
                    this.loading = false;
                    this.alertService.showError('Chargement des priorités impossible');
                }
            });
    }

    onSave(objet: PrioriteDocument): void {
        const requete = objet.id
            ? this.service.updateObject(objet.id, objet)
            : this.service.create(objet);

        requete.pipe(takeUntil(this.destroy$)).subscribe({
            next: () => this.onSuccess(),
            error: (error) => 
                this.alertService.showError('Enregistrement impossible')
        });
    }

    onDelete(objet: PrioriteDocument): void {
        this.service.delete(objet.id!).pipe(takeUntil(this.destroy$)).subscribe({
            next: () => {
                this.alertService.showSuccess('Priorité supprimée. Les documents qui la portaient n\'en affichent plus.');
                this.fetchObject();
            },
            error: (error) => this.alertService.showError('Suppression impossible')
        });
    }

    private onSuccess(): void {
        this.closeDialog = true;
        this.fetchObject();
        this.alertService.showSuccess('Opération réussie');
    }
}
