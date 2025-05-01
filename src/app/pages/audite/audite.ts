import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { Audite, FormGroupColumn, TableColumn } from '../../models';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { showToast, StatusEnum } from '../../utils';
import { HttpResponse } from '@angular/common/http';
import { AppCrudGenericComponent } from '../../components/app-crud-generic/app-crud-generic.component';
import { AuditService } from '../../services/audit.service';

@Component({
    selector: 'app-audite',
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
export class AuditeComponent {
    loading: boolean = true;
            destroy$: Subject<boolean> = new Subject<boolean>();
            dataList: Audite[] = [];
            closeDialog = false;
            formGroup: UntypedFormGroup;
            tableCols: TableColumn[];
            formCols: FormGroupColumn[];
            pageLabel = 'Liste des Audites';
            formHeader = 'Création et mise à jour d\'un audite';
      
      
             constructor(protected fb: UntypedFormBuilder,
                            protected messageService: MessageService,
                            protected auditService: AuditService) {
                    this.formCols = [
                        {field: 'id', label: "", header: 'Id', type: 'number', visible: false, required: false},
                        {field: 'libelleAudite', label: "", header: 'Libelle', type: 'string', visible: true, required: true},
                        {field: 'descriptionAudite', label: "", header: 'Dèscription', type: 'string', visible: true, required: true},
                        {field: 'resultatAudite', label: "", header: 'Resultat', type: 'string', visible: true, required: true},
                        {field: 'statutAudite', label: "", header: 'Statut', type: 'string', visible: true, required: false},
                        {field: 'objectifAudite', label: "", header: 'Ojectif', type: 'string', visible: true, required: false},
                        {field: 'typeAudite', label: "", header: 'Type', type: 'string', visible: true, required: false},
                        {field: 'FounisseurId', label: "", header: 'Founisseur', type: 'string', visible: true, required: false},
                        {field: 'produits', label: "", header: 'Produit', type: 'dropdown', visible: true, required: false},
                        {field: 'risques', label: "", header: 'Risques', type: 'dropdown', visible: true, required: false},
                        {field: 'exigences', label: "", header: 'Exigences', type: 'dropdown', visible: true, required: false},
                        {field: 'nonConformites', label: "", header: 'Non Conformite', type: 'dropdown', visible: true, required: false},
                        {field: 'departements', label: "", header: 'Departement', type: 'dropdown', visible: true, required: false}

                    ];
            
                    this.tableCols = [
                        {field: 'libelleAudite', header: 'Libelle', type: 'string', filter: true},
                        {field: 'descriptionAudite', header: 'Dèscription', type: 'string', filter: true},
                        {field: 'resultatAudite', header: 'Resultat', type: 'string', filter: true},
                        {field: 'statutAudite', header: 'Statut', type: 'string', filter: true},
      
                    ];
            
                    this.formGroup = this.fb.group({
                        id: [null],
                        libelleAudite: [null, Validators.required],
                        descriptionAudite: [null, Validators.required],
                        resultatAudite: [null, Validators.required],
                        statutAudite: [null, Validators.required],
                        objectifAudite: [null, Validators.required],
                        // FounisseurId: [null, Validators.required],
                        // produits: [null, Validators.required],
                        // reclamation: [null, Validators.required],
                        // risques: [null, Validators.required],
                        // exigences: [null, Validators.required],
                        // nonConformites: [null, Validators.required],
                        // departements: [null, Validators.required],

                    });
                }
            
                ngOnInit(): void {
                    this.fetchAudit();
                }
            
                fetchAudit() {
                    this.auditService.findAll().pipe(takeUntil(this.destroy$))
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
                    this.fetchAudit();
                    showToast(StatusEnum.success, res.status, null, this.messageService);
                }
            
                onSave(object: Audite) {
                    if (object.id != null || undefined) {
                        this.auditService.update(object).pipe(takeUntil(this.destroy$))
                            .subscribe({
                                next: res => {
                                    this.onSuccess(res);
                                }, error: error => {
                                    showToast(StatusEnum.error, error.status, null, this.messageService, error);
                                }
                            });
                    } else {
                        this.auditService.save(object).pipe(takeUntil(this.destroy$))
                            .subscribe({
                                next: res => {
                                    this.onSuccess(res);
                                }, error: error => {
                                    showToast(StatusEnum.error, error.status, null, this.messageService, error);
                                }
                            });
                    }
                }
            
                onDelete(audite: Audite) {
                    this.auditService.delete(audite.id).pipe(takeUntil(this.destroy$))
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
