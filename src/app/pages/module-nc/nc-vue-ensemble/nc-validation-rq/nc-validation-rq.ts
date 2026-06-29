import { Component, Input, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MessageService } from 'primeng/api';
import { HttpResponse } from '@angular/common/http';
import { TraitementTableComponent } from '../../../../components/non-conformite/table-traitement/traitement-table';
import { NgPrimeModule } from '../../../../../prime-ng.module';
import { EtapeTraitement } from '../../../../enums/enums';
import { showToast, StatusEnum } from '../../../../utils/global/global-utils';
import { FeaturesService } from '../../../../services/feature-service';
import { ProcNonConformiteService } from '../../../../services/non-conformite/proc-non-conformite.service';
import { NCRejetComponent } from '../../nc-rejet/nc-rejet';
import { Router } from '@angular/router';

@Component({
    selector: 'app-nc-validation-rq',
    standalone: true,
    imports: [CommonModule, NgPrimeModule, TraitementTableComponent, NCRejetComponent],
    providers: [MessageService],
    templateUrl: './nc-validation-rq.html'
})
export class ValidationRQComponent {
    @Input() demandeList: any = [];
    protected demande: any;
    motifRejetDialog: boolean=false;
    loading: boolean = false;
    title = 'Validations des non-conformités';
    @ViewChild(TraitementTableComponent) dmdTraitement!: TraitementTableComponent;

    protected readonly BtnActions = EtapeTraitement;
    cols: any[] = [];
    constructor(
        protected messageService: MessageService,
        private service: ProcNonConformiteService,
        private  featureService:FeaturesService,
        private router: Router
    ) {
        this.cols = [
            { field: 'numeroReference', header: 'N° Ref', type: 'string', filter: true, width: '220px', centered: false },
            { field: 'structureSoumissionLibelle', header: 'Processus Emetteur', type: 'string', filter: true, width: '200px', centered: true },
            { field: 'niveauNonConformiteLibelle', header: 'Gravité', type: 'badge', filter: false, width: '150px', centered: false },
            { field: 'createdAt', header: 'Date soumission', type: 'date', filter: true, width: '150px', centered: false }
        ];
    }
    ngOnInit() {
    }

    onSuccess(res: HttpResponse<any>) {
        showToast(StatusEnum.success, res.status, null, this.messageService);
    }
    validationRs(demandes: any) {
        const clean = (val: any) => (val === '' ? null : val);
        const cleanedDemandes = demandes.map((demande: any) => {
            const { btnActions, ...demandeRest } = demande;
            const actions = demandeRest.planActions || [];
            const cleanedActions = actions.map(({ responsable, dateEcheance, ...rest }: any) => ({
                ...rest,
                dateEcheance: dateEcheance?.replace(/\//g, "-")
            }));

            return {
                ...demandeRest,
                pertinanceRs: clean(demandeRest.pertinanceRs),
                justificationRs: clean(demandeRest.justificationRs),
                pertinancePilote: clean(demandeRest.pertinancePilote),
                justificationPilote: clean(demandeRest.justificationPilote),
                pertinanceRsSuivi: clean(demandeRest.pertinanceRsSuivi),
                numeroFdac: clean(demandeRest.numeroFdac),
                circuit: clean(demandeRest.circuit),
                actionId: clean(demandeRest.actionId),
                origineId: clean(demandeRest.origineId),
                fonctionEmetteur: clean(demandeRest.fonctionEmetteur),
                planActions: cleanedActions
            };
        });

        console.log("PAYLOAD VALIDATION RQ: ", cleanedDemandes);

        this.service.updateNomConformites(cleanedDemandes).subscribe({
            next: (data) => {
               this.featureService.onReloadRequested(true);
                this.dmdTraitement.closeDetailsDialog();
                this.router.navigate(['/non-conformite/vue-ensemble']);
                this.messageService.add({ severity: 'success', summary: 'Succès', detail: "L'oppération à réussie !", life: 5000 });
            },
            error: (error) => {
                this.messageService.add({ severity: 'error', summary: 'Erreur', detail: "L'oppération à échouée ! Veuillez réessayer 16", life: 5000 });
                this.dmdTraitement.closeDetailsDialog();
                console.log("ERREUR LORS DE LA VALIDATION", error);
                
            }
        });
    }

    cloture(demandes: any) {
        const clean = (val: any) => (val === '' ? null : val);
        const demandesArray = Array.isArray(demandes) ? demandes : [demandes];
        const cleanedDemandes = demandesArray.map((demande: any) => {
            const { btnActions, ...demandeRest } = demande;
            const actions = demandeRest.planActions || [];
            const cleanedActions = actions.map(({ responsable, dateEcheance, ...rest }: any) => ({
                ...rest,
                dateEcheance: typeof dateEcheance === 'string' ? dateEcheance.replace(/\//g, "-") : dateEcheance
            }));

            return {
                ...demandeRest,
                pertinanceRs: clean(demandeRest.pertinanceRs),
                justificationRs: clean(demandeRest.justificationRs),
                pertinancePilote: clean(demandeRest.pertinancePilote),
                justificationPilote: clean(demandeRest.justificationPilote),
                pertinanceRsSuivi: clean(demandeRest.pertinanceRsSuivi),
                numeroFdac: clean(demandeRest.numeroFdac),
                circuit: clean(demandeRest.circuit),
                actionId: clean(demandeRest.actionId),
                origineId: clean(demandeRest.origineId),
                fonctionEmetteur: clean(demandeRest.fonctionEmetteur),
                planActions: cleanedActions
            };
        });

        console.log("PAYLOAD CLOTURE RQ: ", cleanedDemandes);

        this.service.updateNomConformites(cleanedDemandes).subscribe({
            next: (data) => {
                this.featureService.onReloadRequested(true);
                this.router.navigate(['/non-conformite/vue-ensemble']);
                this.dmdTraitement.closeDetailsDialog();
                this.messageService.add({ severity: 'success', summary: 'Succès', detail: "Clôture de la Non-Conformité réussie", life: 5000 });
            },
            error: (error) => {
                this.messageService.add({ severity: 'error', summary: 'ERREUR', detail: "La clôture a échoué ! Veuillez réessayer.", life: 5000 });
                this.dmdTraitement.closeDetailsDialog();
                console.log("ERREUR LORS DE LA CLOTURE", error);
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
