import {Component, EventEmitter, Input, Output} from '@angular/core';
import { EtapeTraitement } from '../../../enums/enums';
import { NgPrimeModule } from '../../../../prime-ng.module';
import { FileUploadComponent } from '../file-upload/file-upload.component';
import { ProcNonConformiteService } from '../../../services/non-conformite/proc-non-conformite.service';
import { convertFilesToBase64 } from '../../../utils/fichier/fichier-utils';

@Component({
    selector: 'app-form-rejet',
    templateUrl: './form-rejet.html',
    imports: [NgPrimeModule, FileUploadComponent]
})
export class FormRejetComponent {
    @Input() demande!: any;
    @Input() motifRejetDialog: boolean = false;
    isSummited: boolean = false;
    rejet: String = '';
    etape!: EtapeTraitement;
    fileRejet:any;
    @Output() onSuccess = new EventEmitter<any>();
    private uploadedFiles: any[]=[];

    constructor(private service: ProcNonConformiteService) {}

    rejetDemande() {
        this.isSummited = true;
        console.log("LA DEMANDE REJETEE", this.demande);
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
                this.motifRejetDialog = false;
                this.isSummited = false;
                this.reloadIfSuccess();
            },
            error: (error) => {
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
