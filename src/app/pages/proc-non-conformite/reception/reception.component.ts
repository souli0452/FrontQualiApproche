import {Component, ViewChild} from '@angular/core';
import {MessageService} from "primeng/api";
import {ProcNonConformiteService} from "../proc-non-conformite.service";
import {HttpResponse} from "@angular/common/http";
import {
    DmdTraitementTableTemplateComponent
} from "../../../components/dmd.traitement-table-template/dmd.traitement-table-template.component";
import { EtapeTraitement } from '../../../enums';
import { showToast, StatusEnum } from '../../../utils';
import { CommonModule } from '@angular/common';
import { NgPrimeModule } from '../../../../prime-ng.module';

@Component({
  selector: 'app-reception',
  templateUrl: './reception.component.html',
  styleUrl: './reception.component.scss',
    standalone: true,
    imports:[
        CommonModule,
        NgPrimeModule,
        DmdTraitementTableTemplateComponent
    ]
})
export class ReceptionComponent {
    demandeList: any = [];
    title = 'Réceptions des non-conformités';
    constructor(protected messageService: MessageService,private service:ProcNonConformiteService) {
    }
    @ViewChild(DmdTraitementTableTemplateComponent) dmdTraitement!: DmdTraitementTableTemplateComponent;

    protected readonly BtnActions = EtapeTraitement;
ngOnInit() {
    this.getDemandeList()
}
    getDemandeList() {
        this.service.getNonConformiteByEtape(EtapeTraitement.SOUMISSION).subscribe({
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

    reception(dmd:any) {
     this.service.updateNomConformite(dmd,dmd.id).subscribe({
         next: (data) => {
           this.onSuccess(data);
         },
         error: (error) => {

         }
     })
    }

}
