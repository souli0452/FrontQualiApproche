import {Component, ViewChild} from '@angular/core';
import {NgPrimeModule} from "../../../../prime-ng.module";
import {MessageService} from "primeng/api";
import {ProcNonConformiteService} from "../proc-non-conformite.service";
import {
    DmdTraitementTableTemplateComponent
} from "../../../components/dmd.traitement-table-template/dmd.traitement-table-template.component";
import {HttpResponse} from "@angular/common/http";
import { showToast, StatusEnum } from '../../../utils';
import { EtapeTraitement } from '../../../enums';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-cloture',
  templateUrl: './cloture.component.html',
  styleUrl: './cloture.component.scss',
    standalone: true,
    imports:[
        CommonModule,
        NgPrimeModule,
        DmdTraitementTableTemplateComponent
    ]
})
export class ClotureComponent {
    demandeList: any = [];
    title = 'Cloture des non-conformités';
    constructor(protected messageService: MessageService,private service:ProcNonConformiteService) {
    }
    @ViewChild(DmdTraitementTableTemplateComponent) dmdTraitement!: DmdTraitementTableTemplateComponent;

    protected readonly BtnActions = EtapeTraitement;
    ngOnInit() {
        this.getDemandeList()
    }
    getDemandeList() {
        this.service.getNonConformiteByEtape(EtapeTraitement.VALIDATION).subscribe({
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
