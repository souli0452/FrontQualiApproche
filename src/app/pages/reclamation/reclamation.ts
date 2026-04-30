import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { FormGroupColumn, Produit, Reclamation, TableColumn } from '../../models';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { showToast, StatusEnum } from '../../utils';
import { HttpResponse } from '@angular/common/http';
import { AppCrudGenericComponent } from '../../components/app-crud-generic/app-crud-generic.component';
import { ReclamationService } from '../../services/reclamation.service';

@Component({
    selector: 'app-reclamation',
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
export class ReclamationComponent {
    loading: boolean = true;
    destroy$: Subject<boolean> = new Subject<boolean>();
    dataList: Reclamation[] = [];
    closeDialog = false;
    formGroup: UntypedFormGroup;
    tableCols: TableColumn[];
    formCols: FormGroupColumn[];
    pageLabel = 'Réclamation';
    formHeader = 'Création et mise à jour d\'une réclamation';

    constructor(protected fb: UntypedFormBuilder,
                protected messageService: MessageService,
                protected reclamationService: ReclamationService) {
        this.formCols = [
            {field: 'id', label: "", header: 'Id', type: 'string', visible: false, required: false},
            {field: 'nomDemendeur', label: "Nom du demandeur", header: 'Nom du demandeur', type: 'string', visible: true, required: true},
            {field: 'numeroReference', label: "Numéro de référence", header: 'Numéro de réfrence', type: 'string', visible: true, required: false, },
        ];
        this.tableCols = [
            {field: 'nomDemendeur', header: 'Nom du demandeur', type: 'string', filter: true},
            {field: 'numeroReference', header: 'Numéro de réfrence', type: 'string', filter: true},
            {field: 'createdAt', header: 'Date de création', type: 'string', filter: true},
            {field: 'updatedAt', header: 'Date de modification', type: 'string', filter: true},

        ];

        this.formGroup = this.fb.group({
            id: [null],
            nomDemendeur: [null, Validators.required],
            numeroReference: [null],
        });
    }

    ngOnInit(): void {
        this.fetchReclamation();
    }

    fetchReclamation() {    
        this.loading = true;
        this.reclamationService.findAll().pipe(takeUntil(this.destroy$))
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
        this.fetchReclamation();
        showToast(StatusEnum.success, res.status, null, this.messageService);
    }

    onSave(object: Reclamation) {
        if (object.id != null || undefined) {
            this.reclamationService.update(object).pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: res => {
                        this.onSuccess(res);
                    }, error: error => {
                        showToast(StatusEnum.error, error.status, null, this.messageService, error);
                    }
                });
        } else {
            this.reclamationService.save(object).pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: res => {
                        this.onSuccess(res);
                    }, error: error => {
                        showToast(StatusEnum.error, error.status, null, this.messageService, error);
                    }
                });
        }
    }

    onDelete(reclamation: Reclamation) {
        this.reclamationService.delete(reclamation.id).pipe(takeUntil(this.destroy$))
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
