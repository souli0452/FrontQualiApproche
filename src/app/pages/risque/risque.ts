import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { NgPrimeModule } from '@prime-ng';
import { HeaderPage } from '@shared/header-page/header-page';
import { showToast, StatusEnum } from '../../utils/global/global-utils';
import { FormGroupColumn, TableColumn } from '../../models/generique.model';
import { Risque } from '../../models/risque.model';
import { RisqueService } from './risque.service';
import { AppCrudGenericComponent } from '@shared/app-crud-generic/app-crud-generic.component';

@Component({
    selector: 'app-risque',
    standalone: true,
    imports: [CommonModule, NgPrimeModule, HeaderPage, AppCrudGenericComponent],
    template: `
        <p-toast></p-toast>
        <div class="card-first overflow-x-clip border-none premium-hub transition-colors duration-300">
            <app-header-page
                [title]="pageLabel"
                subtitle="Recensement, évaluation et suivi des plans d'atténuation des risques qualité"
                [breadcrumbs]="breadcrumbs"
            />
            <app-crud-generic
                [dialogWidth]="'50rem'"
                [pageLabel]="pageLabel"
                [addButtonLabel]="'Nouveau risque'"
                [formLongDescription]="formLongDescription"
                [detailLongDescription]="detailLongDescription"
                [tableCols]="tableCols"
                [loading]="loading"
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
export class RisqueComponent implements OnInit, OnDestroy {
    loading: boolean = true;
    destroy$: Subject<boolean> = new Subject<boolean>();
    dataList: Risque[] = [];
    closeDialog = false;
    pageSize = 10;
    currentPage = 0;
    formGroup: UntypedFormGroup;
    tableCols: TableColumn[];
    formCols: FormGroupColumn[];
    pageLabel = 'Gestion des risques';
    formHeader = 'Création et mise à jour d\'un risque';
    formLongDescription = 'Renseignez les caractéristiques du risque identifié, son niveau de criticité ainsi que le plan d\'atténuation prévu.';
    detailLongDescription = 'Consultez ci-dessous la fiche complète du risque, son statut actuel et les éléments de preuve associés.';

    breadcrumbs = [
        { label: 'Tableau de bord', routerLink: '/' },
        { label: 'Risques', routerLink: '' }
    ];

    constructor(
        protected fb: UntypedFormBuilder,
        protected messageService: MessageService,
        protected risqueService: RisqueService
    ) {
        this.formCols = [
            { field: 'id', label: '', header: 'Id', type: 'number', visible: false, required: false },
            { field: 'libelle', label: 'Libellé du risque', header: 'Libellé', type: 'string', visible: true, required: true },
            { field: 'description', label: 'Description du risque', header: 'Description', type: 'text', visible: true, required: false },
            { field: 'niveau', label: 'Niveau du risque', header: 'Niveau', type: 'string', visible: true, required: true },
            { field: 'statut', label: 'Statut', header: 'Statut', type: 'string', visible: true, required: true },
            { field: 'plantAttenuation', label: 'Mesures prévues pour maîtriser le risque', header: 'Plan d\'atténuation', type: 'string', visible: true, required: true },
            { field: 'commentaireRisque', label: 'Commentaire', header: 'Commentaire', type: 'text', visible: true, required: false },
            { field: 'evidenceRisque', label: 'Éléments justificatifs', header: 'Preuve / Évidence', type: 'string', visible: true, required: true }
        ];
        this.tableCols = [
            { field: 'libelle', header: 'Libellé', type: 'string', filter: true },
            { field: 'description', header: 'Description', type: 'string', filter: true },
            { field: 'niveau', header: 'Niveau', type: 'string', filter: true },
            { field: 'statut', header: 'Statut', type: 'string', filter: true }
        ];

        this.formGroup = this.fb.group({
            id: [null],
            libelle: [null, Validators.required],
            description: [null],
            niveau: [null, Validators.required],
            statut: [null, Validators.required],
            plantAttenuation: [null, Validators.required],
            dateEcheance: [null],
            commentaireRisque: [null],
            evidenceRisque: [null, Validators.required]
        });
    }

    ngOnInit(): void {
        this.fetchRisque();
    }

    onPageChange(event: { page: number; size: number }): void {
        this.currentPage = event.page ?? 0;
        this.pageSize = event.size ?? this.pageSize;
    }

    fetchRisque(): void {
        this.loading = true;
        this.risqueService.findAll().pipe(takeUntil(this.destroy$))
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
        this.fetchRisque();
        showToast(StatusEnum.success, res?.statusCode ?? res?.status ?? 200, null, this.messageService);
    }

    onSave(object: Risque): void {
        if (object.id != null) {
            this.risqueService.update(object).pipe(takeUntil(this.destroy$)).subscribe({
                next: res => this.onSuccess(res),
                error: error => showToast(StatusEnum.error, error.status, null, this.messageService, error)
            });
        } else {
            this.risqueService.save(object).pipe(takeUntil(this.destroy$)).subscribe({
                next: res => this.onSuccess(res),
                error: error => showToast(StatusEnum.error, error.status, null, this.messageService, error)
            });
        }
    }

    onDelete(risque: Risque): void {
        this.risqueService.delete(risque.id).pipe(takeUntil(this.destroy$))
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
