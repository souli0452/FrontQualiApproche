import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { HttpResponse } from '@angular/common/http';
import { AppCrudGenericComponent } from '../../../../components/app-crud-generic/app-crud-generic.component';
import { FormGroupColumn, NiveauNonConformite, TableColumn } from '../../../../models';
import { showToast, StatusEnum } from '../../../../utils';
import { NiveauNonConformiteService } from '../../../../services/non-conformite/niveau-non-conformite.service';

@Component({
    selector: 'app-niveau-non-conformite',
    standalone: true,
    imports: [CommonModule, AppCrudGenericComponent],
    template: `
        <div class="page-layout">
            <app-crud-generic
                [addButtonLabel]="'Niveau de gravité'"
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
export class NiveauNonConformiteComponent {
    loading: boolean = true;
      destroy$: Subject<boolean> = new Subject<boolean>();
      dataList: NiveauNonConformite[] = [];
                totalElements: number = 0;
      currentPage: number = 0;
      pageSize: number = 0;
      totalPages: number = 0;

      closeDialog = false;
      formGroup: UntypedFormGroup;
      tableCols: TableColumn[];
      formCols: FormGroupColumn[];
      pageLabel = 'Niveaux de non conformité';
      formHeader = 'Création et mise à jour d\'un niveau de non conformité';

      constructor(protected fb: UntypedFormBuilder,
                  protected messageService: MessageService,
                  protected niveauNonConformiteService: NiveauNonConformiteService) {
          this.formCols = [
              {field: 'id', label: "", header: 'Id', type: 'number', visible: false, required: false},
              {field: 'libelle', label: "Libellé du niveau de non conformité (Mineur - Majeur)", header: 'Libellé', type: 'string', visible: true, required: true},
              {field: 'description', label: "Description du niveau de non conformité", header: 'Description', type: 'text', visible: true, required: false}
          ];

          this.tableCols = [
              {field: 'libelle', header: 'Libellé', type: 'string', filter: true},
              {field: 'description', header: 'Description', type: 'string', filter: true},
              {field: 'createdAt', header: 'Date de création', type: 'string', filter: true},
              {field: 'updatedAt', header: 'Date de modification', type: 'string', filter: true}
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
          this.niveauNonConformiteService.GetAllObjects(this.currentPage, this.pageSize)
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

      onSave(object: NiveauNonConformite) {
          if (object.id != null || undefined) {
              this.niveauNonConformiteService.update(object).pipe(takeUntil(this.destroy$))
                  .subscribe({
                      next: res => {
                          this.onSuccess(res);
                      }, error: error => {
                          showToast(StatusEnum.error, error.status, null, this.messageService, error);
                      }
                  });
          } else {
              this.niveauNonConformiteService.save(object).pipe(takeUntil(this.destroy$))
                  .subscribe({
                      next: res => {
                          this.onSuccess(res);
                      }, error: error => {
                          showToast(StatusEnum.error, error.status, null, this.messageService, error);
                      }
                  });
          }
      }

      onDelete(niveau: NiveauNonConformite) {
          this.niveauNonConformiteService.delete(niveau.id).pipe(takeUntil(this.destroy$))
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
