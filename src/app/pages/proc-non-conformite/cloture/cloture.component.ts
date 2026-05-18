import { Component, ViewChild } from '@angular/core';
import { NgPrimeModule } from "../../../../prime-ng.module";
import { MessageService } from "primeng/api";
import { ProcNonConformiteService } from "../proc-non-conformite.service";
import {
    DmdTraitementTableTemplateComponent
} from "../../../components/dmd.traitement-table-template/dmd.traitement-table-template.component";
import { HttpResponse } from "@angular/common/http";
import { showToast, StatusEnum } from '../../../utils';
import { EtapeTraitement } from '../../../enums';
import { CommonModule } from '@angular/common';
import { RejetFormsComponent } from '../forms/rejet.forms/rejet.forms.component';

@Component({
    selector: 'app-cloture',
    templateUrl: './cloture.component.html',
    styleUrl: './cloture.component.scss',
    standalone: true,
    providers: [MessageService],
    imports: [CommonModule, NgPrimeModule, DmdTraitementTableTemplateComponent, RejetFormsComponent]
})
export class ClotureComponent {
    demandeList: any = [];
    cols: any[] = [];
    protected demande: any;
    motifRejetDialog: boolean = false;
    loading: boolean = false;
    title = 'Suivi des non-conformités';
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
    @ViewChild(DmdTraitementTableTemplateComponent) dmdTraitement!: DmdTraitementTableTemplateComponent;

    protected readonly BtnActions = EtapeTraitement;
    ngOnInit() {
        this.getDemandeList();
    }
    getDemandeList() {
        this.loading = true;
        this.service.getNonConformiteByEtape(EtapeTraitement.SUIVI_RQ).subscribe({
            next: (data) => {
                this.demandeList = data.body;
                this.loading = false;
            },
            error: (error) => {
                this.loading = false;
                //showToastDm(handleHttpErrors(error, 'error', 'Récupération', 'demandeKey'), this.messageService)
            }
        });
    }
    onSuccess(res: HttpResponse<any>) {
        this.getDemandeList();
        showToast(StatusEnum.success, res.status, null, this.messageService);
        this.messageService.add({ severity: 'success', summary: 'REUSSI', detail: "L'oppération à réussie", life: 3000 });
        this.dmdTraitement.closeDetailsDialog();
    }

    cloture(dmd: any) {
        this.service.updateNomConformites(dmd).subscribe({
            next: (data) => {
                this.onSuccess(data);
            },
            error: (error) => {
                this.messageService.add({ severity: 'error', summary: 'ERREUR', detail: "L'oppération à échouée ! Veuillez réessayer 1", life: 3000 });
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
