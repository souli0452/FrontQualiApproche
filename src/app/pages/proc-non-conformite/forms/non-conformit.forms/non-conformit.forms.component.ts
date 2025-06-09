import { Component, Input } from '@angular/core';
import { TabPanel, TabView } from 'primeng/tabview';
import { NgPrimeModule } from '../../../../../prime-ng.module';
import { FormArray, FormBuilder, FormGroup, UntypedFormGroup, Validators } from '@angular/forms';
import { nonConformiteForm } from '../../proc-non-conformite.data';
import {
    DemandeNon_conformiteDetailsComponent
} from '../../details/demande.non-conformite.service.details/demande.non_conformite.details.component';
import { EtapeTraitement } from '../../../../enums';
import { MessageService } from 'primeng/api';
import { Chips } from 'primeng/chips';
import { takeUntil } from 'rxjs';
import { StructureService } from '../../../structure/structure-service';

@Component({
    selector: 'app-non-conformit.forms',
    imports: [NgPrimeModule, TabView, TabPanel, DemandeNon_conformiteDetailsComponent, Chips],
    templateUrl: './non-conformit.forms.component.html',
    styleUrl: './non-conformit.forms.component.scss'
})
export class NonConformitFormsComponent {
    @Input() demande: any;
    editForm!: UntypedFormGroup;
    protected readonly BtnActions = EtapeTraitement;
    planActionForm: FormGroup;
    actions: FormArray;
    submitted = false;
    participants:any[]=[];
    constructor(
        private fb: FormBuilder,
        private messageService: MessageService,
    ) {
        this.planActionForm = this.fb.group({
            actions: this.fb.array([this.createAction()])
        });
        this.actions = this.planActionForm.get('actions') as FormArray;
        this.editForm = this.fb.group(nonConformiteForm);
    }
    onInputChange() {
        if (this.demande.etatTraitement === EtapeTraitement.VALIDATION_RS) {
            this.demande.pertinanceRs = this.editForm.get('pertinanceRs')?.value;
            this.demande.justificationRs = this.editForm.get('justificationRs')?.value;
        }
        if (this.demande.etatTraitement === EtapeTraitement.RECEPTION) {
            this.demande.pertinancePilote = this.editForm.get('pertinancePilote')?.value;
            this.demande.justificationPilote = this.editForm.get('justificationPilote')?.value;
        }
        if (this.demande.etatTraitement === EtapeTraitement.SUIVI_RQ) {
            this.demande.pertinanceRsSuivi = this.editForm.get('pertinanceRsSuivi')?.value;
            this.demande.numeroFdac = this.editForm.get('numeroFdac')?.value;
        }
        if (this.demande.etatTraitement === EtapeTraitement.TRAITEMENT) {
            this.demande.delaisMiseOeuvre = this.editForm.get('delaisMiseOeuvre')?.value;
            this.demande.participants = this.editForm.get('participants')?.value;
            this.demande.planActions = this.planActionForm.get('actions')?.value as FormArray;
        }
        console.log(this.demande);
    }
    createAction(): FormGroup {
        return this.fb.group({
            numeroOrdre: ['', Validators.required],
            causeIdentifiees: ['', Validators.required],
            solutionRetenues: ['', Validators.required],
            responsable: ['', Validators.required],
            dateEcheance: ['', Validators.required],
            mail: [''],
            numeroTelephone: [''],
            nonConformiteID:[this.demande?.id]
        });
    }

    addAction(): void {
        this.actions.push(this.createAction());
    }


    removeAction(index: number): void {
        if (this.actions.length > 1) {
            this.actions.removeAt(index);
        } else {
            this.messageService.add({
                severity: 'warn',
                summary: 'Attention',
                detail: 'Vous devez garder au moins une action'
            });
        }
    }
}
