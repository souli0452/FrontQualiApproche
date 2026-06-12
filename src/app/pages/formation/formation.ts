import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { Formation, FormGroupColumn, TableColumn } from '../../models';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { FormationService } from '../../services/formation.service';
import { showToast, StatusEnum } from '../../utils';
import { HttpResponse } from '@angular/common/http';
import { AppCrudGenericComponent } from '../../components/app-crud-generic/app-crud-generic.component';

@Component({
    selector: 'app-formation',
    standalone: true,
    imports: [CommonModule, AppCrudGenericComponent],
    template: `
        <div class="page-layout">
            <app-crud-generic
                [dialogWidth]="'50rem'"
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
export class FormationComponent {

loading: boolean = true;
    destroy$: Subject<boolean> = new Subject<boolean>();
    dataList: Formation[] = [];
    closeDialog = false;
    formGroup: UntypedFormGroup;
    tableCols: TableColumn[];
    formCols: FormGroupColumn[];
    pageLabel = 'Formations';
    formHeader = 'Création et mise à jour d\'une formation';

    constructor(protected fb: UntypedFormBuilder,
                protected messageService: MessageService,
                protected formationService: FormationService) {
        this.formCols = [
            {field: 'id', label: "", header: 'Id', type: 'number', visible: false, required: false},
            {field: 'libelle', label: "Libellé de la formation", header: 'Libellé', type: 'string', visible: true, required: true},
            {field: 'description', label: "Description de la formation", header: 'Description', type: 'text', visible: true, required: true},
            {field: 'objectif', label: "Objectifs de la formation", header: 'Objectif', type: 'string', visible: true, required: true},
            {field: 'prerequis', label: "Quels sont les pré-réquis", header: 'Prérequis', type: 'string', visible: true, required: true},
            {field: 'competence', label: "Compétences attendues", header: 'Compétence', type: 'string', visible: true, required: true},
           // {field: 'statut', header: 'Statut', type: 'dropdown', visible: true, required: false},



        ];

        this.tableCols = [
            {field: 'libelle', header: 'Libellé', type: 'string', filter: true},
            {field: 'description', header: 'Description', type: 'string', filter: true},
            {field: 'objectif', header: 'Objectif', type: 'string', filter: true},
            {field: 'prerequis', header: 'Prérequis', type: 'string', filter: true},
            {field: 'competence', header: 'Compétence', type: 'string', filter: true},
            {field: 'statut', header: 'Statut', type: 'enum', filter: true},
            // {field: 'createdAt', header: 'Date de création', type: 'string', filter: true},
            // {field: 'updatedAt', header: 'Date de modification', type: 'string', filter: true},
        ];

        this.formGroup = this.fb.group({
            id: [null],
            libelle: [null, Validators.required],
            description: [],
            objectif: [null, Validators.required],
            prerequis: [null, Validators.required],
            competence: [null, Validators.required],
        });
    }

    ngOnInit(): void {
        this.fetchFormation();
    }

    fetchFormation() {  
        this.loading = true;
        this.formationService.findAll().pipe(takeUntil(this.destroy$))
            .subscribe({
                next: res => {
                    this.dataList = res.data.content || [];
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
        this.fetchFormation();
        showToast(StatusEnum.success, res.status, null, this.messageService);
    }

    onSave(object: Formation) {
        if (object.id != null || undefined) {
            this.formationService.update(object).pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: res => {
                        this.onSuccess(res);
                    }, error: error => {
                        showToast(StatusEnum.error, error.status, null, this.messageService, error);
                    }
                });
        } else {
            this.formationService.save(object).pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: res => {
                        this.onSuccess(res);
                    }, error: error => {
                        showToast(StatusEnum.error, error.status, null, this.messageService, error);
                    }
                });
        }
    }

    onDelete(formation: Formation) {
        this.formationService.delete(formation.id!).pipe(takeUntil(this.destroy$))
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

