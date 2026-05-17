import { Component, ViewChild } from '@angular/core';
import {MessageService} from "primeng/api";
import {ProcNonConformiteService} from "../proc-non-conformite.service";
import {HttpResponse} from "@angular/common/http";
import { EtapeTraitement } from '../../../enums';
import { getCurrentUserStructure, showToast, StatusEnum } from '../../../utils';
import { CommonModule } from '@angular/common';
import { NgPrimeModule } from '../../../../prime-ng.module';
import {
    DmdTraitementTableTemplateComponent
} from '../../../components/dmd.traitement-table-template/dmd.traitement-table-template.component';
import { AuthService } from '../../../services/auth-services/auth.service';
import { RejetFormsComponent } from '../forms/rejet.forms/rejet.forms.component';
import { Structure } from '../../structure/structure-config/structure';

@Component({
    selector: 'app-validation',
    templateUrl: './validation.component.html',
    styleUrl: './validation.component.scss',
    providers: [MessageService],
    standalone: true,
    imports: [CommonModule, NgPrimeModule, DmdTraitementTableTemplateComponent, RejetFormsComponent]
})
export class ValidationComponent {
    demandeList: any = [];
    motifRejetDialog: boolean=false;
    protected demande: any;
    loading: boolean = false;
    title = 'Validations des non-conformités';
    @ViewChild(DmdTraitementTableTemplateComponent) dmdTraitement!: DmdTraitementTableTemplateComponent;
    user!: any;
    protected readonly BtnActions = EtapeTraitement;
    userStructure: Structure = {};
    cols: any[] = [];
    constructor(
        private authService: AuthService,
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
        this.service.getNonConformiteByEtapeAndOrigin(EtapeTraitement.VALIDATION, this.userStructure.id!).subscribe({
            next: (data) => {
                this.demandeList = data.body;
                this.loading = false;
            },
            error: (error) => {
                this.loading = false;
                this.messageService.add({ severity: 'error', summary: 'ERREUR', detail: 'Erreur lors de la recupérations des demande', life: 3000 });
                // showToast(handleHttpErrors(error, 'error', 'Récupération', 'demandeKey'), this.messageService)
            }
        });
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
