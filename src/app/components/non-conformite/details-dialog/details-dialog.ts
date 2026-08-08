import { Component, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { CommonModule, DatePipe, formatDate } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Tag } from 'primeng/tag';
import { ConfirmationService, MessageService } from 'primeng/api';
import { NgPrimeModule } from '../../../../prime-ng.module';
import { FileUploadComponent } from '../file-upload/file-upload.component';
import { FeaturesService } from '../../../services/feature-service';
import { AuthService } from '../../../services/auth-services/auth.service';
import { EtapeTraitement } from '../../../enums/enums';
import { LightboxComponent } from '../lightbox/lightbox';
import { WorkflowGuidanceComponent } from '../../../shared/workflow/workflow-guidance.component';
import { WorkflowSaisiesComponent } from '../../../shared/workflow/workflow-saisies.component';
import { WorkflowHistoriqueComponent } from '../../../shared/workflow/workflow-historique.component';
import { ProcNonConformiteService } from '../../../services/non-conformite/proc-non-conformite.service';
import { convertFilesToBase64 } from '../../../utils/fichier/fichier-utils';
import { PieceJointeFichierService } from '../../../services/non-conformite/piece-jointe-fichier.service';
import { formatDateToDDMMYYYY } from '../../../utils/formatage/formatage-utils';
import { hasAnyPermission } from '../../../utils/auth/auth-utils';
import { LicenceOuverteDirective } from '../../../shared/licence/licence-ouverte.directive';

@Component({
    selector: 'app-details-dialog',
    templateUrl: './details-dialog.html',
    imports: [CommonModule, FormsModule, NgPrimeModule, FileUploadComponent, LightboxComponent,
        WorkflowGuidanceComponent, WorkflowSaisiesComponent, WorkflowHistoriqueComponent,
        LicenceOuverteDirective],
    standalone: true,
    styleUrl: './details-dialog.scss'
})
export class DetailsDialogComponent {
    @Input() set demande(valeur: any) {
        this._demande = valeur ?? {};
    }
    get demande(): any {
        return this._demande;
    }
    private _demande: any = {};

    /**
     * L'historique nomme des personnes et rapporte leurs appréciations : il ne s'ouvre qu'à qui a
     * le droit de lire le circuit. À défaut, l'onglet n'existe pas — plutôt qu'un onglet visible
     * menant à un refus.
     */
    readonly peutVoirHistorique = hasAnyPermission(['workflow-read', 'workflow-validate', 'nc-validate']);

    @ViewChild(LightboxComponent) maLightbox!: LightboxComponent;
    private uploadedFiles: any[] = [];

    motifRejetDialog: boolean = false;
    afficheDialog: boolean = false;
    displayDialog: boolean = false;
    planAction: any = {};
    users: any = [];
    user: any = {};
    isConsultation: boolean = false;
    confirmKey = 'confirmKey';

    constructor(
        private featureService: FeaturesService,
        private confirmationService: ConfirmationService,
        private service: ProcNonConformiteService,
        private messageService: MessageService,
        private authService: AuthService,
        private fichiers: PieceJointeFichierService
    ) {}

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
                    this.users = res.data.content || [];
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
    /**
     * Télécharge une pièce jointe.
     *
     * <p>Le contenu ne voyage plus avec la fiche : il est demandé au serveur au moment du clic.
     * Le service accepte aussi une pièce que l'utilisateur vient de choisir, laquelle n'est pas
     * encore enregistrée et n'a donc rien à demander.</p>
     */
    downloadFile(fichier: any) {
        this.fichiers.telecharger(fichier);
    }

    /** Même chose : les gabarits appellent encore ce nom sur les listes de pièces jointes. */
    downloadAttachment(fichier: any) {
        this.fichiers.telecharger(fichier);
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

}
