import { Component, Input, ViewChild } from '@angular/core';
import { TabViewModule } from 'primeng/tabview';
import { FormArray, FormBuilder, FormGroup, UntypedFormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { NgPrimeModule } from '../../../../prime-ng.module';
import { EtapeTraitement } from '../../../enums/enums';
import { AuthService } from '../../../services/auth-services/auth.service';
import { ActionNonConformiteService } from '../../../services/non-conformite/action-non-conformite.service';
import { getStatusSeverity } from '../../../utils/global/global-utils';
import { DetailsDialogComponent } from '../details-dialog/details-dialog';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { LightboxComponent } from '../lightbox/lightbox';
import { Structure } from '../../../pages/parametrages/structure/structure-config/structure';
import { StructureService } from '../../../pages/parametrages/structure/structure-service/structure-service';
import { ProcNonConformiteService } from '../../../services/non-conformite/proc-non-conformite.service';
import { nonConformiteForm } from '../config/proc-non-conformite.data';
import { ApiResponse } from '../../../models/response.model';
import { ActionNonConformite } from '../../../models/non-conformite.model';
import { PieceJointeFichierService } from '../../../services/non-conformite/piece-jointe-fichier.service';
import { PlanActionService } from '../../../services/non-conformite/planAction.service';
import { WorkflowActionsComponent } from '../../../shared/workflow/workflow-actions.component';
import { WorkflowGuidanceComponent } from '../../../shared/workflow/workflow-guidance.component';
import { WorkflowHistoriqueComponent } from '../../../shared/workflow/workflow-historique.component';
import { formatDateToDDMMYYYY } from '../../../utils/formatage/formatage-utils';

@Component({
    selector: 'app-form-traitement',
    standalone: true,
    imports: [NgPrimeModule, TabViewModule, DetailsDialogComponent, LightboxComponent, WorkflowActionsComponent,
        WorkflowGuidanceComponent, WorkflowHistoriqueComponent],
    templateUrl: './form-traitement.html',
    styleUrl: './form-traitement.scss'
})
export class FormTraitementComponent {
    @Input()
    selectedData: any;
    @ViewChild(LightboxComponent) maLightbox!: LightboxComponent;

    @Input() demande: any;
    editForm!: UntypedFormGroup;
    responsable: any;
    planActions: any[] = [];
    protected readonly BtnActions = EtapeTraitement;
    planActionForm: FormGroup;
    actions: FormArray;
    user: any = {};

    isEdit: boolean = false;
    submitted = false;
    displayDialog: boolean = false;
    planAction: any = {};
    participants: any[] = [];
    users: any = [];
    usersByStructure: any[] = [];
    /**
     * Rang saisi pour l'action en cours de définition.
     *
     * <p>Séparé de {@code planAction.numeroOdre}, que le serveur écrit en chaîne : laissé vide, il
     * place l'action à la suite des autres.</p>
     */
    ordreSaisi: number | null = null;
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
        private fichiers: PieceJointeFichierService,
        private planActionService: PlanActionService,
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

        // Gestion de l'action (Valeur par défaut temporaire)
        // if (formValues.typeAction) {
        //     this.demande.actionId = formValues.typeAction.id;
        //     this.demande.actionLibelle = formValues.typeAction.libelle;
        // } else {
        //     if (this.typesActions && this.typesActions.length > 0) {
        //         this.demande.actionId = this.typesActions[0].id;
        //         this.demande.actionLibelle = this.typesActions[0].libelle;
        //     } else {
        //         this.demande.actionId = null;
        //         this.demande.actionLibelle = null;
        //     }
        // }

        if (formValues.typeAction) {
            this.demande.actionId = formValues.typeAction.id;
            this.demande.actionLibelle = formValues.typeAction.libelle;
        } else {
            this.demande.actionId = null;
            this.demande.actionLibelle = null;
        }

        // Note: We no longer sync from planActionForm.actions because plan actions are managed via the dialog and stored directly in this.demande.planActions
    }

    setCircuit(value: string) {
        this.editForm.get('circuit')?.setValue(value);
        this.onInputChange();
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
            critereEfficacite: [''],
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
                    this.users = res.data.content || [];
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
                    this.usersByStructure = res.data.content || [];
                    this.usersByStructure = this.usersByStructure.map((user: any) => {
                        return {
                            ...user,
                            fullName: user.firstName + ' ' + user.lastName,
                        }
                    });
                    if (this.planAction?.responsableNomComplet) {
                        this.user = this.usersByStructure.find((user: any) =>
                            user.fullName === this.planAction.responsableNomComplet
                        );
                    }
                },
            });
    }

    // loadStuctures() {
    //     this.structureService
    //         .getAllStructures()
    //         .pipe()
    //         .subscribe({
    //             next: (resp: HttpResponse<Structure[]>) => {
    //                 this.structures = resp.body || [];
    //                 // Ré-essayer le patch si les données arrivent après ngOnInit
    //                 if (this.demande?.origineId && !this.editForm.get('destination')?.value) {
    //                     const dest = this.structures.find(s => s.id === this.demande.origineId);
    //                     if (dest) this.editForm.get('destination')?.patchValue(dest);
    //                 }
    //             }
    //         });
    // }

