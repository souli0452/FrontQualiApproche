import { Component, ViewChild } from '@angular/core';
import {
    DmdTraitementTableTemplateComponent
} from '../../../components/dmd.traitement-table-template/dmd.traitement-table-template.component';
import { MessageService } from 'primeng/api';
import { ProcNonConformiteService } from '../proc-non-conformite.service';
import { EtapeTraitement } from '../../../enums';
import { HttpResponse } from '@angular/common/http';
import { getCurrentUserStructure, isUserInRoles, showToast, StatusEnum } from '../../../utils';
import { CommonModule } from '@angular/common';
import { NgPrimeModule } from '../../../../prime-ng.module';
import { FeaturesService } from '../../../services/feature-service';

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
    title = 'Consultations des non-conformités';
    cols: any[] = [];
    userStructure:any={};
    constructor(private  featureService:FeaturesService,protected messageService: MessageService,private service:ProcNonConformiteService) {
        this.userStructure = getCurrentUserStructure();
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

        if(isUserInRoles(['SUPER_ADMIN','SUIVI_RQ',"VALIDATION_RQ"])){
            this.getDemandeList()
        }else{
            this.getDemandeListStructure();
        }

    }
    getDemandeList() {
        this.service.getNonConformiteAll().subscribe({
            next: (data) => {
                this.demandeList = data.body;
                this.featureService.onReloadRequested(true);
            },
            error: (error) => {
                //showToastDm(handleHttpErrors(error, 'error', 'Récupération', 'demandeKey'), this.messageService)
            }
        });
    }
    getDemandeListStructure() {
        this.service.getNonConformiteAllStructure(this.userStructure.id).subscribe({
            next: (data) => {
                this.demandeList = data.body;
                this.featureService.onReloadRequested(true);
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
