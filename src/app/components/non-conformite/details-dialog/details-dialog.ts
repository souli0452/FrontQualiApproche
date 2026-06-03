import { Component, Input, ViewChild } from '@angular/core';
import { DatePipe, formatDate } from '@angular/common';
import { Tag } from 'primeng/tag';
import { ConfirmationService, MessageService } from 'primeng/api';
import { NgPrimeModule } from '../../../../prime-ng.module';
import { FileUploadComponent } from '../file-upload/file-upload.component';
import { FeaturesService } from '../../../services/feature-service';
import { ProcNonConformiteService } from '../../../pages/proc-non-conformite/proc-non-conformite.service';
import { AuthService } from '../../../services/auth-services/auth.service';
import { EtapeTraitement } from '../../../enums';
import { convertFilesToBase64, downloadAttachment, downloadFile, formatDateToDDMMYYYY } from '../../../utils';
import { LightboxComponent } from '../lightbox/lightbox';

@Component({
    selector: 'app-details-dialog',
    templateUrl: './details-dialog.html',
    imports: [NgPrimeModule, FileUploadComponent, LightboxComponent],
    standalone: true,
    styleUrl: './details-dialog.scss'
})
export class DetailsDialogComponent {
    @Input() demande: any = {};
    @ViewChild(LightboxComponent) maLightbox!: LightboxComponent;
    private uploadedFiles: any[] = [];
    constructor(
        private featureService: FeaturesService,
        private confirmationService: ConfirmationService,
        private service: ProcNonConformiteService,
        private messageService: MessageService,
        private authService: AuthService
    ) {}

    motifRejetDialog: boolean = false;
    afficheDialog: boolean = false;
    displayDialog: boolean = false;
    planAction: any = {};
    users: any = [];
    user: any = {};
    isConsultation: boolean = false;

    ngOnInit() {
        console.log(this.demande);
    }
    hideDialog() {
        this.motifRejetDialog = false;
    }
    hideDialogAffich() {
        this.afficheDialog = false;
    }

    openLightbox(file: any) {
        this.maLightbox.open(file);
    }

    isViewable(fichier: any): boolean {
        const nom = fichier?.nom || fichier?.nomFichier;
        if (!nom) return false;
        const nomStr = nom.toLowerCase();
        return nomStr.endsWith('.pdf') || nomStr.endsWith('.png') || nomStr.endsWith('.jpg') || nomStr.endsWith('.jpeg');
    }

    edit(action: any) {
        this.planAction = { ...action };
        if (this.planAction.dateEcheance && typeof this.planAction.dateEcheance === 'string') {
            this.planAction.dateEcheance = this.planAction.dateEcheance.replace(/-/g, '/');
        }
        console.log(this.planAction.dateEcheance);
        this.fetchUsers();
        this.motifRejetDialog = true;
    }
    affich(action: any) {
        this.planAction = { ...action };
        if (this.planAction.dateEcheance && typeof this.planAction.dateEcheance === 'string') {
            this.planAction.dateEcheance = this.planAction.dateEcheance.replace(/-/g, '/');
        }
        this.afficheDialog = true;
    }
    fetchUsers() {
        this.authService
            .getAllUsers()
            .pipe()
            .subscribe({
                next: (res) => {
                    this.users = res.body || [];
                    this.users = this.users.map((user: any) => {
                        return {
                            ...user,
                            fullName: user.firstName + ' ' + user.lastName
                        };
                    });
                    this.user = this.users.find((user: any) => user.fullName === this.planAction.responsableNomComplet);
                }
            });
    }
    modifier() {
        if (this.planAction.dateEcheance) {
            if (this.planAction.dateEcheance instanceof Date) {
                this.planAction.dateEcheance = formatDateToDDMMYYYY(this.planAction.dateEcheance);
            } else if (typeof this.planAction.dateEcheance === 'string') {
                this.planAction.dateEcheance = this.planAction.dateEcheance.replace(/\//g, '-');
            }
        }
        this.planAction.responsableEmail = this.user.email;
        this.planAction.responsableNomComplet = this.user.nomComplet;
        this.planAction.responsableId = this.user.id;
        console.log(this.planAction);
        this.service.updatePlanAction(this.planAction).subscribe({
            next: (data) => {
                this.motifRejetDialog = false;
                this.messageService.add({ severity: 'success', summary: 'Réussi', detail: "L'oppération à réussie !", life: 3000 });
            },
            error: (error) => {
                this.messageService.add({ severity: 'error', summary: 'ERREUR', detail: "L'oppération à échouée ! Veuillez réessayer 3", life: 3000 });
            }
        });
    }
    downloadFile(fichier: any) {
        const nom = fichier.nom || fichier.nomFichier;
        const base64 = fichier.fichier || fichier.fichierBase64;
        if (base64) {
            downloadFile(nom, base64);
        } else {
            console.error('Aucun contenu base64 trouvé pour ce fichier', fichier);
            this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Le fichier est introuvable ou vide.', life: 3000 });
        }
    }
    telechargerTout(fichiers: any[]) {
        fichiers?.forEach((fichier) => {
            const link = document.createElement('a');
            link.href = fichier.urlFichier;
            link.download = fichier.nom || 'fichier';
            link.click();
        });
    }

    getFileIcon(filename: string): string {
        if (!filename) return 'assets/images/unknown-file.png';
        const extension = filename.split('.').pop()?.toLowerCase() || '';
        const icons: { [key: string]: string } = {
            doc: 'assets/images/doc-file.png',
            docx: 'assets/images/doc-file.png',
            xlsx: 'assets/images/xls-file.png',
            pdf: 'assets/images/pdf-file.png',
            jpeg: 'assets/images/jpeg-file.png',
            jpg: 'assets/images/jpeg-file.png',
            png: 'assets/images/jpeg-file.png',
            txt: 'assets/images/txt-file.png'
        };
        return icons[extension] || 'assets/images/unknown-file.png';
    }

    protected readonly EtapeTraitement = EtapeTraitement;

    rejet() {
        this.confirmationService.confirm({
            message: `Voulez-vous vraiment réjeter la demande n°: ${this.planAction.numeroOdre} ?`,
            key: '1',
            accept: () => {
                this.service.rejetPlanAction(this.planAction).subscribe({
                    next: (data) => {
                        this.displayDialog = false;
                        this.messageService.add({ severity: 'success', summary: 'Réussi', detail: "L'oppération à réussie !", life: 3000 });
                    },
                    error: (error) => {
                        this.messageService.add({ severity: 'error', summary: 'ERREUR', detail: "L'oppération à échouée ! Veuillez réessayer 4", life: 3000 });
                    }
                });
            }
        });
    }

    getStatusSeverity(gravity: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
        if (!gravity) return 'secondary';
        
        const val = gravity.toLowerCase().trim();
        if (val.includes('critique') || val.includes('non')) {
            return 'danger'; 
        }
        if (val.includes('majeur')) {
            return 'warn';
        }
        if (val.includes('mineur')) {
            return 'info';
        }if (val.includes('oui')) {
            return 'success';
        }
        
        return 'secondary';
    }

    displayRejet(plan: any) {
        this.planAction = plan;
        this.displayDialog = true;
    }
    async handleFileUpload(files: any[]) {
        this.uploadedFiles = files;
        const fichiers = await convertFilesToBase64(this.uploadedFiles);
        this.planAction.docRejet = fichiers[0];
    }

    protected readonly downloadAttachment = downloadAttachment;
}
