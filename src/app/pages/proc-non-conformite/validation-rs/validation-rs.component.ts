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
import { showToast, StatusEnum } from '../../../utils';

@Component({
  selector: 'app-validation-rs',
    standalone: true,
    imports:[
        CommonModule,
        NgPrimeModule,
        DmdTraitementTableTemplateComponent
    ],
    providers: [MessageService],
  templateUrl: './validation-rs.component.html',
  styleUrl: './validation-rs.component.scss'
})
export class ValidationRSComponent {
    demandeList: any = [];
    title = 'Validations des non-conformités';
    @ViewChild(DmdTraitementTableTemplateComponent) dmdTraitement!: DmdTraitementTableTemplateComponent;

    protected readonly BtnActions = EtapeTraitement;

    constructor(protected messageService: MessageService,private service:ProcNonConformiteService) {
    }
    ngOnInit() {
        this.getDemandeList()
    }
    getDemandeList() {
        this.service.getNonConformiteByEtape(EtapeTraitement.VALIDATION_RS).subscribe({
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
    validationRs(dmd:any) {
        this.service.updateNomConformites(dmd).subscribe({
            next: (data) => {
               this.getDemandeList();
               this.dmdTraitement.closeDetailsDialog();
                this.messageService.add({ severity: 'success', summary: 'REUSSI', detail: "L'oppération à réussie !", life: 3000 });
            },
            error: (error) => {
                this.messageService.add({ severity: 'error', summary: 'ERREUR', detail: "L'oppération à échouée ! Veuillez réessayer", life: 3000 });
            }
        })
    }
}
