import { Component, Input } from '@angular/core';
import { TabViewModule } from 'primeng/tabview';
import { FormArray, FormBuilder, FormGroup, UntypedFormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Chips } from 'primeng/chips';
import { NgPrimeModule } from '../../../../prime-ng.module';
import { EtapeTraitement } from '../../../enums';
import { Structure } from '../../../pages/structure/structure-config/structure';
import { ActionNonConformite } from '../../../models';
import { AuthService } from '../../../services/auth-services/auth.service';
import { ProcNonConformiteService } from '../../../pages/proc-non-conformite/proc-non-conformite.service';
import { StructureService } from '../../../pages/structure/structure-service/structure-service';
import { ActionNonConformiteService } from '../../../services/action-non-conformite.service';
import { nonConformiteForm } from '../../../pages/proc-non-conformite/proc-non-conformite.data';
import { downloadFile, formatDateToDDMMYYYY, getStatusSeverity } from '../../../utils';
import { DetailsDialogComponent } from '../details-dialog/details-dialog';
import { HttpResponse } from '@angular/common/http';

@Component({
    selector: 'app-form-traitement',
    standalone: true,
    imports: [NgPrimeModule, TabViewModule, DetailsDialogComponent, Chips],
    templateUrl: './form-traitement.html',
    styleUrl: './form-traitement.scss'
})
export class FormTraitementComponent {
    @Input() demande: any;
    editForm!: UntypedFormGroup;
    responsable: any;
    planActions: any[] = [];
    protected readonly BtnActions = EtapeTraitement;
    planActionForm: FormGroup;
    actions: FormArray;
    user: any = {};
    selectedPlans: any = [];
    isEdit: boolean = false;
    submitted = false;
    displayDialog: boolean = false;
    planAction: any = {};
    participants: any[] = [];
    users: any = [];
    usersByStructure: any[] = [];
    afficheDialog: boolean = false;
    structures: Structure[] = [];
    typesActions: ActionNonConformite[] = [];
    constructor(
        private fb: FormBuilder,
        private authService: AuthService,
        private service: ProcNonConformiteService,
        private messageService: MessageService,
        private structureService: StructureService,
        private actionNonConformiteService: ActionNonConformiteService,
    ) {


        this.fetchUsers();
        this.loadStuctures();
        this.fetchActions();
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
        } else {
            this.planActionForm = this.fb.group({
                actions: this.fb.array([this.createAction()])
            });
        }

