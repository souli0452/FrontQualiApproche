import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { NgPrimeModule } from '@prime-ng';
import { HeaderPage } from '@shared/header-page/header-page';
import { showToast, StatusEnum } from '../../utils/global/global-utils';
import { FormGroupColumn, TableColumn } from '../../models/generique.model';
import { ActionCorrectivePreventive } from '@features/non-conformite/models/plan-action.model';
import { ActionCorrectivePreventiveService } from '@features/non-conformite/services/action-corrective-preventive.service';
import { AppCrudGenericComponent } from '@shared/app-crud-generic/app-crud-generic.component';

@Component({
    selector: 'app-action-corrective-preventive',
    standalone: true,
    imports: [CommonModule, NgPrimeModule, HeaderPage, AppCrudGenericComponent],
    template: `
        <div class="card-first overflow-x-clip border-none premium-hub transition-colors duration-300">
            <app-header-page
                [title]="pageLabel"
                subtitle="Suivi des actions correctives et préventives issues du système de management qualité"
                [breadcrumbs]="breadcrumbs"
            />
            <app-crud-generic
                [dialogWidth]="'50rem'"
                [pageLabel]="pageLabel"
                [addButtonLabel]="'Nouvelle action'"
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
export class ActionCorrectivePreventiveComponent implements OnInit, OnDestroy {
    loading: boolean = true;
    destroy$: Subject<boolean> = new Subject<boolean>();
    dataList: ActionCorrectivePreventive[] = [];
    closeDialog = false;
    pageSize = 10;
    currentPage = 0;
    formGroup: UntypedFormGroup;
    tableCols: TableColumn[];
    formCols: FormGroupColumn[];
    pageLabel = 'Actions correctives et préventives';
    formHeader = 'Création et mise à jour d\'une action';
    formLongDescription = 'Définissez l\'intitulé de l\'action corrective ou préventive à enregistrer dans le plan de suivi.';
    detailLongDescription = 'Consultez ci-dessous les informations détaillées de cette action corrective ou préventive.';

    breadcrumbs = [
        { label: 'Tableau de bord', routerLink: '/' },
        { label: 'Actions correctives et préventives', routerLink: '' }
    ];

    constructor(
        protected fb: UntypedFormBuilder,
        protected messageService: MessageService,
        protected actionCorrectivePreventiveService: ActionCorrectivePreventiveService
    ) {
        this.formCols = [
            { field: 'id', label: '', header: 'Id', type: 'number', visible: false, required: false },
            { field: 'libelle', label: 'Intitulé de l\'action', header: 'Libellé', type: 'string', visible: true, required: true }
        ];

        this.tableCols = [
            { field: 'libelle', header: 'Libellé', type: 'string', filter: true },
            { field: 'description', header: 'Description', type: 'string', filter: true },
            { field: 'responsable', header: 'Responsable', type: 'string', filter: true },
            { field: 'statut', header: 'Statut', type: 'string', filter: true }
        ];

        this.formGroup = this.fb.group({
            id: [null],
            libelle: [null, Validators.required]
        });
    }

    ngOnInit(): void {
        this.fetchAction();
    }

    onPageChange(event: { page: number; size: number }): void {
        this.currentPage = event.page ?? 0;
        this.pageSize = event.size ?? this.pageSize;
    }

    fetchAction(): void {
        this.loading = true;
        this.actionCorrectivePreventiveService.findAll().pipe(takeUntil(this.destroy$))
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
        this.fetchAction();
        showToast(StatusEnum.success, res?.statusCode ?? res?.status ?? 200, null, this.messageService);
    }

    onSave(object: ActionCorrectivePreventive): void {
        if (object.id != null) {
            this.actionCorrectivePreventiveService.update(object).pipe(takeUntil(this.destroy$)).subscribe({
                next: res => this.onSuccess(res),
                error: error => showToast(StatusEnum.error, error.status, null, this.messageService, error)
            });
        } else {
            this.actionCorrectivePreventiveService.save(object).pipe(takeUntil(this.destroy$)).subscribe({
                next: res => this.onSuccess(res),
                error: error => showToast(StatusEnum.error, error.status, null, this.messageService, error)
            });
        }
    }

    onDelete(actionCorrectivePreventive: ActionCorrectivePreventive): void {
        this.actionCorrectivePreventiveService.delete(actionCorrectivePreventive.id).pipe(takeUntil(this.destroy$))
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
