import { Component, Input, ViewChild } from '@angular/core';
import { HttpResponse } from '@angular/common/http';
import { MessageService } from 'primeng/api';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../services/auth-services/auth.service';
import { showToast, StatusEnum } from '../../../../utils';
import { EtapeTraitement } from '../../../../enums';
import { NgPrimeModule } from '../../../../../prime-ng.module';
import { TraitementTableComponent } from '../../../../components/non-conformite/table-traitement/traitement-table';
import { ProcNonConformiteService } from '../../../../services/non-conformite/proc-non-conformite.service';
import { NCRejetComponent } from '../../nc-rejet/nc-rejet';

@Component({
    selector: 'app-nc-imputation',
    templateUrl: './nc-imputation.html',
    styleUrl: './nc-imputation.scss',
    standalone: true,
    providers: [MessageService],
    imports: [CommonModule, NgPrimeModule, TraitementTableComponent, NCRejetComponent]
})
export class VueEnsembleImputationComponent {
    @Input() demandeList: any = [];
    protected demande: any;
    motifRejetDialog: boolean=false;
    loading: boolean = false;
    title = 'Traitements des non-conformités';
    user!: any;
    protected readonly BtnActions = EtapeTraitement;
    @ViewChild(TraitementTableComponent) traitementDemandeTable!: TraitementTableComponent;
    cols: any[] = [];
    constructor(
        private authService: AuthService,
        protected messageService: MessageService,
        private service: ProcNonConformiteService
    ) {
        this.cols = [
            { field: 'numeroReference', header: 'N° Ref.', type: 'string', filter: false, width: '220px', centered: true },
            { field: 'structureSoumissionLibelle', header: 'Processus emetteur', type: 'string', filter: false, width: '300px', centered: false },
            { field: 'niveauNonConformiteLibelle', header: 'Gravité', type: 'badge', filter: false, width: '150px', centered: false },
            { field: 'createdAt', header: 'Date soumission', type: 'date', filter: true, width: '150px', centered: false }
        ];
    }
    ngOnInit() {
        this.user = this.authService.getUser()!;
    }
  
    onSuccess(res: HttpResponse<any>) {
        showToast(StatusEnum.success, res.status, null, this.messageService);
    }
    saveEntity(demandes: any) {
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
            next: () => {
                this.traitementDemandeTable.closeDetailsDialog();
                this.messageService.add({ severity: 'success', summary: 'Succès', detail: "L'oppération à réussie !", life: 3000 });
            },
            error: (error) => {
                this.messageService.add({ severity: 'error', summary: 'ERREUR', detail: "L'oppération à échouée ! Veuillez réessayer 13", life: 3000 });
            }
        });
    }

    submission(demandes: any) {
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
                this.traitementDemandeTable.closeDetailsDialog();
                this.messageService.add({ severity: 'success', summary: 'Succès', detail: "L'oppération à réussie !", life: 3000 });
            },
            error: (error) => {
                this.messageService.add({ severity: 'error', summary: 'ERREUR', detail: "L'oppération à échouée ! Veuillez réessayer 14", life: 3000 });
            }
        });
    }
    hideDialog(event: any) {
        if (event) {
            this.traitementDemandeTable.displayDetails();
        }
    }
    rejet(demande: any) {
        this.demande = demande;
        this.motifRejetDialog = true;
    }
}
