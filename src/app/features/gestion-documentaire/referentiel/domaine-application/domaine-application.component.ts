import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Subject, takeUntil } from 'rxjs';

import { NgPrimeModule } from '@prime-ng';
import { AppCrudGenericComponent } from '@shared';
import { FormGroupColumn, TableColumn } from '../../../../models/generique.model';
import { DomaineApplication } from '../../models';
import { DomaineApplicationService } from '../../services';
import { showToast, StatusEnum } from '../../../../utils/global/global-utils';
import { hasAnyPermission } from '@core/auth';
import { HeaderPage } from '@shared/header-page/header-page';
import { AlertService } from '@shared/alert-message/alert-message.service';
import { BasePaginationComponent } from '../../../../shared/pagination/pagination';

/**
 * Référentiel des domaines d'application des documents (RH, Achats, Production, SI...).
 */
@Component({
    selector: 'app-domaine-application',
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
            [subtitle]="'Ajoutez ou modifiez les domaines d\\'application'"
            [breadcrumbs]="breadcrumbs"
            [buttonText]="'Nouveau domaine'" 
            buttonIcon="pi pi-plus"
            (actionClick)="crudGeneric.openNew()"
        />
        <div class="page-layout">
            <app-crud-generic
                #crudGeneric
                [requireRqPassword]="true"
                [deleteConfirmField]="'libelle'"
                [showAddButton]="false"
                detailLongDescription="Ce référentiel définit les domaines d'application documentaires de votre organisation. Chaque domaine circonscrit le périmètre métier (RH, Achats, Production, SI, etc.) auquel se rattachent vos documents qualité afin d'harmoniser la classification thématique et le suivi du fonds documentaire."
                formLongDescription="Renseignez les informations requises pour configurer un domaine d'application. Définissez un libellé normalisé représentant une fonction ou un secteur clé, ainsi que son rang d'affichage dans les sélecteurs. Les champs avec astérisque sont obligatoires."
                [dialogWidth]="'40rem'"
                [showItemDescriptionOnTop]="false"
                [loading]="loading"
                [pageLabel]="pageLabel"
                [tableCols]="tableCols"
                [listeObject]="dataList"
                [formGroup]="formGroup"
                [formCols]="formCols"
                [detailCols]="detailCols"
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
export class DomaineApplicationComponent extends BasePaginationComponent implements OnInit, OnDestroy {

    closeDialog = false;
    peutEcrire = false;

    readonly pageLabel = "Domaines d'application";
    readonly formHeader = 'Création et mise à jour d\'une domaine';

    formGroup: UntypedFormGroup;
    formCols: FormGroupColumn[];
    tableCols: TableColumn[];
    detailCols: FormGroupColumn[] | undefined;

    private readonly destroy$ = new Subject<boolean>();

    constructor(
        protected fb: UntypedFormBuilder,
        protected messageService: MessageService,
        protected service: DomaineApplicationService,
        private alertService: AlertService
    ) {
        super();

        this.formCols = [
            { field: 'id', label: '', header: 'Id', type: 'string', visible: false, required: false },
            {
                field: 'libelle', label: 'Libellé (ex : Ressources humaines, Achats)', placeholder: 'Libellé (ex : Ressources humaines, Achats)', header: 'Libellé',
                type: 'string', visible: true, required: true
            },
            {
                field: 'description', label: 'Ce que ce domaine recouvre', placeholder: 'Ce que ce domaine recouvre',
                helpText: 'Définissez ici le périmètre opérationnel ou fonctionnel de ce domaine.',
                header: 'Description', type: 'text', visible: true, required: false
            },
            {
                field: 'ordre', label: 'Rang d\'affichage', min: 1, max: 10, helpText: "Détermine l'ordre d'apparition de ce domaine dans les listes déroulantes et filtres de documents. Les numéros les plus bas (ex : 1, 2) apparaissent en premier, facilitant l'accès aux domaines les plus sollicités.",
                header: 'Rang', type: 'knob', visible: true, required: false
            }
        ];

        this.tableCols = [
            { field: 'ordre', header: 'Rang', type: 'number', filter: false, width: '6rem' },
            { field: 'libelle', header: 'Libellé', type: 'string', filter: true },
            { field: 'description', header: 'Description', type: 'string', filter: true }
        ];

        this.detailCols = [
            { field: 'ordre', header: 'Rang' },
            { field: 'libelle', header: 'Domaine' },
            { field: 'description', header: 'Description' }
        ];

        this.formGroup = this.fb.group({
            id: [null],
            libelle: [null, Validators.required],
            ordre: [null],
            description: [null]
        });
    }

    breadcrumbs = [
        { label: 'Tableau de bord', routerLink: '/' },
        { label: 'Gestion Documentaire', routerLink: '/gestion-documentaire' },
        { label: 'Domaines d\'application', routerLink: '' }
    ];

    ngOnInit(): void {
        this.peutEcrire = hasAnyPermission(['domaine-application-write', 'CONFIG_GLOBAL_MANAGE']);
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
                next: (res: any) => {
                    this.applyPagination(res);
                },
                error: (error) => {
                    this.loading = false;
                    this.alertService.showError('Chargement des domaines impossible');
                }
            });
    }

    onSave(objet: DomaineApplication): void {
        const requete = objet.id
            ? this.service.updateObject(objet.id, objet)
            : this.service.create(objet);

        requete.pipe(takeUntil(this.destroy$)).subscribe({
            next: () => this.onSuccess(),
            error: (error) => this.alertService.showError('Enregistrement impossible')
        });
    }

    onDelete(objet: DomaineApplication): void {
        this.service.delete(objet.id!).pipe(takeUntil(this.destroy$)).subscribe({
            next: () => {
                this.alertService.showSuccess('Domaine supprimé avec succès');
                this.fetchObject();
            },
            error: (error) => this.alertService.showError('Suppression impossible')
        });
    }

    private onSuccess(): void {
        this.alertService.showSuccess('Domaine enregistré avec succès');
        this.closeDialog = true;
        this.fetchObject();
    }
}
