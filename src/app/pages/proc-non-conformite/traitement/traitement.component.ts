import { Component } from '@angular/core';
import {HttpResponse} from "@angular/common/http";
import {MessageService} from "primeng/api";
import {ProcNonConformiteService} from "../proc-non-conformite.service";
import { EtapeTraitement } from '../../../enums';
import { showToast, StatusEnum } from '../../../utils';
import { CommonModule } from '@angular/common';
import { NgPrimeModule } from '../../../../prime-ng.module';
import {
    DmdTraitementTableTemplateComponent
} from '../../../components/dmd.traitement-table-template/dmd.traitement-table-template.component';

@Component({
  selector: 'app-traitement',
  templateUrl: './traitement.component.html',
  styleUrl: './traitement.component.scss',
    standalone: true,
    imports:[
        CommonModule,
        NgPrimeModule,
        DmdTraitementTableTemplateComponent
    ]
})
export class TraitementComponent {
    demandeList: any = [];
    title = 'Traitements des non-conformités';

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
               // showToastDm(handleHttpErrors(error, 'error', 'Récupération', 'demandeKey'), this.messageService)
            }
        });
    }
    onSuccess(res: HttpResponse<any>) {

        showToast(StatusEnum.success, res.status, null, this.messageService);
    }
    saveEntity(demande: any) {
        this.service.updateNomConformite(demande,demande.id).subscribe({
            next: () => {

            },
            error: (error) =>{

            }

        });
    }

    submission(demande: any) {
        this.service.updateNomConformite(demande,demande.id).subscribe({
            next: (data) => {

            },
            error: (error) => {

            }
        });
    }

}

