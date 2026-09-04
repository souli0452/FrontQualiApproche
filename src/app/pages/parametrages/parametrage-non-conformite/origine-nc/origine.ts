import { CommonModule } from '@angular/common';
import { Component, ViewChild } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { AppCrudGenericComponent } from '../../../../components/app-crud-generic/app-crud-generic.component';
import { showToast, StatusEnum } from '../../../../utils/global/global-utils';
import { ApiItemResponse } from '../../../../models/response.model';
import { FormGroupColumn, TableColumn } from '../../../../models/generique.model';
import { OrigineNonConformite } from '../../../../models/non-conformite.model';
import { OrigineNonConformiteService } from '../../../../services/non-conformite/type-non-conformite.service';
import { HeaderPage } from '../../../../shared/header-page/header-page';
import { AlertService } from '../../../../shared/alert-message/alert-message.service';

@Component({
    selector: 'app-type-non-conformite',
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
export class SourceNonConformite {
    loading: boolean = true;
    destroy$: Subject<boolean> = new Subject<boolean>();
    dataList: OrigineNonConformite[] = [];
    totalElements: number = 0;
    currentPage: number = 0;
    pageSize: number = 10;
    totalPages: number = 0;


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
          this.formCols = [
            {field: 'id', label: "", header: 'Id', type: 'number', visible: false, required: false},
            {field: 'libelle', label: "Libellé de l'origine/source de non conformité", helpText: "Libellé de l'origine/source de non conformité (ex: Fournisseur, Externe, Interne ...)", header: 'Libellé', type: 'string', visible: true, required: true},
            {field: 'description', label: "Description de l'origine/source de non conformité", helpText: 'Description de l\'origine/source de non conformité', header: 'Description', type: 'text', visible: true, required: false}
          ];

          this.tableCols = [
            {field: 'libelle', header: 'Libellé', type: 'string', filter: true},
            {field: 'description', header: 'Description', type: 'string', filter: true}
          ];

          this.formGroup = this.fb.group({
              id: [null],
              libelle: [null, Validators.required],
              description: [null],
            //  audites: [null, Validators.required]

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
        console.log(`[DEBUG-PAGINATION] Envoi de la requête au backend avec page=${this.currentPage}, size=${this.pageSize}`);
        
        this.typeNonConformiteService.findAll(this.currentPage, this.pageSize)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
            next: (res: any) => {
                console.log(`[DEBUG-PAGINATION] Réponse reçue du backend:`, res);
                setTimeout(() => {
                    this.dataList = res.data?.content || [];
                    this.totalElements = res.data?.totalElements || 0;
                    this.totalPages = res.data?.totalPages || 0;
                    console.log(`[DEBUG-PAGINATION] Après mise à jour du composant: dataList.length=${this.dataList.length}, totalElements=${this.totalElements}`);
                    this.loading = false;
                }, 500);
            },
            error: (error: any) => {
                console.log(`[DEBUG-PAGINATION] Erreur de l'API:`, error);
                this.loading = false;
                this.alertService.showError(error.error?.message);
            }
        });
    }

    onPageChange(event: { page: number, size: number }) {
        this.currentPage = event.page;   // ✅ mettre à jour la page
        this.pageSize = event.size;      // ✅ mettre à jour la taille

        this.fetchObject();              // ✅ ensuite appeler
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
                        this.onSuccess(res);                  },
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
