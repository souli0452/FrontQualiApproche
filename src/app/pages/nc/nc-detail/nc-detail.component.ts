import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DatePipe, Location } from '@angular/common';
import { NonConformiteService } from '../../../services/non-conformite.service';
import { Avatar } from 'primeng/avatar';
import { EtapeTraitement, NonConformStatus, StatusEnum } from '../../../enums';
import { downloadAttachment, viewAttachment, downloadFile, getStatusSeverity } from '../../../utils';

@Component({
    selector: 'app-nc-detail',
    templateUrl: './nc-detail.component.html',
    standalone:false,
    styleUrl: './nc.detail.component.scss'
})
export class NcDetailComponent {
    nc: any = {};
    @Input() viewId: any = null;
    @Output() closeDialog = new EventEmitter<void>();

    protected planAction: any;
    protected afficheDialog: boolean=false;

    constructor(
        private route: ActivatedRoute,
        private nonConformiteService: NonConformiteService,
        private location: Location
    ) {}

    ngOnInit() {
        if (this.viewId) {
            // Mode Popup (on reçoit l'ID directement)
            this.nonConformiteService.findById(this.viewId).subscribe((actuality) => {
                this.nc = actuality.body!;
            });
        } else {
            // Mode Page classique (on récupère l'ID dans l'URL)
            this.route.params.subscribe((params) => {
                this.nonConformiteService.findById(params['id']).subscribe((actuality) => {
                    this.nc = actuality.body!;
                });
            });
        }
    }


    goBack() {
        if (this.viewId) {
            this.closeDialog.emit(); // Ferme le popup
        } else {
            this.location.back(); // Retour navigateur
        }
    }
    affich(action:any){
        this.planAction=action;
        this.planAction.dateEcheance=action.dateEcheance.replace(/-/g, "/");
        this.afficheDialog = true;
    }

    getGravitySeverity(gravity: string): 'success' | 'info' | 'warning' | 'danger' | undefined {
        if (!gravity) return undefined;
        const g = gravity.toLowerCase();
        if (g.includes('critique')) return 'danger';
        if (g.includes('majeure')) return 'warning';
        if (g.includes('mineure')) return 'info';
        return undefined;
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
    protected readonly viewAttachment = viewAttachment;

    getFileIcon(filename: string): string {
        if (!filename) return 'assets/images/unknown-file.png';
        const parts = filename.split('.');
        const extension = parts.length > 1 ? parts.pop()?.toLowerCase() || '' : '';
        const icons: { [key: string]: string } = {
            doc: 'assets/images/doc-file.png',
            docx: 'assets/images/doc-file.png',
            xlsx: 'assets/images/xls-file.png',
            xls: 'assets/images/xls-file.png',
            pdf: 'assets/images/pdf-file.png',
            jpeg: 'assets/images/jpeg-file.png',
            jpg: 'assets/images/jpeg-file.png',
            png: 'assets/images/jpeg-file.png',
            txt: 'assets/images/txt-file.png'
        };
        return icons[extension] || 'assets/images/unknown-file.png';
    }
}
