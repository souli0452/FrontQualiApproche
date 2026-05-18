import { Component, ViewChild } from '@angular/core';
import { HttpResponse } from '@angular/common/http';
import { MessageService } from 'primeng/api';
import { ProcNonConformiteService } from '../proc-non-conformite.service';
import { EtapeTraitement } from '../../../enums';
import { showToast, StatusEnum } from '../../../utils';
import { CommonModule } from '@angular/common';
import { NgPrimeModule } from '../../../../prime-ng.module';
import { DmdTraitementTableTemplateComponent } from '../../../components/dmd.traitement-table-template/dmd.traitement-table-template.component';
import { AuthService } from '../../../services/auth-services/auth.service';
import { RejetFormsComponent } from '../forms/rejet.forms/rejet.forms.component';

@Component({
    selector: 'app-traitement',
    templateUrl: './traitement.component.html',
    styleUrl: './traitement.component.scss',
    standalone: true,
    providers: [MessageService],
    imports: [CommonModule, NgPrimeModule, DmdTraitementTableTemplateComponent, RejetFormsComponent]
})
export class TraitementComponent {
    demandeList: any = [];
    protected demande: any;
    motifRejetDialog: boolean=false;
    loading: boolean = false;
    title = 'Traitements des non-conformités';
    user!: any;
    protected readonly BtnActions = EtapeTraitement;
    @ViewChild(DmdTraitementTableTemplateComponent) dmdTraitement!: DmdTraitementTableTemplateComponent;
    cols: any[] = [];
    constructor(
        private authService: AuthService,
        protected messageService: MessageService,
        private service: ProcNonConformiteService
    ) {
        this.cols = [
            { field: 'numeroReference', header: 'N° ordre', type: 'string', filter: true, width: '10%', centered: false },
            { field: 'structureSoumissionLibelle', header: 'Processus Emetteur', type: 'string', filter: true, width: '30%', centered: false },
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
        this.user = this.authService.getUser()!;
        this.getDemandeList(this.user.userId);
    }
    getDemandeList(userId: string) {
        this.loading = true;
        this.service.getNonConformiteImputed(userId, EtapeTraitement.TRAITEMENT).subscribe({
            next: (data) => {
                this.demandeList = data.body;
                this.loading = false;
            },
            error: (error) => {
                this.messageService.add({ severity: 'error', summary: 'ERREUR', detail: "L'oppération à échouée ! Veuillez réessayer 12", life: 3000 });
                this.loading = false;
            }
        });
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
                this.getDemandeList(this.user.userId);
                this.dmdTraitement.closeDetailsDialog();
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
                this.getDemandeList(this.user.userId);
                this.dmdTraitement.closeDetailsDialog();
                this.messageService.add({ severity: 'success', summary: 'Succès', detail: "L'oppération à réussie !", life: 3000 });
            },
            error: (error) => {
                this.messageService.add({ severity: 'error', summary: 'ERREUR', detail: "L'oppération à échouée ! Veuillez réessayer 14", life: 3000 });
            }
        });
    }
    hideDialog(event: any) {
        if (event) {
            this.dmdTraitement.displayDetails();
            this.getDemandeList(this.user.userId);
        }
    }
    rejet(demande: any) {
        this.demande = demande;
        this.motifRejetDialog = true;
    }
}
