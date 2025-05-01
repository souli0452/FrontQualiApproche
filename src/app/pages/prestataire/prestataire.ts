import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { FormGroupColumn, Prestataire, TableColumn } from '../../models';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { showToast, StatusEnum } from '../../utils';
import { HttpResponse } from '@angular/common/http';
import { AppCrudGenericComponent } from '../../components/app-crud-generic/app-crud-generic.component';
import { PrestataireService } from '../../services/prestataire.service';

@Component({
    selector: 'app-prestataire',
    standalone: true,
    imports: [CommonModule, AppCrudGenericComponent],
    template: `
        <div class="page-layout">
            <app-crud-generic
                [dialogWidth]="'50rem'"
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
export class PrestataireComponent {
    loading: boolean = true;
      destroy$: Subject<boolean> = new Subject<boolean>();
      dataList: Prestataire[] = [];
      closeDialog = false;
      formGroup: UntypedFormGroup;
      tableCols: TableColumn[];
      formCols: FormGroupColumn[];
      pageLabel = 'Liste des prèstataires';
      formHeader = 'Création et mise à jour d\'un prèstataire';


       constructor(protected fb: UntypedFormBuilder,
                      protected messageService: MessageService,
                      protected prestatireService: PrestataireService) {
              this.formCols = [
                  {field: 'id', label: "", header: 'Id', type: 'number', visible: false, required: false},
                  {field: 'nomPrestataire', label: "Nom du prestataire", header: 'Nom complet', type: 'string', visible: true, required: true},
                  {field: 'adressePrestataire', label: "Adresse du prestataire", header: 'Adresse', type: 'string', visible: true, required: true},
                  {field: 'telephonePrestataire', label: "Téléphone du prestataire", header: 'Téléphone', type: 'string', visible: true, required: true},
                  {field: 'contactPrincipalPrestataire', label: "Contact principal du prestataire", header: 'Contact principale', type: 'string', visible: true, required: true},
                  {field: 'emailPrestataire', label: "Email du prestataire", header: 'Email', type: 'string', visible: true, required: true},
                  {field: 'siteWebPrestataire', label: "Site web du prestataire", header: 'Site web', type: 'string', visible: true, required: false},
                  {field: 'statutPrestataire', label: "Statut du prestataire", header: 'Statut', type: 'dropdown', visible: true, required: false}

              ];
      
              this.tableCols = [
                  {field: 'nomPrestataire', header: 'Nom complet', type: 'string', filter: true},
                  {field: 'adressePrestataire', header: 'Adresse', type: 'string', filter: true},
                  {field: 'telephonePrestataire', header: 'Téléphone', type: 'string', filter: true},
                  {field: 'createdAt', header: 'Date de création', type: 'string', filter: true},
                  {field: 'updatedAt', header: 'Date de modification', type: 'string', filter: true},

              ];
      
              this.formGroup = this.fb.group({
                  id: [null],
                  nomPrestataire: [null, Validators.required],
                  adressePrestataire: [null, Validators.required],
                  telephonePrestataire: [null, Validators.required],
                  contactPrincipalPrestataire: [null, Validators.required],
                  emailPrestataire: [null, Validators.required],
                  siteWebPrestataire: [null, Validators.required],

              });
          }
      
          ngOnInit(): void {
              this.fetchPrestataire();
          }
      
          fetchPrestataire() {
              this.prestatireService.findAll().pipe(takeUntil(this.destroy$))
                  .subscribe({
                      next: res => {
                          this.dataList = res.body || [];
                      },
                      error: error => {
                          showToast(StatusEnum.error, error.status, null, this.messageService, error);
                      }
                  });
          }
      
          onSuccess(res: HttpResponse<any>) {
              this.closeDialog = true;
              this.fetchPrestataire();
              showToast(StatusEnum.success, res.status, null, this.messageService);
          }
      
          onSave(object: Prestataire) {
              if (object.id != null || undefined) {
                  this.prestatireService.update(object).pipe(takeUntil(this.destroy$))
                      .subscribe({
                          next: res => {
                              this.onSuccess(res);
                          }, error: error => {
                              showToast(StatusEnum.error, error.status, null, this.messageService, error);
                          }
                      });
              } else {
                  this.prestatireService.save(object).pipe(takeUntil(this.destroy$))
                      .subscribe({
                          next: res => {
                              this.onSuccess(res);
                          }, error: error => {
                              showToast(StatusEnum.error, error.status, null, this.messageService, error);
                          }
                      });
              }
          }
      
          onDelete(prestataire: Prestataire) {
              this.prestatireService.delete(prestataire.id).pipe(takeUntil(this.destroy$))
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
