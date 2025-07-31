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
import { formatDateToDDMMYYYY, getStatusSeverity } from '../../../../utils';
import { ProcNonConformiteService } from '../../proc-non-conformite.service';

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
    user:any={};
    isEdit:boolean=false;
    submitted = false;
    displayDialog:boolean = false;
    planAction:any={};
    participants:any[]=[];
    users:any=[];
    constructor(
        private fb: FormBuilder,
        private authService: AuthService,
        private service:ProcNonConformiteService,
        private messageService: MessageService,
    ) {


        this.fetchUsers();
        if (this.demande?.planActions?.length > 0) {
            const actionsArray = this.fb.array([]);

            for (let i = 0; i < this.demande.planActions.length; i++) {
                // Ajouter un nouveau FormGroup pour chaque plan d'action existant
                // @ts-ignore
                actionsArray.push(this.createAction(this.demande.planActions[i]));
            }

            this.planActionForm = this.fb.group({
                actions: actionsArray
            });
        }else {
            this.planActionForm = this.fb.group({
                actions: this.fb.array([this.createAction()])
            });
        }

        this.actions = this.planActionForm.get('actions') as FormArray;
        this.editForm = this.fb.group(nonConformiteForm);
    }

    ngOnInit() {
        if (this.demande?.planActions?.length > 0) {
            this.planActions=this.demande.planActions;
        }
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
            this.demande.participants = this.editForm.get('participants')?.value??[];
            const actions = this.planActionForm.get('actions')?.value as any[];  // ou FormArray si besoin
            this.demande.planActions = actions.map(value => {
                return {
                    ...value,
                    dateEcheance: formatDateToDDMMYYYY(value.dateEcheance),
                    responsableEmail: value.responsable?.email,
                    causeIdentifiees:value.causeIdentifiees,
                    solutionRetenues:value.solutionRetenues,
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
                    this.user = this.users.find((user: any) =>
                        user.fullName === this.planAction.responsableNomComplet
                    );


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

    protected readonly getStatusSeverity = getStatusSeverity;
    openDialog(){
        this.displayDialog=true;
        this.isEdit=false;
        this.planAction={}
    }
    edit(plan:any){
        this.planAction=plan;
        this.planAction.dateEcheance=plan.dateEcheance.replace(/-/g, "/");
        this.displayDialog=true;
        this.fetchUsers();
        this.isEdit=true;


    }
    save() {

        this.planAction.responsableEmail=this.user.email;
        this.planAction.responsableNomComplet=this.user.firstName + ' ' + this.user.lastName;
        this.planAction.responsableId=this.user.id;
        if (!this.isEdit) {
            this.planAction.dateEcheance=formatDateToDDMMYYYY(this.planAction.dateEcheance);
            this.planAction.status="NON_TRAITER"
            this.planActions.push(this.planAction);

            this.demande.planActions=this.planActions;
            this.displayDialog=false;
        }else {
            console.log(this.planAction)
            this.planAction.dateEcheance=this.planAction.dateEcheance.replace(/\//g, "-");
            this.service.updatePlanAction(this.planAction).subscribe({
                next: (data) => {
                    this.displayDialog = false;

                    this.messageService.add({ severity: 'success', summary: 'Réussi', detail: "L'oppération à réussie !", life: 3000 });
                },
                error: (error) => {
                    this.messageService.add({ severity: 'error', summary: 'ERREUR', detail: "L'oppération à échouée ! Veuillez réessayer", life: 3000 });
                }
            })
        }

    }
    delete(plan:any) {
      this.demande.planActions=this.demande.planActions.remove(plan);
    }
    hideDialog() {
       this.displayDialog=false;
    }
}
