import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgPrimeModule } from '../../../../prime-ng.module';
import {
    DmdTraitementTableTemplateComponent
} from '../../../components/dmd.traitement-table-template/dmd.traitement-table-template.component';
import { EtapeTraitement } from '../../../enums';
import { MessageService } from 'primeng/api';
import { ProcNonConformiteService } from '../proc-non-conformite.service';
import { HttpResponse } from '@angular/common/http';
import { getCurrentUserStructure, showToast, StatusEnum } from '../../../utils';
import { RejetFormsComponent } from '../forms/rejet.forms/rejet.forms.component';
import { Structure } from '../../structure/structure-config/structure';

@Component({
    selector: 'app-imputation',
    imports: [CommonModule, NgPrimeModule, DmdTraitementTableTemplateComponent, RejetFormsComponent],
    providers: [MessageService],
    templateUrl: './imputation.component.html',
    styleUrl: './imputation.component.scss'
})
export class ImputationComponent {
    demandeList: any = [];
    protected demande: any;
    motifRejetDialog: boolean=false;
    loading: boolean = false;
    title = 'Imputations des non-conformités';
    @ViewChild(DmdTraitementTableTemplateComponent) dmdTraitement!: DmdTraitementTableTemplateComponent;
    userStructure: Structure = {};
    protected readonly BtnActions = EtapeTraitement;
    cols: any[] = [];
    constructor(
        protected messageService: MessageService,
        private service: ProcNonConformiteService
    ) {
        this.cols = [
            { field: 'numeroReference', header: 'N° ordre', type: 'string', filter: true, width: '10%', centered: false },
            { field: 'origineService', header: 'Nom processus', type: 'string', filter: true, width: '30%', centered: false },
            {
                field: 'currentUserfullName',
                header: 'Responsable',
                type: 'string',
                filter: true,
                width: '20%',
                centered: false
            },
            { field: 'status', header: 'Statut', type: 'enum', filter: true, width: '15%', centered: false },
            { field: 'createdAt', header: 'Date soumission', type: 'string', filter: true, width: '15%', centered: false }
        ];
    }
    ngOnInit() {
        this.userStructure = getCurrentUserStructure();
        this.getDemandeList();
    }
    getDemandeList() {
        this.loading = true;
        this.service.getNonConformiteByEtapeAndOrigin(EtapeTraitement.IMPUTATION, this.userStructure.id!).subscribe({
            next: (data) => {
                this.demandeList = data.body;
                this.loading = false;
            },
            error: (error) => {
                this.loading = false;
                // showToast(handleHttpErrors(error, 'error', 'Récupération', 'demandeKey'), this.messageService)
            }
        });
    }
    onSuccess(res: HttpResponse<any>) {
        showToast(StatusEnum.success, res.status, null, this.messageService);
    }
    imputation(selectedDemandes: any) {
        this.service.updateNomConformites(selectedDemandes).subscribe({
            next: (data) => {
                this.getDemandeList();
                this.messageService.add({ severity: 'success', summary: 'Réussi', detail: 'Demandes imputées avec succès', life: 3000 });
                this.dmdTraitement.closeDetailsDialog();
            },
            error: () => {
                this.messageService.add({ severity: 'error', summary: 'ERREUR', detail: "L'oppération à échouée ! Veuillez réessayer", life: 3000 });
            }
        });
    }
    hideDialog(event: any) {
        if (event) {
            this.dmdTraitement.displayDetails();
            this.getDemandeList();
        }
    }
    rejet(demande: any) {
        this.demande = demande;
        this.motifRejetDialog = true;
    }
}
