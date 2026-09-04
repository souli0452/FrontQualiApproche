import { CommonModule } from '@angular/common';
import { Component, ViewChild } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { AppCrudGenericComponent } from '../../../../components/app-crud-generic/app-crud-generic.component';
import { showToast, StatusEnum } from '../../../../utils/global/global-utils';
import { NiveauNonConformiteService } from '../../../../services/non-conformite/niveau-non-conformite.service';
import { ApiItemResponse } from '../../../../models/response.model';
import { FormGroupColumn, TableColumn } from '../../../../models/generique.model';
import { NiveauNonConformite } from '../../../../models/non-conformite.model';
import { HeaderPage } from '../../../../shared/header-page/header-page';
import { AlertService } from '../../../../shared/alert-message/alert-message.service';

@Component({
    selector: 'app-niveau-non-conformite',
    standalone: true,
    imports: [
        CommonModule, 
        AppCrudGenericComponent,
        HeaderPage
    ],
    template: `
        <app-header-page 
            title="Niveau de gravité de la non-conformité" 
            subtitle="Ajoutez ou modifiez les différents Niveaux de non-conformité."
            [breadcrumbs]="breadcrumbs"
            [buttonText]="'Ajouter un niveau de gravité'" 
            buttonIcon="pi pi-plus"
            (actionClick)="crudGeneric.openNew()"
        />
            <div class="page-layout">
            <div class="card-first overflow-hidden border-none premium-hub transition-colors duration-300">
            <app-crud-generic
                #crudGeneric
                [requireRqPassword]="true"
                [deleteConfirmField]="'libelle'"
                [detailCols]="detailCols"
                [showAddButton]="false"
                [dialogWidth]="'40rem'"
                [formLongDescription]="'Remplissez ce formulaire pour créer ou modifier un niveau de non conformité. Les champs marqués d\\'un astérisque sont obligatoires.'"
                [detailLongDescription]="'Consultez ci-dessous l\\'ensemble des informations relatives à ce niveau de non conformité. Les niveaux de non conformités sont essentiels pour structurer l\\'approche qualité de votre organisation en regroupant logiquement vos non conformités. Vous y retrouverez le libellé exact du niveau.'"
                [loading]="loading"
                [showItemDescriptionOnTop]="false"
                [pageLabel]="pageLabel"
                [tableCols]="tableCols"
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
export class NiveauNonConformiteComponent {
    loading: boolean = true;
    destroy$: Subject<boolean> = new Subject<boolean>();
    dataList: NiveauNonConformite[] = [];
    totalElements: number = 0;
    currentPage: number = 0;
    pageSize: number = 10;
    totalPages: number = 0;

    closeDialog = false;
    formGroup: UntypedFormGroup;
    tableCols: TableColumn[];
    formCols: FormGroupColumn[];
    detailCols: FormGroupColumn[] | undefined;
    pageLabel = 'Niveau de Non-Conformité';
    formHeader = 'Création et mise à jour d\'un niveau de non conformité';

    constructor(
        protected fb: UntypedFormBuilder,
        protected messageService: MessageService,
        protected niveauNonConformiteService: NiveauNonConformiteService,
        private alertService: AlertService
    ) {
          
        this.formCols = [
            {field: 'id', label: "", header: 'Id', type: 'number', visible: false, required: false},
            {field: 'libelle', label: "Libellé du niveau de non conformité (Mineur - Majeur)", placeholder: "Nommez ce niveau de gravité", helpText: "Libellé du niveau de non conformité (Mineur - Majeur)", header: 'Libellé', type: 'string', visible: true, required: true},
            {field: 'description', label: "Description du niveau de non conformité", placeholder: "Décrivez ce niveau de criticité", helpText: "Description du niveau de non conformité", header: 'Description', type: 'text', visible: true, required: false},
            {field: 'couleur', label: "Couleur", helpText: "Choisissez une couleur pour ce niveau. La couleur definira le niveau de gravité selon votre mode de fonctionnement.", header: 'Couleur', type: 'color', visible: true, required: false, class: 'md:col-6'},
            {field: 'score', label: "Score", min: 1, max: 4, helpText: "Définissez un score de gravité (1-4)", header: 'Score', type: 'knob', visible: true, required: false, class: 'md:col-6'},
        ];

        this.tableCols = [
            { field: 'score', header: 'Score', type: 'number', filter: false, width: '5rem' },
            { field: 'libelle', header: 'Libellé', type: 'string', filter: true },
            { 
                field: 'score', 
                header: 'Couleur', 
                type: 'meter', 
                colorField: 'couleur', 
                max: 4, 
                showValue: true, 
                filter: false, 
                width: '8rem' 
            },
            { field: 'description', header: 'Description', type: 'string', filter: true }
        ];

        this.detailCols = [
            { field: 'score', header: 'Rang / Score' },
            { field: 'libelle', header: 'Libellé' },
            { field: 'couleur', header: 'Couleur' },
            { field: 'description', header: 'Description' }
        ];

        this.formGroup = this.fb.group({
            id: [null],
            libelle: [null, Validators.required],
            couleur: ['#ff0000'],
            score: [1],
            description: [null]
        });
    }

    ngOnInit(): void {
        this.fetchObject();
    }

    breadcrumbs = [
        { label: 'Tableau de bord', routerLink: '/' },
        { label: 'Niveau de non-conformité', routerLink: '/niveau-non-conformite' }
    ];

    fetchObject() {
        this.loading = true;
          this.niveauNonConformiteService.findAll(this.currentPage, this.pageSize)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
            next: (res: any) => {
                console.log("RESULTAT API : ", res);
                
                // Si votre méthode 'findAll' renvoie maintenant une ApiResponse :
                setTimeout(() => {
                    this.dataList = res.data.content || [];
                    this.totalElements = res.data.totalElements;
                    this.currentPage = res.data.pageNumber || 0;
                    this.pageSize = res.data.pageSize;
                    this.totalPages = res.data.totalPages;
                    this.loading = false;
                }, 500);
            },
            error: (error: any) => {
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

    onSave(object: NiveauNonConformite) {
        const request = object.id != null
            ? this.niveauNonConformiteService.update(object)
            : this.niveauNonConformiteService.create(object);

        request.pipe(takeUntil(this.destroy$)).subscribe({
            next: (res) => {
                this.onSuccess(res);
            },
            error: (error) => {
                this.alertService.showError(error.error?.message); 
            }
        });
    }


      onDelete(niveau: NiveauNonConformite) {
          this.niveauNonConformiteService.delete(niveau.id).pipe(takeUntil(this.destroy$))
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
