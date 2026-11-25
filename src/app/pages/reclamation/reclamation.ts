import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { NgPrimeModule } from '@prime-ng';
import { HeaderPage } from '@shared/header-page/header-page';
import { showToast, StatusEnum } from '../../utils/global/global-utils';
import { ReclamationService } from './reclamation.service';
import { FormGroupColumn, TableColumn } from '../../models/generique.model';
import { Reclamation } from '../../models/reclamation.model';
import { AppCrudGenericComponent } from '@shared/app-crud-generic/app-crud-generic.component';

@Component({
    selector: 'app-reclamation',
    standalone: true,
    imports: [CommonModule, NgPrimeModule, HeaderPage, AppCrudGenericComponent],
    template: `
        <p-toast></p-toast>
        <div class="card-first overflow-x-clip border-none premium-hub transition-colors duration-300">
            <app-header-page
                [title]="pageLabel"
                subtitle="Enregistrement et suivi des réclamations usagers et parties intéressées"
                [breadcrumbs]="breadcrumbs"
            />
            <app-crud-generic
                [dialogWidth]="'50rem'"
                [pageLabel]="pageLabel"
                [addButtonLabel]="'Nouvelle réclamation'"
                [formLongDescription]="formLongDescription"
                [detailLongDescription]="detailLongDescription"
                [loading]="loading"
                [tableCols]="tableCols"
                [listeObject]="dataList"
                [formGroup]="formGroup"
                [formCols]="formCols"
                [isAffich]="true"
                [isPagination]="true"
                [totalElements]="dataList.length"
                [pageSize]="pageSize"
                [currentPage]="currentPage"
                [closeDialog]="closeDialog"
                [formHeader]="formHeader"
                (pageChangeEvent)="onPageChange($event)"
                (newItemEvent)="onSave($event)"
                (removeEvent)="onDelete($event)">
            </app-crud-generic>
        </div>
    `
})
export class ReclamationComponent implements OnInit, OnDestroy {
    loading: boolean = true;
    destroy$: Subject<boolean> = new Subject<boolean>();
    dataList: Reclamation[] = [];
    closeDialog = false;
    pageSize = 10;
    currentPage = 0;
    formGroup: UntypedFormGroup;
    tableCols: TableColumn[];
    formCols: FormGroupColumn[];
    pageLabel = 'Réclamations';
    formHeader = 'Création et mise à jour d\'une réclamation';
    formLongDescription = 'Saisissez les informations du demandeur et la référence éventuelle pour enregistrer une réclamation dans le registre.';
    detailLongDescription = 'Consultez ci-dessous les détails enregistrés pour cette réclamation.';

    breadcrumbs = [
        { label: 'Tableau de bord', routerLink: '/' },
        { label: 'Réclamations', routerLink: '' }
    ];

    constructor(
        protected fb: UntypedFormBuilder,
        protected messageService: MessageService,
        protected reclamationService: ReclamationService
    ) {
        this.formCols = [
            { field: 'id', label: '', header: 'Id', type: 'string', visible: false, required: false },
            { field: 'nomDemendeur', label: 'Nom complet du demandeur', header: 'Nom du demandeur', type: 'string', visible: true, required: true },
            { field: 'numeroReference', label: 'Référence du dossier ou du courrier', header: 'Numéro de référence', type: 'string', visible: true, required: false }
        ];
        this.tableCols = [
            { field: 'nomDemendeur', header: 'Nom du demandeur', type: 'string', filter: true },
            { field: 'numeroReference', header: 'Numéro de référence', type: 'string', filter: true },
            { field: 'createdAt', header: 'Date de création', type: 'date', filter: true },
            { field: 'updatedAt', header: 'Date de modification', type: 'date', filter: true }
        ];

        this.formGroup = this.fb.group({
            id: [null],
            nomDemendeur: [null, Validators.required],
            numeroReference: [null]
        });
    }

    ngOnInit(): void {
        this.fetchReclamation();
    }

    onPageChange(event: { page: number; size: number }): void {
        this.currentPage = event.page ?? 0;
        this.pageSize = event.size ?? this.pageSize;
    }

    fetchReclamation(): void {
        this.loading = true;
        this.reclamationService.findAll().pipe(takeUntil(this.destroy$))
            .subscribe({
                next: res => {
                    this.dataList = res.data?.content || [];
                    this.loading = false;
                },
                error: error => {
                    this.loading = false;
                    showToast(StatusEnum.error, error.status, null, this.messageService, error);
                }
            });
    }

    onSuccess(res: any): void {
        this.closeDialog = true;
        setTimeout(() => (this.closeDialog = false));
        this.fetchReclamation();
        showToast(StatusEnum.success, res?.statusCode ?? res?.status ?? 200, null, this.messageService);
    }

    onSave(object: Reclamation): void {
        if (object.id != null) {
            this.reclamationService.update(object).pipe(takeUntil(this.destroy$)).subscribe({
                next: res => this.onSuccess(res),
                error: error => showToast(StatusEnum.error, error.status, null, this.messageService, error)
            });
        } else {
            this.reclamationService.save(object).pipe(takeUntil(this.destroy$)).subscribe({
                next: res => this.onSuccess(res),
                error: error => showToast(StatusEnum.error, error.status, null, this.messageService, error)
            });
        }
    }

    onDelete(reclamation: Reclamation): void {
        this.reclamationService.delete(reclamation.id).pipe(takeUntil(this.destroy$))
            .subscribe({
                next: res => this.onSuccess(res),
                error: error => showToast(StatusEnum.error, error.status, null, this.messageService, error)
            });
    }

    ngOnDestroy(): void {
        this.destroy$.next(true);
        this.destroy$.complete();
    }
}
