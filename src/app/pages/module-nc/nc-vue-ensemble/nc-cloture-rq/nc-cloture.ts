import { Component, Input, ViewChild } from '@angular/core';
import { MessageService } from "primeng/api";
import { HttpResponse } from "@angular/common/http";
import { TraitementTableComponent } from '../../../../components/non-conformite/table-traitement/traitement-table';
import { EtapeTraitement } from '../../../../enums/enums';
import { CommonModule } from '@angular/common';
import { NgPrimeModule } from '../../../../../prime-ng.module';
import { showToast, StatusEnum } from '../../../../utils/global/global-utils';
import { FeaturesService } from '../../../../services/feature-service';
import { ProcNonConformiteService } from '../../../../services/non-conformite/proc-non-conformite.service';
import { NCRejetComponent } from '../../nc-rejet/nc-rejet';

@Component({
    selector: 'app-nc-cloture',
    templateUrl: './nc-cloture.html',
    standalone: true,
    providers: [MessageService],
    imports: [CommonModule, NgPrimeModule, TraitementTableComponent, NCRejetComponent]
})
export class NcClotureComponent {
    @Input() demandeList: any = [];

    cols: any[] = [];
    protected demande: any;
    motifRejetDialog: boolean = false;
    loading: boolean = false;
    title = 'Suivi des non-conformités';
    constructor(
        protected messageService: MessageService,
        private service: ProcNonConformiteService,
        private  featureService:FeaturesService,
    ) {
        this.cols = [
            { field: 'numeroReference', header: 'N° ref', type: 'string', filter: true, width: '220px', centered: false },
            { field: 'structureSoumissionLibelle', header: 'Processus Emetteur', type: 'string', filter: true, width: '300px', centered: false },
            {
                field: 'currentUserfullName',
                header: 'Initateur',
                type: 'string',
                filter: true,
                width: '150px',
                centered: false
            },
            { field: 'niveauNonConformiteLibelle', header: 'Gravité', type: 'badge', filter: false, width: '150px', centered: false },
            { field: 'createdAt', header: 'Date soumission', type: 'date', filter: true, width: '150px', centered: false }
        ];
    }
    @ViewChild(TraitementTableComponent) dmdTraitement!: TraitementTableComponent;

    protected readonly BtnActions = EtapeTraitement;
    ngOnInit() {
        // this.getDemandeList();
    }
    
    onSuccess(res: HttpResponse<any>) {
        // this.getDemandeList();
        this.featureService.onReloadRequested(true);
        showToast(StatusEnum.success, res.status, null, this.messageService);
        this.messageService.add({ severity: 'success', summary: 'Succès', detail: "Clôture de la Non-Conformité réussie", life: 5000 });
        this.dmdTraitement.closeDetailsDialog();
    }

    cloture(demandes: any) {
        const demandesArray = Array.isArray(demandes) ? demandes : [demandes];
        const cleanedDemandes = demandesArray.map((demande: any) => {
            if (demande.planActions && Array.isArray(demande.planActions)) {
                const cleanedActions = demande.planActions.map((action: any) => {
                    const { responsable, dateEcheance, ...rest } = action;
                    return {
                        ...rest,
                        dateEcheance: typeof dateEcheance === 'string' ? dateEcheance.replace(/\//g, "-") : dateEcheance
                    };
                });
                return {
                    ...demande,
                    planActions: cleanedActions
                };
            }
            return demande;
        });

        this.service.updateNomConformites(cleanedDemandes).subscribe({
            next: (data) => {
                this.onSuccess(data);
            },
            error: (error) => {
                this.messageService.add({ severity: 'error', summary: 'ERREUR', detail: "L'oppération a échoué ! Veuillez réessayer", life: 3000 });
            }
        });
    }
    hideDialog(event: any) {
        if (event) {
            this.dmdTraitement.displayDetails();
            this.featureService.onReloadRequested(true);
        }
    }
    rejet(demande: any) {
        this.demande = demande;
        this.motifRejetDialog = true;
    }
}
