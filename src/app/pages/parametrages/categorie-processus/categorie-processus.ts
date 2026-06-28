import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { AppCrudGenericComponent } from '../../../components/app-crud-generic/app-crud-generic.component';
import { showToast, StatusEnum } from '../../../utils';
import { ApiItemResponse } from '../../../models/response.model';
import { FormGroupColumn, TableColumn } from '../../../models/generique.model';
import { CategorieProcessus } from '../../../models/categore-processus.model';
import { CategorieProcessusService } from '../../../services/non-conformite/type-processus.service';

@Component({
    selector: 'app-type-processus',
    standalone: true,
    imports: [CommonModule, AppCrudGenericComponent],
    template: `
        <div class="page-layout">
            <div class="card mb-0 pb-0">
                <div class="bg-surface-100 p-2 text-center">
                    <div class="text-xl mb-2 font-bold">Gestion des catégories de processus</div>
                    <p>Ajoutez ou modifiez les différentes catégories de processus.</p>
                </div>
            </div>
            <app-crud-generic
                [addButtonLabel]="'Nouvelle catégorie de processus'"
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
                [totalElements]="totalElements"
                [isPagination]="false"
                [currentPage]="currentPage"
                [pageSize]="pageSize"
                (pageChangeEvent)="onPageChange($event)"
                (removeEvent)="onDelete($event)">
            </app-crud-generic>
    </div>
    `
})
export class CategorieProcessusComponent {
    loading: boolean = true;
      destroy$: Subject<boolean> = new Subject<boolean>();
      dataList: CategorieProcessus[] = [];
      totalElements: number = 0;
      currentPage: number = 0;
      pageSize: number = 0;
      totalPages: number = 0;

      closeDialog = false;
      formGroup: UntypedFormGroup;
      tableCols: TableColumn[];
      formCols: FormGroupColumn[];
      pageLabel = 'Types de processus';
      formHeader = 'Création et mise à jour d\'un type de processus';

      constructor(protected fb: UntypedFormBuilder,
                  protected messageService: MessageService,
                  protected categorieProcessusService: CategorieProcessusService) {
          this.formCols = [
              {field: 'id', label: "", header: 'Id', type: 'number', visible: false, required: false},
              {field: 'libelle', label: "Libellé du type de processus (Réalisation - Support)", header: 'Libellé', type: 'string', visible: true, required: true},
              {field: 'description', label: "Description du type de processus", header: 'Description', type: 'text', visible: true, required: false}
          ];

          this.tableCols = [
              {field: 'libelle', header: 'Libellé', type: 'string', filter: true},
              {field: 'description', header: 'Description', type: 'string', filter: true},
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


    fetchObject() {
    this.loading = true;
    this.categorieProcessusService.findAll(this.currentPage, this.pageSize)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
            next: (res: any) => {
                console.log(res);
                
                this.dataList = res.data.content || [];
                this.totalElements = res.data.totalElements;
                this.currentPage = res.data.pageNumber || 0;
                this.pageSize = res.data.pageSize;
                this.totalPages = res.data.totalPages;
                
                // Si votre méthode renvoie une simple liste (Option 1 de la réponse précédente) :
                // this.dataList = res || [];
                
                this.loading = false;
            },
            error: (error: any) => {
                this.loading = false;
                showToast(StatusEnum.error, error.status, null, this.messageService, error);
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

        showToast(StatusEnum.success, res.statusCode, res.message, this.messageService);
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
                showToast(StatusEnum.error, error.status, null, this.messageService, error);
            }
        });
    }

    onDelete(processus: CategorieProcessus) {
    this.categorieProcessusService.delete(processus.id).pipe(takeUntil(this.destroy$))
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
