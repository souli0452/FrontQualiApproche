import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DatePipe, Location } from '@angular/common';
import { EtapeTraitement, NonConformStatus, StatusEnum } from '../../../enums';
import { downloadAttachment, viewAttachment, downloadFile, getStatusSeverity } from '../../../utils';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ViewChild } from '@angular/core';
import { LightboxComponent } from '../../../components/non-conformite/lightbox/lightbox';
import { NonConformiteService } from '../../../services/non-conformite/non-conformite.service';

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
    @ViewChild('maLightbox') lightbox!: LightboxComponent;

    protected planAction: any;
    protected afficheDialog: boolean=false;

    constructor(
        private sanitizer: DomSanitizer,
        private route: ActivatedRoute,
        private nonConformiteService: NonConformiteService,
        private location: Location
    ) {}

    lightboxVisible: boolean = false;
    lightboxUrl: SafeResourceUrl | null = null;
    isImage: boolean = false;
    isPdf: boolean = false;

    openLightbox(fichier: any) {
        this.lightbox.open(fichier);
    }

    isViewable(fichier: any): boolean {
        if (!fichier || !fichier.nom) return false;
        const nom = fichier.nom.toLowerCase();
        return nom.endsWith('.pdf') || nom.endsWith('.png') || nom.endsWith('.jpg') || nom.endsWith('.jpeg');
    }

    ngOnInit() {
        if (this.viewId) {
            // Mode Popup (on reçoit l'ID directement)
            this.nonConformiteService.findNCById(this.viewId).subscribe((nonConformite) => {
                this.nc = nonConformite.data!;
            });
        } else {
            // Mode Page classique (on récupère l'ID dans l'URL)
            this.route.params.subscribe((params) => {
                this.nonConformiteService.findNCById(params['id']).subscribe((nonConformite) => {
                    this.nc = nonConformite.data!;
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
        console.log("DETAIL PLAN D'ACTION ", this.planAction);
        
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
