import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { showToast, StatusEnum } from '../../../../utils/global/global-utils';
import { DropdownSelector, FormGroupColumn, TableColumn } from '../../../../models/generique.model';
import { NgPrimeModule } from '@prime-ng';
import { NgxPermissionsModule, NgxPermissionsService } from 'ngx-permissions';
import { HeaderPage } from '@shared/header-page/header-page';
import { BasePaginationComponent } from '../../../../shared/pagination/pagination';
import { QmsDocumentType } from '@features/gestion-documentaire/models/referentiel.model';
import { AppCrudGenericComponent } from '@shared/app-crud-generic/app-crud-generic.component';
import { QmsDocumentService } from '@features/gestion-documentaire/services/document.service';

/**
 * Référentiel des Types de Documents Qualité (Procédure, Manuel, Enregistrement, Instruction...).
 */
@Component({
    selector: 'app-type-document',
    standalone: true,
    imports: [
        CommonModule, 
        AppCrudGenericComponent, 
        HeaderPage,
        NgPrimeModule, 
        NgxPermissionsModule
    ],
    providers: [],
    template: `
        <app-header-page 
            [title]="pageLabel" 
            [subtitle]="'Ajoutez ou modifiez les types de documents'"
            [breadcrumbs]="breadcrumbs"
            [buttonText]="'Nouveau type de document'" 
            buttonIcon="pi pi-plus"
            (actionClick)="crudGeneric.openNew()"
        />
        <div class="page-layout">
            <app-crud-generic #crudGeneric
                [requireRqPassword]="true"
                [deleteConfirmField]="'code'"
                [showAddButton]="false"
                [dialogWidth]="'40rem'"
                [loading]="loading"
                [pageLabel]="pageLabel"
                [formLongDescription]="'Remplissez ce formulaire pour configurer un type de document qualité. Définissez un code normalisé unique (ex: PRO, INS, ENR) ainsi que le dossier de classement dans la GED. Les champs avec astérisque sont obligatoires.'"
                [detailLongDescription]="'Consultez les spécifications de ce type de document. Les types structurent la pyramide documentaire du SMQ, harmonisent la codification et assurent le classement automatique des fichiers dans la GED.'"
                [tableCols]="tableCols"
                [listeObject]="dataList"
                [formGroup]="formGroup"
                [formCols]="formCols"
                [dropdownList]="dropdownList"
                [isAffich]="true"
                [closeDialog]="closeDialog"
                [formHeader]="formHeader"
                (newItemEvent)="onSave($event)"
                (removeEvent)="onDelete($event)"
                [totalElements]="totalElements"
                [isPagination]="true"
                [currentPage]="currentPage"
                [pageSize]="pageSize"
                (pageChangeEvent)="onPageChange($event)"
                [consultation]="!hasWritePermission()"
                [notModif]="!hasWritePermission()"
                [notDelete]="!hasDeletePermission()"
                >
            </app-crud-generic>
        </div>
    `
})
export class TypeDocumentComponent extends BasePaginationComponent {
    destroy$: Subject<boolean> = new Subject<boolean>();

    closeDialog = false;
    formGroup: UntypedFormGroup;
    dropdownList: DropdownSelector[] = [];
    tableCols: TableColumn[];
    formCols: FormGroupColumn[];
    pageLabel = 'Configuration des Types de Document';
    formHeader = 'Création et mise à jour d\'un type de document';

    constructor(
        protected fb: UntypedFormBuilder,
        protected messageService: MessageService,
        protected qmsService: QmsDocumentService,
    ) {
        super();

        this.formCols = [
            { field: 'id', label: "", header: 'Id', type: 'string', visible: false, required: false },
            { field: 'code', label: "Code du type (ex: PRO, INS, ENR)", placeholder: "Code du type (ex: PRO, INS, ENR)", header: 'Code', type: 'string', visible: true, required: true },
            { field: 'libelle', label: "Libellé (ex: Procédure, Instruction)", placeholder: "Libellé (ex: Procédure, Instruction)", header: 'Libellé', type: 'string', visible: true, required: true },
            { field: 'folderName', label: "Nom du dossier dans le stockage GED", placeholder: "Nom du dossier", header: 'Dossier Stockage', type: 'string', visible: true, required: true }
        ];

        this.tableCols = [
            { field: 'code', header: 'Code', type: 'string', filter: true },
            { field: 'libelle', header: 'Libellé', type: 'string', filter: true },
            { field: 'folderName', header: 'Dossier GED', type: 'string', filter: true },
            { field: 'createdAt', header: 'Date de création', type: 'string', filter: true }
        ];

        this.formGroup = this.fb.group({
            id: [null],
            code: [null, Validators.required],
            libelle: [null, Validators.required],
            folderName: [null, Validators.required]
        });
    }

    breadcrumbs = [
        { label: 'Tableau de bord', routerLink: '/' },
        { label: 'Gestion Documentaire', routerLink: '/gestion-documentaire' },
        { label: 'Types de documents', routerLink: '' }
    ];

    hasWritePermission(): boolean {
        return true;
    }

    hasDeletePermission(): boolean {
        return true;
    }

    ngOnInit(): void {
        this.fetchObject();
    }

    fetchObject() {
        this.loading = true;
        this.qmsService.typeDocumentQmsGetAll(this.currentPage, this.pageSize).pipe(takeUntil(this.destroy$))
            .subscribe({
                next: res => {
                    this.applyPagination(res);
                },
                error: error => {
                    this.loading = false;
                    showToast(StatusEnum.error, error.status, null, this.messageService, error);
                }
            });
    }

    onSuccess(res: any) {
        this.closeDialog = true;
        this.fetchObject();
        this.messageService.add({ severity: 'success', summary: 'Succès', detail: 'Opération réussie' });
    }

    onSave(object: QmsDocumentType) {
        if (object.id != null) {
            this.qmsService.typeDocumentQmsUpdate(object.id, object).pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: res => {
                        this.onSuccess(res);
                    }, error: error => {
                        showToast(StatusEnum.error, error.status, null, this.messageService, error);
                    }
                });
        } else {
            this.qmsService.typeDocumentQmsCreate(object).pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: res => {
                        this.onSuccess(res);
                    }, error: error => {
                        showToast(StatusEnum.error, error.status, null, this.messageService, error);
                    }
                });
        }
    }

    onDelete(type: QmsDocumentType) {
        this.qmsService.typeDocumentQmsDelete(type.id!).pipe(takeUntil(this.destroy$))
            .subscribe({
                next: res => {
                    this.onSuccess(res);
                }, error: error => {
                    showToast(StatusEnum.error, error.status, null, this.messageService, error);
                }
            });
    }

    ngOnDestroy(): void {
        this.destroy$.next(true);
        this.destroy$.unsubscribe();
    }
}

// Alias pour compatibilité descendante
export { TypeDocumentComponent as QmsDocumentTypeComponent };
