import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ApiItemResponse } from '../../../../models/response.model';
import { FormGroupColumn, TableColumn } from '../../../../models/generique.model';
import { HeaderPage } from '@shared/header-page/header-page';
import { AlertService } from '@shared/alert-message/alert-message.service';
import { BasePaginationComponent } from '@shared/pagination/pagination';
import { OrigineNonConformite } from '@features/non-conformite/models/referentiel.model';
import { OrigineNonConformiteService } from '@features/non-conformite/services/type-non-conformite.service';
import { AppCrudGenericComponent } from '@shared/app-crud-generic/app-crud-generic.component';

@Component({
    selector: 'app-origine-non-conformite',
    standalone: true,
    imports: [
        CommonModule, 
        AppCrudGenericComponent,
        HeaderPage
    ],
    template: `
        <app-header-page 
            title="Origine de la non-conformité" 
            subtitle="Ajoutez ou modifiez les différentes Origines/Sources de non-conformité."
            [breadcrumbs]="breadcrumbs"
            [buttonText]="'Nouvelle source de non-conformité'" 
            buttonIcon="pi pi-plus"
            (actionClick)="crudGeneric.openNew()"
        />
        <div class="page-layout">
            <div class="card-first overflow-hidden border-none premium-hub transition-colors duration-300">
                <app-crud-generic
                    #crudGeneric
                    [requireRqPassword]="true"
                    [showAddButton]="false"
                    [dialogWidth]="'40rem'"
                    [formLongDescription]="'Remplissez ce formulaire pour créer ou modifier une source/origine de non conformité. Les champs marqués d\\'un astérisque sont obligatoires.'"
                    [detailLongDescription]="'Consultez ci-dessous l\\'ensemble des informations relatives à cette source/origine de non conformité. Les sources/origines sont essentielles pour structurer l\\'approche qualité de votre organisation en regroupant logiquement vos non conformités. Vous y retrouverez le libellé exact de la source/origine.'"
                    [loading]="loading"
                    [pageLabel]="pageLabel"
                    [tableCols]="tableCols"
                    [listeObject]="dataList"
                    [formGroup]="formGroup"
                    [formCols]="formCols"
                    [isAffich]="false"
                    [closeDialog]="closeDialog"
                    [formHeader]="formHeader"
                    (newItemEvent)="onSave($event)"
                    [totalElements]="totalElements"
                    [isPagination]="true"
                    [currentPage]="currentPage"
                    [pageSize]="pageSize"
                    (pageChangeEvent)="onPageChange($event)"
                    (removeEvent)="onDelete($event)">
                </app-crud-generic>
            </div>
        </div>
    `
})
export class OrigineNonConformiteComponent extends BasePaginationComponent {
    destroy$: Subject<boolean> = new Subject<boolean>();

    closeDialog = false;
    formGroup: UntypedFormGroup;
    tableCols: TableColumn[];
    formCols: FormGroupColumn[];
    pageLabel = 'Origine de Non-Conformité';
    formHeader = 'Création et mise à jour d\'une origine/source de non conformité';

    constructor(
        protected fb: UntypedFormBuilder,
        protected messageService: MessageService,
        protected typeNonConformiteService: OrigineNonConformiteService,
        private alertService: AlertService
    ) {
        super();

        this.formCols = [
            { field: 'id', label: "", header: 'Id', type: 'number', visible: false, required: false },
            { field: 'libelle', label: "Libellé de l'origine/source de non conformité", helpText: "Libellé de l'origine/source de non conformité (ex: Fournisseur, Externe, Interne ...)", header: 'Libellé', type: 'string', visible: true, required: true },
            { field: 'description', label: "Description de l'origine/source de non conformité", helpText: 'Description de l\'origine/source de non conformité', header: 'Description', type: 'text', visible: true, required: false }
        ];

        this.tableCols = [
            { field: 'libelle', header: 'Libellé', type: 'string', filter: true },
            { field: 'description', header: 'Description', type: 'string', filter: true }
        ];

        this.formGroup = this.fb.group({
            id: [null],
            libelle: [null, Validators.required],
            description: [null]
        });
    }

    ngOnInit(): void {
        this.fetchObject();
    }

    breadcrumbs = [
        { label: 'Tableau de bord', routerLink: '/' },
        { label: 'Sources de non-conformité', routerLink: '/origine-non-conformite' }
    ];

    fetchObject() {
        this.loading = true;
        this.typeNonConformiteService.findAll(this.currentPage, this.pageSize)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (res: any) => {
                    this.applyPagination(res);
                },
                error: (error: any) => {
                    this.loading = false;
                    this.alertService.showError(error.error?.message);
                }
            });
    }

    onSuccess(res: ApiItemResponse<any>) {
        this.closeDialog = true;
        this.fetchObject();
        this.alertService.showSuccess(res.message);
    }

    onSave(object: OrigineNonConformite) {
        const request = object.id != null
            ? this.typeNonConformiteService.update(object)
            : this.typeNonConformiteService.create(object);

        request.pipe(takeUntil(this.destroy$)).subscribe({
            next: (res) => {
                this.onSuccess(res);
            },
            error: (error) => {
                this.alertService.showError(error.error?.message);
            }
        });
    }

    onDelete(produit: OrigineNonConformite) {
        this.typeNonConformiteService.delete(produit.id).pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (res) => {
                    this.fetchObject();
                    this.onSuccess(res);
                },
                error: (error) => {
                    this.alertService.showError(error.error?.message);
                }
            });
    }

    ngOnDestroy(): void {
        this.destroy$.next(true);
        this.destroy$.unsubscribe();
    }
}

// Export d'alias pour la rétrocompatibilité
export { OrigineNonConformiteComponent as SourceNonConformite };
