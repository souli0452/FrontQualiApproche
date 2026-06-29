import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { showToast, StatusEnum } from '../../utils/global/global-utils';
import { HttpResponse } from '@angular/common/http';
import { AppCrudGenericComponent } from '../../components/app-crud-generic/app-crud-generic.component';
import { ProduitService } from '../../services/produit.service';
import { FormGroupColumn, TableColumn } from '../../models/generique.model';
import { Produit } from '../../models/produit.model';

@Component({
    selector: 'app-produit',
    standalone: true,
    imports: [CommonModule, AppCrudGenericComponent],
    template: `
        <div class="page-layout">
            <app-crud-generic
                [dialogWidth]="'50rem'"
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
                (removeEvent)="onDelete($event)">
            </app-crud-generic>
    </div>
    `
})
export class ProduitComponent {
    loading: boolean = true;
      destroy$: Subject<boolean> = new Subject<boolean>();
      dataList: Produit[] = [];
      closeDialog = false;
      formGroup: UntypedFormGroup;
      tableCols: TableColumn[];
      formCols: FormGroupColumn[];
      pageLabel = 'Liste des produits';
      formHeader = 'Création et mise à jour d\'un produit';
  
      constructor(protected fb: UntypedFormBuilder,
                  protected messageService: MessageService,
                  protected produitService: ProduitService) {
          this.formCols = [
              {field: 'id', label: "", header: 'Id', type: 'number', visible: false, required: false},
              {field: 'libelleProduit', label: "Libellé du produit", header: 'Libellé', type: 'string', visible: true, required: true},
              {field: 'descriptionProduit', label: "Description du produit", header: 'Description', type: 'string', visible: true, required: false},
              //{field: 'audites', label: "Information audite", header: 'Audites', type: 'dropdown', visible: true, required: false}

          ];
  
          this.tableCols = [
              {field: 'libelleProduit', header: 'Libellé', type: 'string', filter: true},
              {field: 'descriptionProduit', header: 'Description', type: 'string', filter: true},
              {field: 'createdAt', header: 'Date de création', type: 'string', filter: true},
              {field: 'updatedAt', header: 'Date de modification', type: 'string', filter: true},
          ];
  
          this.formGroup = this.fb.group({
              id: [null],
              libelleProduit: [null, Validators.required],
              descriptionProduit: [null, Validators.required],
            //  audites: [null, Validators.required]

          });
      }
  
      ngOnInit(): void {
          this.fetchProduit();
      }
  
      fetchProduit() {
         this.loading = true;
          this.produitService.findAll().pipe(takeUntil(this.destroy$))
              .subscribe({
                  next: res => {
                      this.dataList = res.data.content || [];
                      this.loading = false;
                  },
                  error: error => {
                      this.loading = false;
                      showToast(StatusEnum.error, error.status, null, this.messageService, error);
                  }
              });
      }
  
      onSuccess(res: HttpResponse<any>) {
          this.closeDialog = true;
          this.fetchProduit();
          showToast(StatusEnum.success, res.status, null, this.messageService);
      }
  
      onSave(object: Produit) {
          if (object.id != null || undefined) {
              this.produitService.update(object).pipe(takeUntil(this.destroy$))
                  .subscribe({
                      next: res => {
                          this.onSuccess(res);
                      }, error: error => {
                          showToast(StatusEnum.error, error.status, null, this.messageService, error);
                      }
                  });
          } else {
              this.produitService.save(object).pipe(takeUntil(this.destroy$))
                  .subscribe({
                      next: res => {
                          this.onSuccess(res);
                      }, error: error => {
                          showToast(StatusEnum.error, error.status, null, this.messageService, error);
                      }
                  });
          }
      }
  
      onDelete(produit: Produit) {
          this.produitService.delete(produit.id).pipe(takeUntil(this.destroy$))
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
