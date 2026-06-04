import { Component, Input, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MessageService } from 'primeng/api';
import { HttpResponse } from '@angular/common/http';
import { TraitementTableComponent } from '../../../../components/non-conformite/table-traitement/traitement-table';
import { NgPrimeModule } from '../../../../../prime-ng.module';
import { EtapeTraitement } from '../../../../enums';
import { showToast, StatusEnum } from '../../../../utils';
import { FeaturesService } from '../../../../services/feature-service';
import { FormRejetComponent } from '../../../../components/non-conformite/form-rejet/form-rejet';
import { Structure } from '../../../parametrages/structure/structure-config/structure';
import { ProcNonConformiteService } from '../../../../services/non-conformite/proc-non-conformite.service';
import { Router } from '@angular/router';

@Component({
    selector: 'app-nc-affectation',
    imports: [CommonModule, NgPrimeModule, TraitementTableComponent, FormRejetComponent],
    providers: [MessageService],
    templateUrl: './nc-affectation.html'
})
export class NcAffectationComponent {
     @Input() demandeList: any = [];
    protected demande: any;
    motifRejetDialog: boolean=false;
    loading: boolean = false;
    title = 'Affectations des non-conformités';
    @ViewChild(TraitementTableComponent) dmdTraitement!: TraitementTableComponent;
    userStructure: Structure = {};
    protected readonly BtnActions = EtapeTraitement;
    cols: any[] = [];
    constructor(
        protected messageService: MessageService,
        private service: ProcNonConformiteService,
        private  featureService:FeaturesService,
        private router: Router
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
        // this.userStructure = getCurrentUserStructure();
        // this.getDemandeList();
    }
    // getDemandeList() {
    //     this.loading = true;
    //     this.service.getNonConformiteByEtapeAndOrigin(EtapeTraitement.IMPUTATION, this.userStructure.id!).subscribe({
    //         next: (data) => {
    //             this.demandeList = data.body;
    //             this.loading = false;
    //         },
    //         error: (error) => {
    //             this.loading = false;
    //             // showToast(handleHttpErrors(error, 'error', 'Récupération', 'demandeKey'), this.messageService)
    //         }
    //     });
    // }
    onSuccess(res: HttpResponse<any>) {
        showToast(StatusEnum.success, res.status, null, this.messageService);
    }
    imputation(selectedDemandes: any) {
        this.service.updateNomConformites(selectedDemandes).subscribe({
            next: (data) => {
               this.featureService.onReloadRequested(true);
                this.messageService.add({ severity: 'success', summary: 'Réussi', detail: 'Non-Conformité imputées avec succès', life: 5000 });
                this.router.navigate(['/non-conformite/vue-ensemble']);
                this.dmdTraitement.closeDetailsDialog();
            },
            error: () => {
                this.messageService.add({ severity: 'error', summary: 'ERREUR', detail: "L'oppération à échouée ! Veuillez réessayer 7", life: 3000 });
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
