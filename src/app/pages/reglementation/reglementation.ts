import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { showToast, StatusEnum } from '../../utils';
import { HttpResponse } from '@angular/common/http';
import { AppCrudGenericComponent } from '../../components/app-crud-generic/app-crud-generic.component';
import { ReglementationService } from '../../services/reglementation.service';
import { FormGroupColumn, TableColumn } from '../../models/generique.model';
import { Reglementation } from '../../models/reglementation.model';

@Component({
    selector: 'app-reglementation',
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
export class reglementationComponent {
    loading: boolean = true;
    destroy$: Subject<boolean> = new Subject<boolean>();
    dataList: Reglementation[] = [];
    closeDialog = false;
    formGroup: UntypedFormGroup;
    tableCols: TableColumn[];
    formCols: FormGroupColumn[];
    pageLabel = 'Réglementation';
    formHeader = 'Création et mise à jour d\'une réglementation';

    constructor(protected fb: UntypedFormBuilder,
                protected messageService: MessageService,
                protected reglementationService: ReglementationService) {
        this.formCols = [ 
            {field: 'id', label: "", header: 'Id', type: 'string', visible: false, required: false},
            {field: 'nomReglementation', label: "Nom de la règlémentation", header: 'Nom', type: 'string', visible: true, required: true},
            {field: 'organismeReglementation', label: "Organisme de règlémentation", header: 'Organisme', type: 'string', visible: true, required: true, },
            {field: 'descriptionReglementation', label: "Description de la règlémentation", header: 'Description', type: 'text', visible: true, required: false, },

        ];
        this.tableCols = [
            {field: 'nomReglementation', header: 'Nom', type: 'string', filter: true},
            {field: 'descriptionReglementation', header: 'Description', type: 'string', filter: true},
            {field: 'organismeReglementation', header: 'Organisme', type: 'string', filter: true},
            {field: 'createdAt', header: 'Date de création', type: 'string', filter: true},
            {field: 'updatedAt', header: 'Date de modification', type: 'string', filter: true},

        ];

        this.formGroup = this.fb.group({
            id: [null],
            nomReglementation: [null, Validators.required],
            descriptionReglementation: [null, Validators.required],
            organismeReglementation: [null, Validators.required],
        });
    }

    ngOnInit(): void {
        this.fetchReglementation();
    }

    fetchReglementation() {
        this.loading = true;
        this.reglementationService.findAll().pipe(takeUntil(this.destroy$))
            .subscribe({
                next: res => {
                    this.dataList = res.data.content || [];
                    this.loading = false;
                },
                error: error => {
                    showToast(StatusEnum.error, error.status, null, this.messageService, error);
                    this.loading = false;
                }
            });
    }

    onSuccess(res: HttpResponse<any>) {
        this.closeDialog = true;
        this.fetchReglementation();
        showToast(StatusEnum.success, res.status, null, this.messageService);
    }

    onSave(object: Reglementation) {
        if (object.id != null || undefined) {
            this.reglementationService.update(object).pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: res => {
                        this.onSuccess(res);
                    }, error: error => {
                        showToast(StatusEnum.error, error.status, null, this.messageService, error);
                    }
                });
        } else {
            this.reglementationService.save(object).pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: res => {
                        this.onSuccess(res);
                    }, error: error => {
                        showToast(StatusEnum.error, error.status, null, this.messageService, error);
                    }
                });
        }
    }

    onDelete(reglementation: Reglementation) {
        this.reglementationService.delete(reglementation.id).pipe(takeUntil(this.destroy$))
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