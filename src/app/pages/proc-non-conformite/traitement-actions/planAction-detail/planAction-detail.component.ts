import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DatePipe, Location } from '@angular/common';

import { Avatar } from 'primeng/avatar';
import { NonConformiteService } from '../../../../services/non-conformite.service';
import { downloadFile, getStatusSeverity } from '../../../../utils';
import { PlanActionService } from '../../../../services/planAction.service';
import { StatusEnum } from '../../../../enums';

@Component({
    templateUrl: './planAction-detail.component.html',
    standalone:false,
    styleUrl: './planAction.detail.component.scss'
})
export class PlanActionDetailComponent {
    nc: any = {};
    planAction: any = {};
    planActionRequest: any = {};

    protected afficheDialog: boolean=false;

    constructor(
        private route: ActivatedRoute,
        private nonConformiteService: NonConformiteService,
        private  planActionService:PlanActionService,
        private location: Location
    ) {}

    ngOnInit() {
        this.route.params.subscribe((params) => {
            this.planActionService.findById(params['id']).subscribe((plan) => {
                this.planActionRequest = plan.body!;
                this.nonConformiteService.findByNumero(this.planActionRequest.numeroNc).subscribe((plan) => {
                    this.nc = plan.body!;
                });
            });
        });
    }


    goBack() {
        this.location.back();
    }
    affich(action:any){
        this.planAction=action;
        this.planAction.dateEcheance=action.dateEcheance.replace(/-/g, "/");
        this.afficheDialog = true;
    }
    downloadFile(fichier: any) {
        downloadFile(fichier.nomFichier,fichier.fichierBase64);
    }
    hideDialogAffich() {
        this.afficheDialog = false;
    }

    protected readonly getStatusSeverity = getStatusSeverity;
    protected readonly StatusEnum = StatusEnum;
}
