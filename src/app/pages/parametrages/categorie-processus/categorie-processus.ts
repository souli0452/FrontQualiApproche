import { CommonModule } from '@angular/common';
import { Component, ViewChild } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { AppCrudGenericComponent } from '../../../components/app-crud-generic/app-crud-generic.component';
import { showToast, StatusEnum } from '../../../utils/global/global-utils';
import { ApiItemResponse } from '../../../models/response.model';
import { FormGroupColumn, TableColumn } from '../../../models/generique.model';
import { CategorieProcessus } from '../../../models/categore-processus.model';
import { CategorieProcessusService } from '../../../services/non-conformite/type-processus.service';
import { HeaderPage } from '../../../shared/header-page/header-page';
import { AlertService } from '../../../shared/alert-message/alert-message.service';

@Component({
    selector: 'app-type-processus',
    standalone: true,
    imports: [
        CommonModule, 
        AppCrudGenericComponent,
        HeaderPage
    ],
    template: `
        <app-header-page 
            title="Catégorie de processus" 
            subtitle="Ajoutez ou modifiez les différentes catégories de processus."
            [breadcrumbs]="breadcrumbs"
            [buttonText]="'Nouvelle catégorie de processus'" 
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
                [formLongDescription]="'Remplissez ce formulaire pour créer ou modifier une catégorie de processus. Les champs marqués d\\'un astérisque sont obligatoires.'"
                [detailLongDescription]="'Consultez ci-dessous l\\'ensemble des informations relatives à cette catégorie de processus. Les catégories sont essentielles pour structurer l\\'approche qualité de votre organisation en regroupant logiquement vos activités. Vous y retrouverez le libellé exact de la catégorie ainsi que la description détaillée de son rôle au sein de votre système de management intégré.'"
                [detailImagePath]="'assets/logo-quali-sira.svg'"
                [showItemDescriptionOnTop]="false"
                [loading]="loading"
                [pageLabel]="pageLabel"
                [tableCols]="tableCols"
                [detailCols]="detailCols"
                [listeObject]="dataList"
                [formGroup]="formGroup"
                [formCols]="formCols"
                [isAffich]="true"
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
export class CategorieProcessusComponent {
    loading: boolean = true;
      destroy$: Subject<boolean> = new Subject<boolean>();
      dataList: CategorieProcessus[] = [];
      totalElements: number = 0;
      currentPage: number = 0;
      pageSize: number = 10;
      totalPages: number = 0;

      closeDialog = false;
      formGroup: UntypedFormGroup;
      tableCols: TableColumn[];
      formCols: FormGroupColumn[];
      detailCols: FormGroupColumn[] | undefined;
      pageLabel = 'Catégorie de processus';
      formHeader = 'Création et mise à jour d\'une catégorie de processus';

      constructor(
        protected fb: UntypedFormBuilder,
        protected messageService: MessageService,
        protected categorieProcessusService: CategorieProcessusService,
        private alertService: AlertService
      ) {

          this.formCols = [
              {field: 'id', label: "", header: 'Id', type: 'number', visible: false, required: false},
              {field: 'libelle', label: "Libellé de la catégorie de processus (Réalisation - Support)", placeholder: "Exemple : Réalisation", helpText: "Libellé de la catégorie de processus (Réalisation - Support)", header: 'Libellé', type: 'string', visible: true, required: true},
              {field: 'description', label: "Description de la catégorie de processus", placeholder: "Exemple : Catégorie de processus de réalisation", helpText: 'Description de la catégorie de processus', header: 'Description', type: 'text', visible: true, required: false}
          ];

          this.tableCols = [
              {field: 'libelle', header: 'Libellé', type: 'string', filter: true},
              {field: 'description', header: 'Description', type: 'string', filter: true},
          ];

          this.detailCols = [
            { field: 'libelle', header: 'Catégorie' },
            { field: 'description', header: 'Description', type: 'text' }
        ];

          this.formGroup = this.fb.group({
              id: [null],
              libelle: [null, Validators.required],
              description: [null],
            //  audites: [null, Validators.required]

          });
      }

    breadcrumbs = [
        { label: 'Tableau de bord', routerLink: '/' },
        { label: 'Processus', routerLink: '/parametrage-organigramme/processus' },
        { label: 'Catégories de processus', routerLink: '/parametrage-organigramme/categorie-processus' }
    ];

      ngOnInit(): void {
          this.fetchObject();
      }


    fetchObject() {
    this.loading = true;
    this.categorieProcessusService.findAll(this.currentPage, this.pageSize)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
            next: (res: any) => {
                setTimeout(() => {
                    this.dataList = res.data.content || [];
                    this.totalElements = res.data.totalElements;
                    this.currentPage = res.data.pageNumber || 0;
                    this.pageSize = res.data.pageSize;
                    this.totalPages = res.data.totalPages;
                    this.loading = false;
                }, 300);
            },
            error: (error: any) => {
                this.loading = false;
                this.alertService.showError('Chargement des catégories de processus impossible');
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

    onSave(object: CategorieProcessus) {
        const request = object.id != null
            ? this.categorieProcessusService.update(object)
            : this.categorieProcessusService.create(object);

        request.pipe(takeUntil(this.destroy$)).subscribe({
            next: (res) => {
                this.onSuccess(res);
            },
            error: (error) => {
                this.alertService.showError(error.error?.message); 
            }
        });
    }

    onDelete(processus: CategorieProcessus) {
    this.categorieProcessusService.delete(processus.id).pipe(takeUntil(this.destroy$))
        .subscribe({
            next: res => {
                this.onSuccess(res);
            }, error: error => {
                this.alertService.showError(error.error?.message); 
            }
        });
    }

      ngOnDestroy(): void {
          this.destroy$.next(true);
          this.destroy$.unsubscribe();
      }

}
