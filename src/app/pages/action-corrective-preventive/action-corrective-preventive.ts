import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { ActionCorrectivePreventive, FormGroupColumn, Produit, TableColumn } from '../../models';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { showToast, StatusEnum } from '../../utils';
import { HttpResponse } from '@angular/common/http';
import { AppCrudGenericComponent } from '../../components/app-crud-generic/app-crud-generic.component';
import { ActionCorrectivePreventiveService } from '../../services/non-conformite/action-corrective-preventive.service';

@Component({
    selector: 'app-action-corrective-preventive',
    standalone: true,
    imports: [CommonModule, AppCrudGenericComponent],
    template: `
        <div class="page-layout">
            <app-crud-generic
                [dialogWidth]="'50rem'"
                [pageLabel]="pageLabel" 
                [loading]="loading"
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
export class ActionCorrectivePreventiveComponent {
    loading: boolean = true;
          destroy$: Subject<boolean> = new Subject<boolean>();
          dataList: ActionCorrectivePreventive[] = [];
          closeDialog = false;
          formGroup: UntypedFormGroup;
          tableCols: TableColumn[];
          formCols: FormGroupColumn[];
          pageLabel = 'Liste des actions corrective et preventive';
          formHeader = 'Création et mise à jour d\'une action';
    
    
           constructor(protected fb: UntypedFormBuilder,
                          protected messageService: MessageService,
                          protected actionCorrectivePreventiveService: ActionCorrectivePreventiveService) {
                  this.formCols = [
                      {field: 'id', label: "", header: 'Id', type: 'number', visible: false, required: false},
                      {field: 'libelle', label: "", header: 'Libelle', type: 'string', visible: true, required: true},
                    //   {field: 'description', label: "", header: 'Dèscription', type: 'text', visible: true, required: false},
                    //   {field: 'responsable', label: "", header: 'Rèsponsable', type: 'string', visible: true, required: true},
                    //   {field: 'statut', label: "", header: 'Statut', type: 'dropdown', visible: true, required: false},
                    //   {field: 'type', label: "", header: 'Type', type: 'dropdown', visible: true, required: false},
                    //   {field: 'dateDebut', label: "", header: 'Date de debut', type: 'date', visible: true, required: false},
                    //   {field: 'dateFin', label: "", header: 'Date de fin', type: 'date', visible: true, required: false},
                    //   {field: 'reclamation', label: "", header: 'Reclamation', type: 'dropdown', visible: true, required: false},
                    //   {field: 'risques', label: "", header: 'Risques', type: 'dropdown', visible: true, required: false},
                    //   {field: 'exigences', label: "", header: 'Exigences', type: 'dropdown', visible: true, required: false}
                  ];
          
                  this.tableCols = [
                      {field: 'libelle', header: 'Libelle', type: 'string', filter: true},
                      {field: 'description', header: 'Dèscription', type: 'string', filter: true},
                      {field: 'responsable', header: 'Rèsponsable', type: 'string', filter: true},
                      {field: 'statut', header: 'Statut', type: 'string', filter: true},
    
                  ];
          
                  this.formGroup = this.fb.group({
                      id: [null],
                      libelle: [null, Validators.required],
                   //   description: [null, Validators.required],
                   //   responsable: [null, Validators.required],
                    //  statut: [null, Validators.required],
                    //  type: [null, Validators.required],
                   //   dateDebut: [null, Validators.required],
                   //   dateFin: [null, Validators.required],
                    //   reclamation: [null, Validators.required],
                    //   risques: [null, Validators.required],
                    //   exigences: [null, Validators.required],
    
                  });
              }
          
              ngOnInit(): void {
                  this.fetchAction();
              }
          
              fetchAction() {
                this.loading = true;
                  this.actionCorrectivePreventiveService.findAll().pipe(takeUntil(this.destroy$))
                      .subscribe({
                          next: res => {
                              this.dataList = res.body || [];
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
                  this.fetchAction();
                  showToast(StatusEnum.success, res.status, null, this.messageService);
              }
          
              onSave(object: ActionCorrectivePreventive) {
                  if (object.id != null || undefined) {
                      this.actionCorrectivePreventiveService.update(object).pipe(takeUntil(this.destroy$))
                          .subscribe({
                              next: res => {
                                  this.onSuccess(res);
                              }, error: error => {
                                  showToast(StatusEnum.error, error.status, null, this.messageService, error);
                              }
                          });
                  } else {
                      this.actionCorrectivePreventiveService.save(object).pipe(takeUntil(this.destroy$))
                          .subscribe({
                              next: res => {
                                  this.onSuccess(res);
                              }, error: error => {
                                  showToast(StatusEnum.error, error.status, null, this.messageService, error);
                              }
                          });
                  }
              }
          
              onDelete(actionCorrectivePreventive: ActionCorrectivePreventive) {
                  this.actionCorrectivePreventiveService.delete(actionCorrectivePreventive.id).pipe(takeUntil(this.destroy$))
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