        this.actions = this.planActionForm.get('actions') as FormArray;
        this.editForm = this.fb.group(nonConformiteForm);
    }

    ngOnInit() {
        if (this.demande) {
            console.log('--- DÉTAILS DE LA NON-CONFORMITÉ ---');
            console.log('Processus Destinataire:', this.demande.origineService);
            console.log('Objet Demande complet:', this.demande);
            console.log('------------------------------------');
            // Préparer les objets pour les sélecteurs
            this.fetchUsersByStructure();
            const patchValues = { ...this.demande };

            if (this.demande.origineId) {
                patchValues.destination = this.structures.find(s => s.id === this.demande.origineId);
            }
            if (this.demande.actionId) {
                patchValues.typeAction = this.typesActions.find(a => a.id === this.demande.actionId);
            }

            this.editForm.patchValue(patchValues);
            if (this.demande.planActions?.length > 0) {
                this.planActions = this.demande.planActions;
            }
            
            // Écouter instantanément toutes les modifications du formulaire
            this.editForm.valueChanges.subscribe(() => {
                this.onInputChange();
            });
        }
    }

    onInputChange() {
        const formValues = this.editForm.value;

        const clean = (val: any) => (val === '' ? null : val);

        // On synchronise les champs de base sans envoyer de chaînes vides ("") 
        // qui font planter la désérialisation Jackson du backend (erreur 400)
        Object.assign(this.demande, {
            pertinanceRs: clean(formValues.pertinanceRs),
            justificationRs: clean(formValues.justificationRs),
            pertinancePilote: clean(formValues.pertinancePilote),
            justificationPilote: clean(formValues.justificationPilote),
            pertinanceRsSuivi: clean(formValues.pertinanceRsSuivi),
            numeroFdac: clean(formValues.numeroFdac),
            participants: formValues.participants ?? [],
            circuit: clean(formValues.circuit)
        });

        // Gestion de la destination
        if (formValues.destination) {
            this.demande.origineId = formValues.destination.id;
            this.demande.origineService = formValues.destination.libelleLong;
            this.demande.origineServiceLibelleCourt = formValues.destination.libelleCourt;
        }

        // Gestion de l'action
        if (formValues.typeAction) {
            this.demande.actionId = formValues.typeAction.id;
            this.demande.actionLibelle = formValues.typeAction.libelle;
        }

        // Note: We no longer sync from planActionForm.actions because plan actions are managed via the dialog and stored directly in this.demande.planActions
    }

    setCircuit(value: string) {
        this.editForm.get('circuit')?.setValue(value);
        this.onInputChange();
    }

    toggleAllPlans(checked: boolean) {
        if (checked) {
            this.selectedPlans = [...this.demande.planActions];
        } else {
            this.selectedPlans = [];
        }
    }

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
            nonConformiteID: [this.demande?.id]
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
                    this.users = this.users.map((user: any) => {
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

    fetchUsersByStructure() {
        if (!this.demande?.origineId) return;

        this.authService
            .loadAgentPublicByService(this.demande.origineId)
            .pipe()
            .subscribe({
                next: (res) => {
                    this.usersByStructure = res || [];
                    this.usersByStructure = this.usersByStructure.map((user: any) => {
                        return {
                            ...user,
                            fullName: user.firstName + ' ' + user.lastName,
                        }
                    });
                    console.log('Utilisateurs récupérés pour la structure:', this.usersByStructure);
                    if (this.planAction?.responsableNomComplet) {
                        this.user = this.usersByStructure.find((user: any) =>
                            user.fullName === this.planAction.responsableNomComplet
                        );
                    }
                },
            });
    }

    loadStuctures() {
        this.structureService
            .getAllStructures()
            .pipe()
            .subscribe({
                next: (resp: HttpResponse<Structure[]>) => {
                    this.structures = resp.body || [];
                    // Ré-essayer le patch si les données arrivent après ngOnInit
                    if (this.demande?.origineId && !this.editForm.get('destination')?.value) {
                        const dest = this.structures.find(s => s.id === this.demande.origineId);
                        if (dest) this.editForm.get('destination')?.patchValue(dest);
                    }
                }
            });
    }

    fetchActions() {
        this.actionNonConformiteService
            .findAll()
            .pipe()
            .subscribe({
                next: (res: HttpResponse<ActionNonConformite[]>) => {
                    this.typesActions = res.body || [];
                    // Ré-essayer le patch si les données arrivent après ngOnInit
                    if (this.demande?.actionId && !this.editForm.get('typeAction')?.value) {
                        const act = this.typesActions.find(a => a.id === this.demande.actionId);
                        if (act) this.editForm.get('typeAction')?.patchValue(act);
                    }
                }
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
    openDialog() {
        this.displayDialog = true;
        this.isEdit = false;
        this.planAction = {}
    }
    edit(plan: any) {
        this.planAction = plan;
        this.planAction.dateEcheance = plan.dateEcheance.replace(/-/g, "/");
        this.displayDialog = true;
        this.fetchUsers();
        this.isEdit = true;


    }
    save() {

        this.planAction.responsableEmail = this.user.email;
        this.planAction.responsableNomComplet = this.user.firstName + ' ' + this.user.lastName;
        this.planAction.responsableId = this.user.id;
        if (!this.isEdit) {
            this.planAction.dateEcheance = formatDateToDDMMYYYY(this.planAction.dateEcheance);
            this.planAction.status = "INACTIF"
            this.planActions.push(this.planAction);

            this.demande.planActions = this.planActions;
            this.displayDialog = false;
        } else {
            console.log(this.planAction)
            this.planAction.dateEcheance = this.planAction.dateEcheance.replace(/\//g, "-");
            this.service.updatePlanAction(this.planAction).subscribe({
                next: (data) => {
                    this.displayDialog = false;

                    this.messageService.add({ severity: 'success', summary: 'Réussi', detail: "L'oppération à réussie !", life: 3000 });
                },
                error: (error) => {
                    this.messageService.add({ severity: 'error', summary: 'ERREUR', detail: "L'oppération à échouée ! Veuillez réessayer 5", life: 3000 });
                }
            })
        }

    }
    delete(plan: any) {
        this.demande.planActions = this.demande.planActions.filter((p: any) => p !== plan);
    }
    hideDialog() {
        this.displayDialog = false;
    }
    affich(action: any) {
        this.planAction = action;
        this.planAction.dateEcheance = action.dateEcheance.replace(/-/g, '/');
        this.afficheDialog = true;
    }
    validerPlans() {
        // Traitement des plans sélectionnés
        console.log('Plans à valider :', this.selectedPlans);
        const dmd = {
            nonConformiteId: this.demande.id,
            planIds: this.selectedPlans.map((plan: { id: any; }) => plan.id)
        }
        this.service.validatePlanAction(dmd).subscribe({
            next: (data) => {
                this.messageService.add({ severity: 'success', summary: 'Réussi', detail: "L'oppération à réussie !", life: 3000 });
                window.location.reload();

            },
            error: (error) => {
                this.messageService.add({ severity: 'error', summary: 'ERREUR', detail: "L'oppération à échouée ! Veuillez réessayer 6", life: 3000 });
            }

        });
    }
    downloadFile(fichier: any) {
        downloadFile(fichier.nomFichier, fichier.fichierBase64);
    }
    hideDialogAffich() {
        this.afficheDialog = false;
    }
}
