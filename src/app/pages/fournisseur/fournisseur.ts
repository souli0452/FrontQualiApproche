import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { Formation, FormGroupColumn, Fournisseur, TableColumn } from '../../models';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { FormationService } from '../../services/formation.service';
import { showToast, StatusEnum } from '../../utils';
import { HttpResponse } from '@angular/common/http';
import { AppCrudGenericComponent } from '../../components/app-crud-generic/app-crud-generic.component';
import { FournisseurService } from '../../services/fournisseur.service';

@Component({
    selector: 'app-fournisseur',
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
export class FournisseurComponent {
    loading: boolean = true;
    destroy$: Subject<boolean> = new Subject<boolean>();
    dataList: Fournisseur[] = [];
    closeDialog = false;
    formGroup: UntypedFormGroup;
    tableCols: TableColumn[];
    formCols: FormGroupColumn[];
    pageLabel = 'Liste des fournisseurs';
    formHeader = 'Création et mise à jour d\'un fournisseur';


     constructor(protected fb: UntypedFormBuilder,
                    protected messageService: MessageService,
                    protected fournisseurService: FournisseurService) {
            this.formCols = [
                {field: 'id', label: "", header: 'Id', type: 'number', visible: false, required: false},
                {field: 'nom', label: "Nom du fournisseur", header: 'Nom complet', type: 'string', visible: true, required: true},
                {field: 'telephone', label: "Numéro de téléphone du fournisseur", header: 'Téléphone', type: 'string', visible: true, required: true},
                {field: 'adresse', label: "Adresse du fournisseur", header: 'Adresse', type: 'string', visible: true, required: true},
                {field: 'email', label: "Email du fournisseur", header: 'Email', type: 'string', visible: true, required: true},
                {field: 'siteWeb', label: "Site web du fournisseur", header: 'Site web', type: 'string', visible: true, required: false},
                {field: 'contactPrincipal', label: "Contact principal du fournisseur", header: 'Contact principal', type: 'string', visible: true, required: false}
            ];
    
            this.tableCols = [
                {field: 'nom', header: 'Nom complet', type: 'string', filter: true},
                {field: 'telephone', header: 'Téléphone', type: 'string', filter: true},
                {field: 'adresse', header: 'Adresse', type: 'string', filter: true},
                {field: 'email', header: 'Email', type: 'string', filter: true},

            ];
    
            this.formGroup = this.fb.group({
                id: [null],
                nom: [null, Validators.required],
                telephone: [null, Validators.required],
                adresse: [null, Validators.required],
                email: [null, Validators.required],
                siteWeb: [null, Validators.required],
                contactPrincipal: [null, Validators.required],

            });
        }
    
        ngOnInit(): void {
            this.fetchFournisseur();
        }
    
        fetchFournisseur() { 
            this.loading = true;
            this.fournisseurService.findAll().pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: res => {
                        this.dataList = res.data.content || [];
                        this.loading = false;
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
            this.fetchFournisseur();
            showToast(StatusEnum.success, res.status, null, this.messageService);
        }
    
        onSave(object: Fournisseur) {
            if (object.id != null || undefined) {
                this.fournisseurService.update(object).pipe(takeUntil(this.destroy$))
                    .subscribe({
                        next: res => {
                            this.onSuccess(res);
                        }, error: error => {
                            showToast(StatusEnum.error, error.status, null, this.messageService, error);
                        }
                    });
            } else {
                this.fournisseurService.save(object).pipe(takeUntil(this.destroy$))
                    .subscribe({
                        next: res => {
                            this.onSuccess(res);
                        }, error: error => {
                            showToast(StatusEnum.error, error.status, null, this.messageService, error);
                        }
                    });
            }
        }
    
        onDelete(fournisseur: Fournisseur) {
            this.fournisseurService.delete(fournisseur.id).pipe(takeUntil(this.destroy$))
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