loadStuctures() {
    this.structureService
        .getAllStructures(0, 1000) // On demande une large plage pour tout récupérer
        .subscribe({
            next: (resp: ApiResponse<Structure>) => {
                // 'resp' est de type ApiResponse<Structure>
                // On accède à 'data' puis 'content'
                this.structures = resp.data.content || [];

                // Ré-essayer le patch
                if (this.demande?.origineId && !this.editForm.get('destination')?.value) {
                    const dest = this.structures.find(s => s.id === this.demande.origineId);
                    if (dest) {
                        this.editForm.get('destination')?.patchValue(dest);
                    }
                }
            },
            error: (error: HttpErrorResponse) => {
                console.error("Erreur lors du chargement:", error);
            }
        });
}

    // fetchActions() {
    //     this.actionNonConformiteService
    //         .findAll()
    //         .subscribe({
    //             next: (res: HttpResponse<ActionNonConformite[]>) => {
    //                 this.typesActions = res.body || [];
    //                 // Ré-essayer le patch si les données arrivent après ngOnInit
    //                 if (this.demande?.actionId && !this.editForm.get('typeAction')?.value) {
    //                     const act = this.typesActions.find(a => a.id === this.demande.actionId);
    //                     if (act) this.editForm.get('typeAction')?.patchValue(act);
    //                 }
    //             }
    //         });
    // }

    fetchActions() {
    this.actionNonConformiteService
        .findAll()
        .subscribe({
            next: (res) => {
                this.typesActions = res.data.content || [];

                // Patch sélection automatique
                if (this.demande?.actionId && !this.editForm.get('typeAction')?.value) {
                    const act = this.typesActions.find(a => a.id === this.demande.actionId);
                    if (act) {
                        this.editForm.get('typeAction')?.patchValue(act);
                    }
                }
            },
            error: (error: HttpErrorResponse) => {
                console.error(error);
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
        this.user = undefined;
        
        // Le rang est attribué par le serveur à l'enregistrement, à moins qu'on ne le saisisse.
        // Le calculer ici revenait à le déduire de ce que cet écran a sous les yeux, et un plan
        // créé autrement n'en recevait aucun.
        this.planAction = {};
        this.ordreSaisi = null;
    }
    edit(plan: any) {
        // Create a copy so we don't mutate the original directly if the user cancels
        this.planAction = { ...plan };
        this.ordreSaisi = this.rangDe(plan.numeroOdre);
        
        // Convert string to a real Date object for the p-datePicker
        if (this.planAction.dateEcheance) {
            if (typeof this.planAction.dateEcheance === 'string') {
                const parts = this.planAction.dateEcheance.split(/-|\//);
                if (parts.length === 3) {
                    if (parts[2].length === 4) {
                        this.planAction.dateEcheance = new Date(+parts[2], +parts[1] - 1, +parts[0]);
                    } else if (parts[0].length === 4) {
                        this.planAction.dateEcheance = new Date(+parts[0], +parts[1] - 1, +parts[2]);
                    } else {
                        this.planAction.dateEcheance = new Date(this.planAction.dateEcheance);
                    }
                } else {
                    this.planAction.dateEcheance = new Date(this.planAction.dateEcheance);
                }
            } else {
                this.planAction.dateEcheance = new Date(this.planAction.dateEcheance);
            }
        }

        this.displayDialog = true;
        this.fetchUsers();
        this.isEdit = true;


    }
    save() {
        // Le responsable n'est plus exigé à l'écriture de l'action : l'agent imputé peut le
        // désigner s'il le connaît, et le pilote le désigne ou le corrige à la validation. Le
        // circuit, lui, refuse de valider tant qu'une action reste sans responsable — la règle est
        // portée là où elle vaut pour tout le dossier, non par un écran de saisie.
        if (this.user) {
            this.planAction.responsableEmail = this.user.email;
            this.planAction.responsableNomComplet = this.user.firstName + ' ' + this.user.lastName;
            this.planAction.responsableId = this.user.id;
        }
        
        // Toujours formater la date pour le backend, qu'on soit en création ou en modification
        this.planAction.dateEcheance = formatDateToDDMMYYYY(this.planAction.dateEcheance);

        // Vide, le serveur place l'action à la suite des autres.
        this.planAction.numeroOdre = this.ordreSaisi != null ? String(this.ordreSaisi) : null;

        if (!this.isEdit) {
            // Enregistré tout de suite, et non gardé en mémoire jusqu'à la soumission : le bouton
            // qui persistait la fiche a cédé la place à la décision du circuit, et une saisie
            // seulement locale aurait été perdue sans que rien ne le dise.
            this.planAction.status = "INACTIF";
            this.planAction.nonConformeId = this.demande.id;
            this.service.createPlanAction(this.planAction).subscribe({
                next: (reponse: any) => {
                    // Le serveur enveloppe ses réponses : sans déballer `data`, c'est l'enveloppe
                    // qui atterrissait dans le tableau — une ligne apparaissait, vide de tout.
                    const enregistre = reponse?.body?.data ?? reponse?.body ?? this.planAction;
                    this.demande.planActions = [...(this.demande.planActions ?? []), enregistre];
                    this.planActions = this.demande.planActions;
                    this.displayDialog = false;
                    this.messageService.add({
                        severity: 'success', summary: 'Plan d\'action enregistré',
                        detail: "Il sera soumis au pilote avec le traitement.", life: 4000
                    });
                },
                error: () => {
                    this.messageService.add({
                        severity: 'error', summary: 'ERREUR',
                        detail: "Le plan d'action n'a pas pu être enregistré.", life: 5000
                    });
                }
            });
        } else {
            if (this.planAction.id) {
                this.service.updatePlanAction(this.planAction).subscribe({
                    next: (reponse: any) => {
                        // Par l'identifiant, et non par le numéro d'ordre : celui-ci n'est qu'un
                        // rang, que deux plans peuvent partager — la modification retombait alors
                        // sur la mauvaise ligne.
                        const index = this.demande.planActions.findIndex((p: any) => p.id === this.planAction.id);
                        if (index !== -1) {
                            this.demande.planActions[index] = reponse?.body?.data ?? this.planAction;
                        }
                        this.displayDialog = false;
                        this.messageService.add({ severity: 'success', summary: 'Réussi', detail: "L'opération a réussi !", life: 3000 });
                    },
                    error: (error) => {
                        this.messageService.add({ severity: 'error', summary: 'ERREUR', detail: "L'opération a échoué ! Veuillez vérifier le format des données.", life: 3000 });
                    }
                });
            } else {
                // Plan n'a pas encore d'ID (créé localement)
                const index = this.demande.planActions.findIndex((p: any) => p.numeroOdre === this.planAction.numeroOdre);
                if (index !== -1) {
                    this.demande.planActions[index] = this.planAction;
                }
                this.displayDialog = false;
            }
        }

    }
    /**
     * Retire un plan d'action qui vient d'être défini.
     *
     * <p>Le plan est enregistré dès son ajout : le retirer du seul tableau affiché le laissait en
     * base, et il réapparaissait au rechargement. Un plan déjà confié à son responsable n'est plus
     * retirable — le serveur le refuse, et le bouton ne s'affiche pas.</p>
     */
    delete(plan: any) {
        if (!plan?.id) {
            this.demande.planActions = this.demande.planActions.filter((p: any) => p !== plan);
            return;
        }
        this.service.deletePlanAction(plan.id).subscribe({
            next: () => {
                this.demande.planActions = this.demande.planActions.filter((p: any) => p.id !== plan.id);
                this.planActions = this.demande.planActions;
                this.messageService.add({
                    severity: 'success', summary: 'Plan d\'action retiré',
                    detail: "L'action a été retirée du dossier.", life: 3000
                });
            },
            error: (erreur: any) => {
                this.messageService.add({
                    severity: 'error', summary: 'Retrait impossible',
                    detail: erreur?.error?.message || "Ce plan d'action ne peut plus être retiré.",
                    life: 6000
                });
            }
        });
    }

    /**
     * Où en est une action, dit en clair.
     *
     * <p>Avant d'être confiée à son responsable, une action n'a pas de circuit : la colonne
     * affichait alors un statut technique — {@code INACTIF} — qui ne veut rien dire pour qui lit la
     * fiche. Une action proposée n'est pas une action en panne, c'est une action qui attend la
     * validation qualité pour être engagée.</p>
     */
    etapeDuPlan(plan: any): string {
        if (!plan?.workflowId) {
            return 'Proposée';
        }
        return plan.workflowState?.currentStateName || plan.workflowStatus || plan.status || 'En cours';
    }

    /** Couleur de la pastille d'étape : neutre tant que l'action n'est pas engagée. */
    couleurEtapeDuPlan(plan: any): string {
        return plan?.workflowId ? getStatusSeverity(plan.status) : 'secondary';
    }

    /**
     * Relit une action après une décision de son circuit.
     *
     * <p>Les actions ouvertes à l'appelant changent avec l'étape : sans relecture, la fiche
     * proposerait encore la décision qui vient d'être prise.</p>
     */
    apresDecisionSurLePlan(plan: any) {
        if (!plan?.id) {
            return;
        }
        this.planActionService.relire(plan.id).subscribe({
            next: (relu: any) => {
                const index = this.demande.planActions.findIndex((p: any) => p.id === plan.id);
                if (index !== -1 && relu) {
                    this.demande.planActions[index] = { ...this.demande.planActions[index], ...relu };
                    this.planAction = this.demande.planActions[index];
                }
            },
            error: () => this.messageService.add({
                severity: 'warn', summary: 'Actualisation impossible',
                detail: "La décision est enregistrée, mais l'action affichée n'a pas pu être relue.",
                life: 5000
            })
        });
    }

    /** Rang lisible dans un numéro d'ordre, y compris hérité du format « P-A-3 ». */
    private rangDe(numero: any): number | null {
        if (numero === null || numero === undefined) {
            return null;
        }
        const chiffres = String(numero).replace(/\D/g, '');
        return chiffres ? Number(chiffres) : null;
    }

    /**
     * Un plan est-il encore modifiable depuis la fiche ?
     *
     * <p>Deux conditions, et elles ne disent pas la même chose. Le plan doit être une
     * <b>proposition</b> — non encore confié à son responsable, sans quoi le corriger ici
     * déplacerait la responsabilité sans que le circuit en sache rien. Et l'on doit se trouver à
     * l'étape où le dossier se traite : les autres étapes affichent les plans pour qu'on en juge,
     * non pour qu'on les réécrive. Voir n'est pas décider.</p>
     */
    estModifiable(plan: any): boolean {
        if (plan?.workflowId) {
            return false;
        }
        // L'agent écrit l'action au traitement ; le pilote la relit et désigne son responsable à la
        // validation. Passé ces deux étapes, l'action est engagée et relève de son propre circuit.
        return this.demande?.etatTraitement === this.BtnActions.TRAITEMENT
            || this.demande?.etatTraitement === this.BtnActions.VALIDATION;
    }

    /** À la validation, le pilote ne reprend pas la description de l'action : il en nomme le responsable. */
    get designationSeule(): boolean {
        return this.demande?.etatTraitement === this.BtnActions.VALIDATION;
    }
    hideDialog() {
        this.displayDialog = false;
    }
    affich(action: any) {
        this.planAction = action;
        // Une action sans échéance ne doit pas empêcher d'ouvrir son détail : la lecture n'a pas à
        // exiger ce que la saisie n'a pas encore fourni.
        if (typeof action?.dateEcheance === 'string') {
            this.planAction.dateEcheance = action.dateEcheance.replace(/-/g, '/');
        }
        this.afficheDialog = true;
    }
    /**
     * Télécharge une pièce jointe.
     *
     * <p>Le contenu ne voyage plus avec le dossier : il est demandé au serveur au moment du clic.
     * Le service accepte aussi une pièce que l'utilisateur vient de choisir, laquelle n'est pas
     * encore enregistrée et n'a donc rien à demander.</p>
     */
    downloadFile(fichier: any) {
        this.fichiers.telecharger(fichier);
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

    hideDialogAffich() {
        this.afficheDialog = false;
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
}
