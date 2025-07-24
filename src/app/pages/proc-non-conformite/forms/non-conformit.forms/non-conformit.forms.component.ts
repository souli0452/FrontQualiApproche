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
import { AuthService } from '../../../../services/auth-services/auth.service';
import { formatDate } from '@angular/common';
import { formatDateToDDMMYYYY } from '../../../../utils';

@Component({
    selector: 'app-non-conformit.forms',
    imports: [NgPrimeModule, TabView, TabPanel, DemandeNon_conformiteDetailsComponent, Chips],
    templateUrl: './non-conformit.forms.component.html',
    styleUrl: './non-conformit.forms.component.scss'
})
export class NonConformitFormsComponent {
    @Input() demande: any;
    editForm!: UntypedFormGroup;
    responsable:any;
    planActions:any[]=[];
    protected readonly BtnActions = EtapeTraitement;
    planActionForm: FormGroup;
    actions: FormArray;
    submitted = false;
    participants:any[]=[];
    users:any=[];
    constructor(
        private fb: FormBuilder,
        private authService: AuthService,
        private messageService: MessageService,
    ) {
        this.fetchUsers();
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
            this.demande.participants = this.editForm.get('participants')?.value;
            const actions = this.planActionForm.get('actions')?.value as any[];  // ou FormArray si besoin
            this.demande.planActions = actions.map(value => {
                return {
                    ...value,
                    dateEcheance: formatDateToDDMMYYYY(value.dateEcheance),
                    responsableEmail: value.responsable?.email,
                    responsableNomComplet: `${value.responsable?.firstName ?? ''} ${value.responsable?.lastName ?? ''}`,
                    responsableId: value.responsable?.id,
                    status:"NON_TRAITER"
                };
            });
        }}

    createAction(): FormGroup {
        return this.fb.group({
            numeroOdre: ['', Validators.required],
            causeIdentifiees: [''],
            solutionRetenues: [''],
            responsable: ['', Validators.required],
            dateEcheance: ['', Validators.required],
            mail: [''],
            numeroTelephone: [],
            responsableId: [''],
            responsableNomComplet: [''],
            responsableEmail: [''],
            nonConformiteID:[this.demande?.id]
        });
    }
    addAction(): void {
        this.actions.push(this.createAction());
    }
    fetchUsers() {
        this.authService
            .getAllUsers()
            .pipe()
            .subscribe({
                next: (res) => {
                    this.users = res.body || [];
                    this.users=this.users.map((user:any) => {
                      return {
                          ...user,
                          fullName: user.firstName + ' ' + user.lastName,
                      }

                    });
                    console.log(this.users)
                },
            });
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
