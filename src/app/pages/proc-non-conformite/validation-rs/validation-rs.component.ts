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
import { showToast, StatusEnum } from '../../../utils';
import { RejetFormsComponent } from '../forms/rejet.forms/rejet.forms.component';

@Component({
    selector: 'app-validation-rs',
    standalone: true,
    imports: [CommonModule, NgPrimeModule, DmdTraitementTableTemplateComponent, RejetFormsComponent],
    providers: [MessageService],
    templateUrl: './validation-rs.component.html',
    styleUrl: './validation-rs.component.scss'
})
export class ValidationRSComponent {
    demandeList: any = [];
    protected demande: any;
    motifRejetDialog: boolean=false;
    title = 'Validations des non-conformités';
    @ViewChild(DmdTraitementTableTemplateComponent) dmdTraitement!: DmdTraitementTableTemplateComponent;

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
        this.getDemandeList();
    }
    getDemandeList() {
        this.service.getNonConformiteByEtape(EtapeTraitement.VALIDATION_RS).subscribe({
            next: (data) => {
                this.demandeList = data.body;
            },
            error: (error) => {
                // showToast(handleHttpErrors(error, 'error', 'Récupération', 'demandeKey'), this.messageService)
            }
        });
    }
    onSuccess(res: HttpResponse<any>) {
        showToast(StatusEnum.success, res.status, null, this.messageService);
    }
    validationRs(demandes: any) {
        const cleanedDemandes = demandes.map((demande: { planActions: { [x: string]: any; responsable: any; dateEcheance: string }[] }) => {
            const cleanedActions = demande.planActions.map(({ responsable, dateEcheance, ...rest }) => ({
                ...rest,
                dateEcheance: dateEcheance?.replace(/\//g, "-")
            }));

            return {
                ...demande,
                planActions: cleanedActions
            };
        });

        this.service.updateNomConformites(cleanedDemandes).subscribe({
            next: (data) => {
                this.getDemandeList();
                this.dmdTraitement.closeDetailsDialog();
                this.messageService.add({ severity: 'success', summary: 'REUSSI', detail: "L'oppération à réussie !", life: 3000 });
            },
            error: (error) => {
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
