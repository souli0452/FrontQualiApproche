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
import { Structure } from '../../structure/structure';

@Component({
  selector: 'app-validation',
  templateUrl: './validation.component.html',
  styleUrl: './validation.component.scss',
    providers: [MessageService],
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
    @ViewChild(DmdTraitementTableTemplateComponent) dmdTraitement!: DmdTraitementTableTemplateComponent;
    user!:any;
    protected readonly BtnActions = EtapeTraitement;
    userStructure:Structure={};
    constructor(private authService:AuthService,protected messageService: MessageService,private service:ProcNonConformiteService) {
    }
    ngOnInit() {
        this.userStructure = getCurrentUserStructure();
        this.getDemandeList()
    }
    getDemandeList() {
        this.service.getNonConformiteByEtapeAndOrigin(EtapeTraitement.VALIDATION,this.userStructure.id!).subscribe({
            next: (data) => {
                this.demandeList = data.body;

            },
            error: (error) => {
                this.messageService.add({ severity: 'error', summary: 'ERREUR', detail: 'Erreur lors de la recupérations des demande', life: 3000 });
               // showToast(handleHttpErrors(error, 'error', 'Récupération', 'demandeKey'), this.messageService)
            }
        });
    }
    onSuccess(res: HttpResponse<any>) {
        showToast(StatusEnum.success, res.status, null, this.messageService);
    }
    validation(dmd:any) {
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
