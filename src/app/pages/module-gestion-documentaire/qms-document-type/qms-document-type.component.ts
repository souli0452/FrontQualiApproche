import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { AppCrudGenericComponent } from '../../../components/app-crud-generic/app-crud-generic.component';
import { QmsDocumentService } from '../../../services/module-gestion-documentaire/qms-document.service';
import { showToast, StatusEnum } from '../../../utils/global/global-utils';
import { FormGroupColumn, TableColumn } from '../../../models/generique.model';
import { QmsDocumentType } from '../../../models/gestion-documentaire.model';
import { NgPrimeModule } from '../../../../prime-ng.module';
import { NgxPermissionsModule, NgxPermissionsService } from 'ngx-permissions';

@Component({
    selector: 'app-qms-document-type',
    standalone: true,
    imports: [CommonModule, AppCrudGenericComponent, NgPrimeModule, NgxPermissionsModule],
    providers: [MessageService],
    template: `
        <p-toast></p-toast>
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
                (removeEvent)="onDelete($event)"
                [totalElements]="totalElements"
                [isPagination]="false"
                [currentPage]="currentPage"
                [pageSize]="pageSize"
                (pageChangeEvent)="onPageChange($event)"
                [consultation]="!hasWritePermission()"
                [notModif]="!hasWritePermission()"
                [notDelete]="!hasDeletePermission()"
                >
            </app-crud-generic>
        </div>
    `
})
export class QmsDocumentTypeComponent {
    loading: boolean = true;
    destroy$: Subject<boolean> = new Subject<boolean>();
    dataList: QmsDocumentType[] = [];
    totalElements: number = 0;
    currentPage: number = 0;
    pageSize: number = 5;
    totalPages: number = 0;

    closeDialog = false;
    formGroup: UntypedFormGroup;
    tableCols: TableColumn[];
    formCols: FormGroupColumn[];
    pageLabel = 'Configuration des Types de Document QMS';
    formHeader = 'Création et mise à jour d\'un type de document';

    constructor(protected fb: UntypedFormBuilder,
        protected messageService: MessageService,
        protected qmsService: QmsDocumentService,
        private ngxPermissionsService: NgxPermissionsService) {
        this.formCols = [
            { field: 'id', label: "", header: 'Id', type: 'string', visible: false, required: false },
            { field: 'code', label: "Code du type (ex: PRO, INS, ENR)", header: 'Code', type: 'string', visible: true, required: true },
            { field: 'libelle', label: "Libellé (ex: Procédure, Instruction)", header: 'Libellé', type: 'string', visible: true, required: true },
            { field: 'folderName', label: "Nom du dossier dans Alfresco", header: 'Dossier Alfresco', type: 'string', visible: true, required: true }
        ];

        this.tableCols = [
            { field: 'code', header: 'Code', type: 'string', filter: true },
            { field: 'libelle', header: 'Libellé', type: 'string', filter: true },
            { field: 'folderName', header: 'Dossier sur minio', type: 'string', filter: true },
            { field: 'createdAt', header: 'Date de création', type: 'string', filter: true }
        ];

        this.formGroup = this.fb.group({
            id: [null],
            code: [null, Validators.required],
            libelle: [null, Validators.required],
            folderName: [null, Validators.required]
        });
    }

    hasWritePermission(): boolean {
        return true;
    }

    hasDeletePermission(): boolean {
        return true;
    }

    ngOnInit(): void {
        this.fetchObject();
    }

    fetchObject() {
        this.loading = true;
        this.qmsService.typeDocumentQmsGetAll(this.currentPage, this.pageSize).pipe(takeUntil(this.destroy$))
            .subscribe({
                next: res => {
                    this.dataList = res.data.content || [];
                    // On garde la trace du total pour la pagination
                    this.totalElements = res.data.totalElements;
                    this.currentPage = res.data.pageNumber;
                    this.pageSize = res.data.pageSize;
                    this.loading = false;
                },
                error: error => {
                    this.loading = false;
                    showToast(StatusEnum.error, error.status, null, this.messageService, error);
                }
            });
    }

    onPageChange(event: { page: number, size: number }) {
        this.currentPage = event.page;
        this.pageSize = event.size;

        this.fetchObject();
    }

    onSuccess(res: any) {
        this.closeDialog = true;
        this.fetchObject();
        this.messageService.add({ severity: 'success', summary: 'Succès', detail: 'Opération réussie' });
    }

    onSave(object: QmsDocumentType) {
        if (object.id != null) {
            this.qmsService.typeDocumentQmsUpdate(object.id, object).pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: res => {
                        this.onSuccess(res);
                    }, error: error => {
                        showToast(StatusEnum.error, error.status, null, this.messageService, error);
                    }
                });
        } else {
            this.qmsService.typeDocumentQmsCreate(object).pipe(takeUntil(this.destroy$))
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
        this.qmsService.typeDocumentQmsDelete(type.id!).pipe(takeUntil(this.destroy$))
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
