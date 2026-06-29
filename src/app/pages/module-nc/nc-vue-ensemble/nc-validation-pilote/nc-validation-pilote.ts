import { Component, Input, ViewChild } from '@angular/core';
import {MessageService} from "primeng/api";
import {HttpResponse} from "@angular/common/http";
import { CommonModule } from '@angular/common';
import { NgPrimeModule } from '../../../../../prime-ng.module';
import { showToast, StatusEnum } from '../../../../utils/global/global-utils';
import { FeaturesService } from '../../../../services/feature-service';
import { TraitementTableComponent } from '../../../../components/non-conformite/table-traitement/traitement-table';
import { EtapeTraitement } from '../../../../enums/enums';
import { Structure } from '../../../parametrages/structure/structure-config/structure';
import { FormRejetComponent } from '../../../../components/non-conformite/form-rejet/form-rejet';
import { NonConformiteService } from '../../../../services/non-conformite/non-conformite.service';

@Component({
    selector: 'app-nc-validation-pilote',
    templateUrl: './nc-validation-pilote.html',
    providers: [MessageService],
    standalone: true,
    imports: [CommonModule, NgPrimeModule, TraitementTableComponent, FormRejetComponent]
})
export class ValidationPiloteComponent {
    @Input() demandeList: any[] = [];
    motifRejetDialog: boolean=false;
    protected demande: any;
    loading: boolean = false;
    title = 'Validations des non-conformités';
    @ViewChild(TraitementTableComponent) dmdTraitement!: TraitementTableComponent;
    user!: any;
    protected readonly BtnActions = EtapeTraitement;
    userStructure: Structure = {};
    cols: any[] = [];
    constructor(
        protected messageService: MessageService,
        private nonConformiteService: NonConformiteService,
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
    ngOnInit() {
    }
    onSuccess(res: HttpResponse<any>) {
        showToast(StatusEnum.success, res.status, null, this.messageService);
    }
    validation(demandes: any) {
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

        this.nonConformiteService.nonConformiteUpdate(cleanedDemandes).subscribe({
            next: (data) => {
               this.featureService.onReloadRequested(true);
                this.dmdTraitement.closeDetailsDialog();
                this.messageService.add({ severity: 'success', summary: 'Succès', detail: "L'oppération à réussie !", life: 3000 });
            },
            error: (error) => {
                this.messageService.add({ severity: 'error', summary: 'Erreur', detail: "L'oppération à échouée ! Veuillez réessayer", life: 3000 });
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
