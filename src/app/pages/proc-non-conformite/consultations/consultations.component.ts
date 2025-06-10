import { Component, ViewChild } from '@angular/core';
import {
    DmdTraitementTableTemplateComponent
} from '../../../components/dmd.traitement-table-template/dmd.traitement-table-template.component';
import { MessageService } from 'primeng/api';
import { ProcNonConformiteService } from '../proc-non-conformite.service';
import { EtapeTraitement } from '../../../enums';
import { HttpResponse } from '@angular/common/http';
import { showToast, StatusEnum } from '../../../utils';
import { CommonModule } from '@angular/common';
import { NgPrimeModule } from '../../../../prime-ng.module';

@Component({
    selector: 'app-consultations',
    standalone: true,
    imports:[
        CommonModule,
        NgPrimeModule,
        DmdTraitementTableTemplateComponent
    ],
    templateUrl: './consultations.component.html',
    styleUrl: './consultations.component.scss'
})
export class ConsultationsComponent {
    demandeList: any = [];
    title = 'Consulatations des non-conformités';
    constructor(protected messageService: MessageService,private service:ProcNonConformiteService) {
    }
    @ViewChild(DmdTraitementTableTemplateComponent) dmdTraitement!: DmdTraitementTableTemplateComponent;

    protected readonly BtnActions = EtapeTraitement;
    ngOnInit() {
        this.getDemandeList()
    }
    getDemandeList() {
        this.service.getNonConformiteAll().subscribe({
            next: (data) => {
                this.demandeList = data.body;
            },
            error: (error) => {
                //showToastDm(handleHttpErrors(error, 'error', 'Récupération', 'demandeKey'), this.messageService)
            }
        });
    }
    onSuccess(res: HttpResponse<any>) {
        this.getDemandeList()
        showToast(StatusEnum.success, res.status, null, this.messageService);
        this.dmdTraitement.closeDetailsDialog();
    }

    cloture(dmd:any) {
        this.service.updateNomConformite(dmd,dmd.id).subscribe({
            next: (data) => {
                this.onSuccess(data);
            },
            error: (error) => {

            }
        })
    }

}
