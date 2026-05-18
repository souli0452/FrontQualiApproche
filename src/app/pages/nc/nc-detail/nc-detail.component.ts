import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DatePipe, Location } from '@angular/common';
import { NonConformiteService } from '../../../services/non-conformite.service';
import { Avatar } from 'primeng/avatar';
import { EtapeTraitement, NonConformStatus, StatusEnum } from '../../../enums';
import { downloadAttachment, downloadFile, getStatusSeverity } from '../../../utils';

@Component({
    templateUrl: './nc-detail.component.html',
    standalone:false,
    styleUrl: './nc.detail.component.scss'
})
export class NcDetailComponent {
    nc: any = {};
    protected planAction: any;
    protected afficheDialog: boolean=false;

    constructor(
        private route: ActivatedRoute,
        private nonConformiteService: NonConformiteService,
        private location: Location
    ) {}

    ngOnInit() {
        this.route.params.subscribe((params) => {
            this.nonConformiteService.findById(params['id']).subscribe((actuality) => {
                this.nc = actuality.body!;
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
    telechargerTout(fichiers: any[]) {
        fichiers?.forEach(fichier => {
            const link = document.createElement('a');
            link.href = fichier.urlFichier;
            link.download = fichier.nom || 'fichier';
            link.click();
        });
    }
    hideDialogAffich() {
        this.afficheDialog = false;
    }
    protected readonly NonConformStatus = NonConformStatus;
    protected readonly EtapeTraitement = EtapeTraitement;
    protected readonly getStatusSeverity = getStatusSeverity;

    downloadFile(fichier: any) {
        downloadFile(fichier.nomFichier,fichier.fichierBase64);
    }

    protected readonly downloadAttachment = downloadAttachment;
}
