import { Component } from '@angular/core';
import {MessageService} from "primeng/api";
import {ProcNonConformiteService} from "../proc-non-conformite.service";
import {HttpResponse} from "@angular/common/http";
import { EtapeTraitement } from '../../../enums';
import { showToast, StatusEnum } from '../../../utils';
import { CommonModule } from '@angular/common';
import { NgPrimeModule } from '../../../../prime-ng.module';
import {
    DmdTraitementTableTemplateComponent
} from '../../../components/dmd.traitement-table-template/dmd.traitement-table-template.component';

@Component({
  selector: 'app-validation',
  templateUrl: './validation.component.html',
  styleUrl: './validation.component.scss',
    standalone: true,
    imports:[
        CommonModule,
        NgPrimeModule,
        DmdTraitementTableTemplateComponent
    ]
})
export class ValidationComponent {
    demandeList: any = [];
    title = 'Validations des non-conformités';

    protected readonly BtnActions = EtapeTraitement;

    constructor(protected messageService: MessageService,private service:ProcNonConformiteService) {
    }
    ngOnInit() {
        this.getDemandeList()
    }
    getDemandeList() {
        this.service.getNonConformiteByEtape(EtapeTraitement.TRAITEMENT).subscribe({
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
}
