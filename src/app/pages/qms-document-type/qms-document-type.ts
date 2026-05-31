import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { HttpResponse } from '@angular/common/http';
import { AppCrudGenericComponent } from '../../components/app-crud-generic/app-crud-generic.component';
import { FormGroupColumn, TableColumn } from '../../models';
import { QmsDocumentService, QmsDocumentType } from '../../services/qms-document.service';
import { showToast, StatusEnum } from '../../utils';

@Component({
    selector: 'app-qms-document-type',
    standalone: true,
    imports: [CommonModule, AppCrudGenericComponent],
    template: `
        <div class="page-layout">
            <app-crud-generic
                [addButtonLabel]="'Nouveau type de document'"
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
                (removeEvent)="onDelete($event)">
            </app-crud-generic>
        </div>
    `
})
export class QmsDocumentTypeComponent {
    loading: boolean = true;
    destroy$: Subject<boolean> = new Subject<boolean>();
    dataList: QmsDocumentType[] = [];
    closeDialog = false;
    formGroup: UntypedFormGroup;
    tableCols: TableColumn[];
    formCols: FormGroupColumn[];
    pageLabel = 'Configuration des Types de Document QMS';
    formHeader = 'Création et mise à jour d\'un type de document';

    constructor(protected fb: UntypedFormBuilder,
                protected messageService: MessageService,
                protected qmsService: QmsDocumentService) {
        this.formCols = [
            {field: 'id', label: "", header: 'Id', type: 'string', visible: false, required: false},
            {field: 'code', label: "Code du type (ex: PRO, INS, ENR)", header: 'Code', type: 'string', visible: true, required: true},
            {field: 'libelle', label: "Libellé (ex: Procédure, Instruction)", header: 'Libellé', type: 'string', visible: true, required: true},
            {field: 'folderName', label: "Nom du dossier dans Alfresco", header: 'Dossier Alfresco', type: 'string', visible: true, required: true}
        ];

        this.tableCols = [
            {field: 'code', header: 'Code', type: 'string', filter: true},
            {field: 'libelle', header: 'Libellé', type: 'string', filter: true},
            {field: 'folderName', header: 'Dossier Alfresco', type: 'string', filter: true},
            {field: 'createdAt', header: 'Date de création', type: 'string', filter: true}
        ];

        this.formGroup = this.fb.group({
            id: [null],
            code: [null, Validators.required],
            libelle: [null, Validators.required],
            folderName: [null, Validators.required]
        });
    }

    ngOnInit(): void {
        this.fetchObject();
    }

    fetchObject() {
        this.loading = true;
        this.qmsService.getAllTypes().pipe(takeUntil(this.destroy$))
            .subscribe({
                next: res => {
                    this.dataList = res || [];
                    this.loading = false;
                },
                error: error => {
                    this.loading = false;
                    showToast(StatusEnum.error, error.status, null, this.messageService, error);
                }
            });
    }

    onSuccess(res: any) {
        this.closeDialog = true;
        this.fetchObject();
        this.messageService.add({ severity: 'success', summary: 'Succès', detail: 'Opération réussie' });
    }

    onSave(object: QmsDocumentType) {
        if (object.id != null) {
            this.qmsService.updateType(object.id, object).pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: res => {
                        this.onSuccess(res);
                    }, error: error => {
                        showToast(StatusEnum.error, error.status, null, this.messageService, error);
                    }
                });
        } else {
            this.qmsService.createType(object).pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: res => {
                        this.onSuccess(res);
                    }, error: error => {
                        showToast(StatusEnum.error, error.status, null, this.messageService, error);
                    }
                });
        }
    }

    onDelete(type: QmsDocumentType) {
        this.qmsService.deleteType(type.id!).pipe(takeUntil(this.destroy$))
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
