import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { CritereEvaluation, FormGroupColumn, Produit, TableColumn } from '../../models';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { showToast, StatusEnum } from '../../utils';
import { HttpResponse } from '@angular/common/http';
import { AppCrudGenericComponent } from '../../components/app-crud-generic/app-crud-generic.component';
import { CritereEvaluationService } from '../../services/critere-evaluation.service';

@Component({
    selector: 'app-critere-evaluation',
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
export class CritereEvaluationComponent {
    loading: boolean = true;
    destroy$: Subject<boolean> = new Subject<boolean>();
    dataList: CritereEvaluation[] = [];
    closeDialog = false;
    formGroup: UntypedFormGroup;
    tableCols: TableColumn[];
    formCols: FormGroupColumn[];
    pageLabel = 'Critères évaluations';
    formHeader = 'Création et mise à jour d\'une critère';

    constructor(protected fb: UntypedFormBuilder,
                protected messageService: MessageService,
                protected critereEvaluationService: CritereEvaluationService) {
        this.formCols = [ 
            {field: 'id', header: 'Id', label: "", type: 'number', visible: false, required: false},
            {field: 'libelleCrictereEvaluation', label: "Libellé du critère d'évaluation", header: 'Libellé', type: 'string', visible: true, required: true, },
            {field: 'descriptionCrictereEvaluation', label: "Description du critère d'évaluation", header: 'Description', type: 'text', visible: true, required: false},
            {field: 'noteAtribuerCritere', label: "Note attribuée", header: 'Note', type: 'string', visible: true, required: true},
            {field: 'delaisLivraison', label: "Délais de livraison", header: 'Délais de livraison', type: 'date', visible: true, required: true},
            {field: 'serviceClient', label: "Service client", header: 'Service client', type: 'string', visible: true, required: false},
            {field: 'commentaireEvaluation', label: "Commentaire de l'évaluation", header: 'Commentaire', type: 'text', visible: true, required: false}

        ];

        this.tableCols = [
            {field: 'libelleCrictereEvaluation', header: 'Libellé', type: 'string', filter: true},
            {field: 'descriptionCrictereEvaluation', header: 'Description', type: 'string', filter: true},
            {field: 'noteAtribuerCritere', header: 'Note', type: 'string', filter: true},
            {field: 'createdAt', header: 'Date de création', type: 'string', filter: true},
            {field: 'updatedAt', header: 'Date de modification', type: 'string', filter: true},

        ];

        this.formGroup = this.fb.group({
            id: [null],
            libelleCrictereEvaluation: [null, Validators.required],
          //  descriptionCrictereEvaluation: [null, Validators.required],
            noteAtribuerCritere: [null, Validators.required],
            delaisLivraison: [null, Validators.required],
            serviceClient: [null, Validators.required],
          //  commentaireEvaluation: [null, Validators.required],
        });
    }

    ngOnInit(): void {
        this.fetchcritereEvaluation();
    }

    fetchcritereEvaluation() {
        this.critereEvaluationService.findAll().pipe(takeUntil(this.destroy$))
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
        this.fetchcritereEvaluation();
        showToast(StatusEnum.success, res.status, null, this.messageService);
    }

    onSave(object: CritereEvaluation) {
        if (object.id != null || undefined) {
            this.critereEvaluationService.update(object).pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: res => {
                        this.onSuccess(res);
                    }, error: error => {
                        showToast(StatusEnum.error, error.status, null, this.messageService, error);
                    }
                });
        } else {
            this.critereEvaluationService.save(object).pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: res => {
                        this.onSuccess(res);
                    }, error: error => {
                        showToast(StatusEnum.error, error.status, null, this.messageService, error);
                    }
                });
        }
    }

    onDelete(critereEvaluation: CritereEvaluation) {
        this.critereEvaluationService.delete(critereEvaluation.id).pipe(takeUntil(this.destroy$))
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
