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
import { getCurrentUserStructure, showToast, StatusEnum } from '../../../utils';
import { Structure } from '../../structure/structure';

@Component({
  selector: 'app-imputation',
    imports:[
        CommonModule,
        NgPrimeModule,
        DmdTraitementTableTemplateComponent
    ],
    providers: [MessageService],
  templateUrl: './imputation.component.html',
  styleUrl: './imputation.component.scss'
})
export class ImputationComponent {
    demandeList: any = [];
    title = 'Imputations des non-conformités';
    @ViewChild(DmdTraitementTableTemplateComponent) dmdTraitement!: DmdTraitementTableTemplateComponent;
    userStructure:Structure={};
    protected readonly BtnActions = EtapeTraitement;

    constructor(protected messageService: MessageService,private service:ProcNonConformiteService) {
    }
    ngOnInit() {
        this.userStructure = getCurrentUserStructure();
        this.getDemandeList()
    }
    getDemandeList() {
        this.service.getNonConformiteByEtapeAndOrigin(EtapeTraitement.IMPUTATION,this.userStructure.id!).subscribe({
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
    imputation(selectedDemandes: any) {
        this.service.updateNomConformites(selectedDemandes).subscribe({
            next: (data) => {
                this.getDemandeList();
                this.messageService.add({ severity: 'success', summary: 'Réussi', detail: 'Demandes imputées avec succès', life: 3000 });
             this.dmdTraitement.closeDetailsDialog();

            },
            error: () => {
                this.messageService.add({ severity: 'error', summary: 'ERREUR', detail: "L'oppération à échouée ! Veuillez réessayer", life: 3000 });
            }
        });
    }
}
