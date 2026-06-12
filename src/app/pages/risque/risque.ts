import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { FormGroupColumn, Produit, Reclamation, Risque, TableColumn } from '../../models';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { showToast, StatusEnum } from '../../utils';
import { HttpResponse } from '@angular/common/http';
import { AppCrudGenericComponent } from '../../components/app-crud-generic/app-crud-generic.component';
import { ReclamationService } from '../../services/reclamation.service';
import { RisqueService } from '../../services/risque.service';

@Component({
    selector: 'app-risque',
    standalone: true,
    imports: [CommonModule, AppCrudGenericComponent],
    template: `
        <div class="page-layout">
            <app-crud-generic
                [dialogWidth]="'50rem'"
                [pageLabel]="pageLabel"
                [tableCols]="tableCols" 
                [loading]="loading"
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
export class RisqueComponent {
    loading: boolean = true;
    destroy$: Subject<boolean> = new Subject<boolean>();
    dataList: Risque[] = [];
    closeDialog = false;
    formGroup: UntypedFormGroup;
    tableCols: TableColumn[];
    formCols: FormGroupColumn[];
    pageLabel = 'Risques';
    formHeader = 'Création et mise à jour d\'un risque';

    constructor(protected fb: UntypedFormBuilder,
                protected messageService: MessageService, 
                protected risqueService: RisqueService) {
        this.formCols = [ 
            {field: 'id', label: "", header: 'Id', type: 'number', visible: false, required: false},
            {field: 'libelle', label: "Libellé du risque", header: 'Libelle', type: 'string', visible: true, required: true},
            {field: 'description', label: "Description du risque", header: 'Description', type: 'text', visible: true, required: false, },
            {field: 'niveau', label: "Niveau du risque", header: 'Niveau', type: 'string', visible: true, required: true, },
            {field: 'statut', label: "Statut", header: 'Statut', type: 'string', visible: true, required: true, },
            {field: 'plantAttenuation', label: "", header: 'Plant attenuation', type: 'string', visible: true, required: true, },
            {field: 'commentaireRisque', label: "Commentaire", header: 'Commentaire', type: 'text', visible: true, required: false, },
            {field: 'evidenceRisque', label: "", header: 'Evidence', type: 'string', visible: true, required: true, },
          //  {field: 'actionCorrectivePreventives', header: 'Actions', type: 'dropdown', visible: true, required: false, },
          
        ];
        this.tableCols = [
            {field: 'libelle', header: 'Libelle', type: 'string', filter: true},
            {field: 'description', header: 'Description', type: 'string', filter: true},
            {field: 'niveau', header: 'Niveau', type: 'string', filter: true},
            {field: 'statut', header: 'Statut', type: 'string', filter: true},

        ];

        this.formGroup = this.fb.group({
            id: [null],
            libelle: [null, Validators.required],
            description: [null, Validators.required],
            niveau: [null, Validators.required],
            statut: [null, Validators.required],
            plantAttenuation: [null, Validators.required],
            dateEcheance: [null, Validators.required],
            commentaireRisque: [null, Validators.required],
            evidenceRisque: [null, Validators.required],
          //  actionCorrectivePreventives: [null, Validators.required],
        });
    }

    ngOnInit(): void {
        this.fetchRisque();
    }

    fetchRisque() {  
        this.loading = true;
        this.risqueService.findAll().pipe(takeUntil(this.destroy$))
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
        this.fetchRisque();
        showToast(StatusEnum.success, res.status, null, this.messageService);
    }

    onSave(object: Risque) {
        if (object.id != null || undefined) {
            this.risqueService.update(object).pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: res => {
                        this.onSuccess(res);
                    }, error: error => {
                        showToast(StatusEnum.error, error.status, null, this.messageService, error);
                    }
                });
        } else {
            this.risqueService.save(object).pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: res => {
                        this.onSuccess(res);
                    }, error: error => {
                        showToast(StatusEnum.error, error.status, null, this.messageService, error);
                    }
                });
        }
    }

    onDelete(risque: Risque) {
        this.risqueService.delete(risque.id).pipe(takeUntil(this.destroy$))
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
