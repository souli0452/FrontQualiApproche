import { Component, Input } from '@angular/core';
import { FeaturesService } from '../../../../services/feature-service';
import { DatePipe, formatDate } from '@angular/common';
import { Tag } from 'primeng/tag';
import { EtapeTraitement, StatusEnum } from '../../../../enums';
import { NgPrimeModule } from '../../../../../prime-ng.module';
import { AuthService } from '../../../../services/auth-services/auth.service';
import { convertFilesToBase64, downloadAttachment, downloadFile, formatDateTodd, formatDateToDDMMYYYY, getStatusSeverity } from '../../../../utils';
import { ProcNonConformiteService } from '../../proc-non-conformite.service';
import { ConfirmationService, MessageService } from 'primeng/api';
import { FileUploadComponent } from '../../../../components/non-conformite/file-upload/file-upload.component';

@Component({
    selector: 'demande-non_conformite-details',
    templateUrl: './demande.non_conformite.details.component.html',
    imports: [NgPrimeModule, FileUploadComponent],
    standalone: true,
    styleUrl: './demande.non_conformite.details.component.scss'
})
export class DemandeNon_conformiteDetailsComponent {
    @Input() demande: any = {};
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
    edit(action: any) {
        this.planAction = action;
        this.planAction.dateEcheance = action.dateEcheance.replace(/-/g, '/');
        console.log(this.planAction.dateEcheance);
        this.fetchUsers();
        this.motifRejetDialog = true;
    }
    affich(action: any) {
        this.planAction = action;
        this.planAction.dateEcheance = action.dateEcheance.replace(/-/g, '/');
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
        this.planAction.dateEcheance = this.planAction.dateEcheance.replace(/\//g, '-');
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
        downloadFile(fichier.nomFichier, fichier.fichierBase64);
    }
    telechargerTout(fichiers: any[]) {
        fichiers?.forEach((fichier) => {
            const link = document.createElement('a');
            link.href = fichier.urlFichier;
            link.download = fichier.nom || 'fichier';
            link.click();
        });
    }

    protected readonly EtapeTraitement = EtapeTraitement;
    protected readonly getStatusSeverity = getStatusSeverity;

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
