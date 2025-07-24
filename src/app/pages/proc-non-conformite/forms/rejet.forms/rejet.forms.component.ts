import {Component, EventEmitter, Input, Output} from '@angular/core';
import { ProcNonConformiteService } from '../../proc-non-conformite.service';
import { EtapeTraitement } from '../../../../enums';
import { NgPrimeModule } from '../../../../../prime-ng.module';

@Component({
    selector: 'app-rejet',
    templateUrl: './rejet.forms.component.html',
    imports: [NgPrimeModule],
    styleUrl: './rejet.forms.component.scss'
})
export class RejetFormsComponent {
    @Input() demande!: any;
    @Input() motifRejetDialog: boolean = false;
    isSummited: boolean = false;
    rejet: String = "";
    etape !: EtapeTraitement ;
    @Output() onSuccess = new EventEmitter<any>();

    constructor(private service: ProcNonConformiteService) {}

    rejetDemande() {
        this.isSummited = true;
        console.log(this.demande)
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
const dmd={ id:this.demande.id,
    etapeTraitement:this.etape,
    rejectReason:this.rejet
}
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
}
