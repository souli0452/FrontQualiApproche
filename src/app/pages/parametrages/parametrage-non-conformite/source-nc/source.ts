import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { HttpResponse } from '@angular/common/http';
import { AppCrudGenericComponent } from '../../../../components/app-crud-generic/app-crud-generic.component';
import { FormGroupColumn, TableColumn, TypeNonConformite } from '../../../../models';
import { showToast, StatusEnum } from '../../../../utils';
import { TypeNonConformiteService } from '../../../../services/non-conformite/type-non-conformite.service';

@Component({
    selector: 'app-type-non-conformite',
    standalone: true,
    imports: [CommonModule, AppCrudGenericComponent],
    template: `
        <div class="page-layout">
            <app-crud-generic
                [addButtonLabel]="'Nouveau type de non conformité'"
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
export class SourceNonConformite {
    loading: boolean = true;
      destroy$: Subject<boolean> = new Subject<boolean>();
      dataList: TypeNonConformite[] = [];
          totalElements: number = 0;
      currentPage: number = 0;
      pageSize: number = 0;
      totalPages: number = 0;


      closeDialog = false;
      formGroup: UntypedFormGroup;
      tableCols: TableColumn[];
      formCols: FormGroupColumn[];
      pageLabel = 'Types de non conformité';
      formHeader = 'Création et mise à jour d\'un type de non conformité';

      constructor(protected fb: UntypedFormBuilder,
                  protected messageService: MessageService,
                  protected typeNonConformiteService: TypeNonConformiteService) {
          this.formCols = [
              {field: 'id', label: "", header: 'Id', type: 'number', visible: false, required: false},
              {field: 'libelle', label: "Libellé du type de non conformité (Système - Service)", header: 'Libellé', type: 'string', visible: true, required: true},
              {field: 'description', label: "Description du type de non conformité", header: 'Description', type: 'text', visible: true, required: false}
          ];

          this.tableCols = [
              {field: 'libelle', header: 'Libellé', type: 'string', filter: true},
              {field: 'description', header: 'Description', type: 'string', filter: true},
              {field: 'createdAt', header: 'Date de création', type: 'date', filter: true},
              {field: 'updatedAt', header: 'Date de modification', type: 'date', filter: true}
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
          this.typeNonConformiteService.GetAllObjects(this.currentPage, this.pageSize)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
            next: (res: any) => {
                console.log("CATEGORIE DE PROCESSUS : ", res);
                // Si votre méthode 'findAll' renvoie maintenant une ApiResponse :
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
        this.fetchObject();
    }

      onSuccess(res: HttpResponse<any>) {
          this.closeDialog = true;
          this.fetchObject();
          showToast(StatusEnum.success, res.status, null, this.messageService);
      }

      onSave(object: TypeNonConformite) {
          if (object.id != null || undefined) {
            console.log("TYPE DE NON CONFORMITE ", object);

              this.typeNonConformiteService.update(object).pipe(takeUntil(this.destroy$))
                  .subscribe({
                      next: res => {
                          this.onSuccess(res);
                      }, error: error => {
                          showToast(StatusEnum.error, error.status, null, this.messageService, error);
                      }
                  });
          } else {
              this.typeNonConformiteService.save(object).pipe(takeUntil(this.destroy$))
                  .subscribe({
                      next: res => {
                          this.onSuccess(res);
                      }, error: error => {
                          showToast(StatusEnum.error, error.status, null, this.messageService, error);
                      }
                  });
          }
      }

      onDelete(produit: TypeNonConformite) {
          this.typeNonConformiteService.delete(produit.id).pipe(takeUntil(this.destroy$))
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
