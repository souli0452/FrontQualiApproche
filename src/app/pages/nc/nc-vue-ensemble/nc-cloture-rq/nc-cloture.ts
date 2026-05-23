import { Component, Input, ViewChild } from '@angular/core';
import { MessageService } from "primeng/api";
import { HttpResponse } from "@angular/common/http";
import { TraitementTableComponent } from '../../../../components/non-conformite/table-traitement/traitement-table';
import { EtapeTraitement } from '../../../../enums';
import { ProcNonConformiteService } from '../../../proc-non-conformite/proc-non-conformite.service';
import { CommonModule } from '@angular/common';
import { NgPrimeModule } from '../../../../../prime-ng.module';
import { RejetFormsComponent } from '../../../proc-non-conformite/forms/rejet.forms/rejet.forms.component';
import { showToast, StatusEnum } from '../../../../utils';
import { FeaturesService } from '../../../../services/feature-service';

@Component({
    selector: 'app-nc-cloture',
    templateUrl: './nc-cloture.html',
    standalone: true,
    providers: [MessageService],
    imports: [CommonModule, NgPrimeModule, TraitementTableComponent, RejetFormsComponent]
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
    // getDemandeList() {
    //     this.loading = true;
    //     this.service.getNonConformiteByEtape(EtapeTraitement.SUIVI_RQ).subscribe({
    //         next: (data) => {
    //             this.demandeList = data.body;
    //             this.loading = false;
    //         },
    //         error: (error) => {
    //             this.loading = false;
    //             //showToastDm(handleHttpErrors(error, 'error', 'Récupération', 'demandeKey'), this.messageService)
    //         }
    //     });
    // }
    onSuccess(res: HttpResponse<any>) {
        // this.getDemandeList();
        this.featureService.onReloadRequested(true);
        showToast(StatusEnum.success, res.status, null, this.messageService);
        this.messageService.add({ severity: 'success', summary: 'REUSSI', detail: "L'oppération à réussie", life: 3000 });
        this.dmdTraitement.closeDetailsDialog();
    }

    cloture(demandes: any) {
        const cleanedDemandes = demandes.map((demande: any) => {
            if (demande.planActions && Array.isArray(demande.planActions)) {
                const cleanedActions = demande.planActions.map((action: any) => {
                    const { responsable, dateEcheance, ...rest } = action;
                    return {
                        ...rest,
                        dateEcheance: dateEcheance?.replace(/\//g, "-")
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
