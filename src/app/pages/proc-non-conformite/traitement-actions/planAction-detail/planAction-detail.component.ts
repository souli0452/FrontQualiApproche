import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DatePipe, Location } from '@angular/common';

import { Avatar } from 'primeng/avatar';
import { NonConformiteService } from '../../../../services/non-conformite.service';
import { downloadAttachment, downloadFile, getStatusSeverity } from '../../../../utils';
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
    loading: boolean = false;

    protected afficheDialog: boolean=false;

    constructor(
        private route: ActivatedRoute,
        private nonConformiteService: NonConformiteService,
        private  planActionService:PlanActionService,
        private location: Location
    ) {}

    ngOnInit() {
        this.route.params.subscribe((params) => {
            this.loading = true;
            this.planActionService.findById(params['id']).subscribe({
                next: (plan) => {
                    this.planActionRequest = plan.body!;
                    this.nonConformiteService.findByNumero(this.planActionRequest.numeroNc).subscribe({
                        next: (plan) => {
                            this.nc = plan.body!;
                            this.loading = false;
                        },
                        error: (error) => {
                            this.loading = false;
                        }
                    });
                },
                error: (error) => {
                    this.loading = false;
                }
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

    hideDialogAffich() {
        this.afficheDialog = false;
    }

    protected readonly getStatusSeverity = getStatusSeverity;
    protected readonly StatusEnum = StatusEnum;
    protected readonly downloadAttachment = downloadAttachment;
}
