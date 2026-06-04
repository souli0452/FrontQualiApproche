import {Component, EventEmitter, Input, Output} from '@angular/core';
import { NgPrimeModule } from '../../../../prime-ng.module';
import { EtapeTraitement } from '../../../enums';
import { convertFilesToBase64 } from '../../../utils';
import { MessageService } from 'primeng/api';
import { FileUploadComponent } from '../../../components/non-conformite/file-upload/file-upload.component';
import { ProcNonConformiteService } from '../../../services/non-conformite/proc-non-conformite.service';
@Component({
    selector: 'app-nc-rejet',
    templateUrl: './nc-rejet.html',
    imports: [NgPrimeModule, FileUploadComponent],
})
export class NCRejetComponent {
    @Input() demande!: any;
    @Input() motifRejetDialog: boolean = false;
    isSummited: boolean = false;
    rejet: String = '';
    etape!: EtapeTraitement;
    fileRejet:any;
    @Output() onSuccess = new EventEmitter<any>();
    private uploadedFiles: any[]=[];

    constructor(
        private messageService: MessageService,   
        private service: ProcNonConformiteService) {}

    rejetDemande() {
        this.isSummited = true;
        console.log(this.demande);
        if (this.demande.etatTraitement == EtapeTraitement.RECEPTION) {
            this.etape = EtapeTraitement.SOUMISSION;
        }
        if (this.demande.etatTraitement == EtapeTraitement.VALIDATION) {
            this.etape = EtapeTraitement.TRAITEMENT;
        }
        if (this.demande.etatTraitement == EtapeTraitement.IMPUTATION) {
            this.etape = EtapeTraitement.VALIDATION_RS;
        }
        if (this.demande.etatTraitement == EtapeTraitement.VALIDATION_RS) {
            this.etape = EtapeTraitement.RECEPTION;
        }
        if (this.demande.etatTraitement == EtapeTraitement.SUIVI_RQ) {
            this.etape = EtapeTraitement.VALIDATION;
        }
        const dmd = { id: this.demande.id, etapeTraitement: this.etape, rejectReason: this.rejet ,docRejet:this.fileRejet!=null?this.fileRejet[0]:null };
        this.service.rejectNc(dmd).subscribe({
            next: (data) => {
                this.messageService.add({severity:'success', summary:'Succès', detail:'Demande rejetée'});
                this.motifRejetDialog = false;
                this.isSummited = false;
                this.reloadIfSuccess();
            },
            error: (error) => {
                this.messageService.add({severity:'error', summary:'Erreur', detail:'Demande non rejetée'});
                console.log("Erruer lors du rejet : ", error);
                this.isSummited = false;
            }
        });
    }

    reloadIfSuccess() {
        this.onSuccess.emit(true);
    }

    hideDialog() {
        this.motifRejetDialog = false;
    }
    async handleFileUpload(files: any[]) {
        this.uploadedFiles = files;
      const file  =await convertFilesToBase64(files);
        this.fileRejet=file;
    }
}
