import { Component, Input, ViewChild } from '@angular/core';
import { FormBuilder, UntypedFormGroup } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { NgPrimeModule } from '@prime-ng';
import { EtapeTraitement, ActionNonConformite } from '../../models';
import { AuthService } from '@core/auth';
import { 
    ActionNonConformiteService, 
    ProcNonConformiteService, 
    PieceJointeFichierService, 
    PlanActionService 
} from '../../services';
import { getStatusSeverity } from '../../utils';
import { DetailsDialogComponent } from '../details-dialog/details-dialog';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { LightboxComponent } from '../lightbox/lightbox';
import { nonConformiteForm } from '../config/proc-non-conformite.data';
import { ApiResponse } from '../../../../models/response.model';
import { 
    WorkflowActionsComponent, 
    WorkflowGuidanceComponent, 
    WorkflowHistoriqueComponent 
} from '@features/workflow';
import { formatDateToDDMMYYYY } from '../../../../utils/formatage/formatage-utils';
import { map } from 'rxjs';
import { Structure, StructureService } from '@features/organigramme';

@Component({
    selector: 'app-form-traitement',
    standalone: true,
    // TabViewModule est absent volontairement : son `p-tabPanel` et le `p-tabpanel` de TabsModule
    // — que NgPrimeModule expose — désignent la même balise aux yeux du parseur HTML, qui ignore la
    // casse. Angular refusait alors de trancher (NG0300) et le composant ne s'affichait plus.
    imports: [NgPrimeModule, DetailsDialogComponent, LightboxComponent, WorkflowActionsComponent,
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
    user: any = undefined;

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
    readonly deposerFichierDEtape = (fichier: File) =>
        this.planActionService.deposerFichier(this.planAction.id, fichier).pipe(
            map((reponse: any) => reponse?.url || reponse?.id || `${reponse}`)
        );
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
            // Les participants sont saisis à part, hors du formulaire réactif : ils s'enregistrent
            // au fil de l'eau, la fiche n'ayant plus de bouton qui la persiste en bloc.
            this.participants = [...(this.demande.participants ?? [])];
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
            pertinanceRs: clean(formValues.pertinenceRs),
            justificationRs: clean(formValues.justificationRs),
            pertinancePilote: clean(formValues.pertinencePilote),
            justificationPilote: clean(formValues.justificationPilote),
            pertinanceRsSuivi: clean(formValues.pertinanceRsSuivi),
            numeroFdac: clean(formValues.numeroFdac),
            // Les participants ne sont plus repris d'ici : le formulaire réactif porte un contrôle
            // du même nom, qu'aucun champ ne remplit et qui vaut donc [''] — il écrasait la liste
            // saisie à côté par un participant sans nom.
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

    }

     private extractUserInfos(u: any): any {
         const userObj = u.user ? u.user : u;
         const id = userObj.userId || userObj.id || u.id || '';
         const firstName = userObj.firstName || '';
         const lastName = userObj.lastName || '';
         const email = userObj.email || '';
         const fullName = `${firstName} ${lastName}`.trim() || userObj.username || id;
         return {
             ...u,
             id,
             firstName,
             lastName,
             email,
             fullName
         };
     }

     getResponsableName(plan: any): string {
         if (!plan) return '—';
         // 1. Try nested object
         if (plan.responsable?.nomComplet) {
             return plan.responsable.nomComplet;
         }
         // 2. Try flat name field
         if (this.isNameValid(plan.responsableNomComplet)) {
             return plan.responsableNomComplet;
         }
         // 3. Try to resolve it locally from the loaded usersByStructure list by email
         const email = plan.responsableEmail || plan.responsable?.email;
         if (email) {
             const found = this.usersByStructure.find(u => u.email === email);
             if (found && this.isNameValid(found.fullName)) {
                 return found.fullName;
             }
             // 4. Fallback to username from email
             const parts = email.split('@');
             return parts[0];
         }
         return '—';
     }

     getResponsableInitials(plan: any): string {
         const name = this.getResponsableName(plan);
         return this.getInitials(name);
     }

     fetchUsers() {
         this.authService
             .getAllUsers()
             .pipe()
             .subscribe({
                 next: (res: any) => {
                     const list = res.data?.content || res.content || [];
                     this.users = list.map((user: any) => this.extractUserInfos(user));
                     this.user = this.users.find((user: any) =>
                         user.fullName === this.planAction.responsableNomComplet
                     );
                 },
             });
     }

     fetchUsersByStructure() {
         // Essayer origineId en priorité, sinon utiliser structureSoumissionId
         const structureId = this.demande?.origineId || this.demande?.structureDeSoumissionId;

         console.log("🔍 fetchUsersByStructure() appelé !");
         console.log("   - ID de structure retenu pour le filtre :", structureId);

         if (!structureId) {
             console.log("   ⚠️ Annulation : aucun ID de structure trouvé.");
             return;
         }

         this.authService
             .loadAgentPublicByService(structureId)
             .pipe()
             .subscribe({
                 next: (res: any) => {
                     console.log("✅ Réponse de loadAgentPublicByService :", res);
                     
                     const list = res.data?.content || res.content || [];
                     this.usersByStructure = list.map((user: any) => this.extractUserInfos(user));
                     
                     // Pre-select the user: first match by email, otherwise fallback to fullName
                     if (this.planAction?.responsableEmail) {
                         this.user = this.usersByStructure.find((user: any) =>
                             user.email === this.planAction.responsableEmail
                         );
                     }
                     if (!this.user && this.isNameValid(this.planAction?.responsableNomComplet)) {
                         this.user = this.usersByStructure.find((user: any) =>
                             user.fullName === this.planAction.responsableNomComplet
                         );
                     }
                 },
             });
     }



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
     private isNameValid(name: string | null | undefined): boolean {
         if (!name) return false;
         const cleaned = name.trim().toLowerCase();
         return cleaned !== '' && cleaned !== 'undefined undefined' && cleaned !== 'null null' && cleaned !== 'undefined' && cleaned !== 'null';
     }

     edit(plan: any) {
         // Create a copy so we don't mutate the original directly if the user cancels
         this.planAction = { ...plan };
         this.ordreSaisi = this.rangDe(plan.numeroOdre);
         this.user = undefined; // Reset current selected user
         
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
         this.fetchUsersByStructure();
         this.isEdit = true;
     }
     save() {
         // Le responsable n'est plus exigé à l'écriture de l'action : l'agent imputé peut le
         // désigner s'il le connaît, et le pilote le désigne ou le corrige à la validation. Le
         // circuit, lui, refuse de valider tant qu'une action reste sans responsable — la règle est
         // portée là où elle vaut pour tout le dossier, non par un écran de saisie.
         if (this.user && this.user.id) {
             this.planAction.responsableEmail = this.user.email;
             this.planAction.responsableNomComplet = this.user.fullName || (this.user.firstName + ' ' + this.user.lastName);
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
                             const updated = reponse?.body?.data ?? reponse?.body ?? this.planAction;
                             if (this.user) {
                                 updated.responsable = {
                                     id: this.user.id,
                                     nomComplet: this.user.fullName,
                                     email: this.user.email
                                 };
                             }
                             const validName = this.isNameValid(updated.responsableNomComplet) 
                                 ? updated.responsableNomComplet 
                                 : (this.isNameValid(this.planAction.responsableNomComplet) ? this.planAction.responsableNomComplet : '');
                             this.demande.planActions[index] = {
                                 ...this.planAction,
                                 ...updated,
                                 responsableNomComplet: validName,
                                 responsableEmail: updated.responsableEmail || this.planAction.responsableEmail
                             };
                             this.demande.planActions = [...this.demande.planActions];
                             this.planActions = this.demande.planActions;
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
                     this.demande.planActions = [...this.demande.planActions];
                     this.planActions = this.demande.planActions;
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
        return this.demande?.etatDeTraitement === this.BtnActions.TRAITEMENT
            || this.demande?.etatDeTraitement === this.BtnActions.VALIDATION;
    }

    /** À la validation, le pilote ne reprend pas la description de l'action : il en nomme le responsable. */
    get designationSeule(): boolean {
        return this.demande?.etatDeTraitement === this.BtnActions.VALIDATION;
    }

    /**
     * Enregistre les participants à l'analyse dès qu'un nom est ajouté ou retiré.
     *
     * <p>La fiche n'a plus de bouton d'enregistrement — les boutons statiques ont cédé la place aux
     * décisions du circuit — et une saisie seulement locale se perdrait au premier rechargement,
     * sans que rien ne le dise. Les autres champs de la fiche sont des champs d'étape, recueillis
     * par le dialogue de décision ; les participants, eux, appartiennent au dossier et se
     * complètent au fil de l'analyse, avant même qu'aucune décision ne soit prise.</p>
     */
    enregistrerLesParticipants() {
        if (!this.demande?.id) {
            return;
        }
        // Seuls les participants : la fiche entière porterait avec elle des champs que d'autres
        // écrans saisissent, et les écraserait au passage.
        this.service.updateNomConformite(
            { id: this.demande.id, participants: this.participants ?? [] }, this.demande.id).subscribe({
            next: () => this.demande.participants = this.participants ?? [],
            error: () => this.messageService.add({
                severity: 'error', summary: 'Enregistrement impossible',
                detail: "Les participants n'ont pas pu être enregistrés.", life: 5000
            })
        });
    }

    /**
     * La cause est-elle demandée sur ce dossier ?
     *
     * <p>Elle dépend du circuit de traitement retenu par le responsable qualité. En
     * <b>correction</b>, on remet en conformité ce qui ne l'était pas sans avoir à remonter à ce
     * qui l'a produit : la colonne n'existe pas, et la présenter ferait écrire n'importe quoi pour
     * remplir le formulaire. En <b>action corrective</b>, elle est le cœur du sujet — une action
     * corrective qui ne vise aucune cause n'est qu'une correction déguisée.</p>
     *
     * <p>Un dossier qui ne porte pas encore de circuit la demande : c'est la plus exigeante des deux
     * lectures, et mieux vaut la recueillir à tort que découvrir plus tard qu'elle manque.</p>
     */
    get causeDemandee(): boolean {
        return this.demande?.circuit !== 'CORRECTION';
    }

    /**
     * Ce qui manque encore à l'action en cours de saisie.
     *
     * <p>Un plan se soumet entier : le supérieur ne peut se prononcer que sur une action dont il
     * lit la cause, la solution retenue, l'échéance et le critère auquel le résultat sera
     * confronté. Le dire ici, pendant la saisie, plutôt que de laisser l'utilisateur buter sur une
     * transition fermée trois écrans plus loin.</p>
     *
     * <p>Le responsable n'en fait pas partie : la personne imputée ne le connaît pas toujours, et
     * c'est le pilote qui le désigne à la validation.</p>
     */
    get colonnesManquantes(): string[] {
        const vide = (valeur: any) => !valeur || String(valeur).trim() === '';
        const manquantes: string[] = [];

        // if (vide(this.planAction?.actionCorrective)) {
        //     manquantes.push("l'action proposée");
        // }
        if (this.causeDemandee && vide(this.planAction?.causeIdentifiees)) {
            manquantes.push('la cause');
        }
        if (vide(this.planAction?.solutionRetenues)) {
            manquantes.push('la solution retenue');
        }
        if (!this.planAction?.dateEcheance) {
            manquantes.push("l'échéance");
        }
        if (vide(this.planAction?.critereEfficacite)) {
            manquantes.push("le critère d'efficacité");
        }
        return manquantes;
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

    rowMenuItems: any[] = [];

    buildRowMenu(plan: any) {
        this.rowMenuItems = [
            {
                label: 'Détails',
                icon: 'pi pi-search',
                command: () => this.affich(plan)
            }
        ];

        if (this.estModifiable(plan)) {
            this.rowMenuItems.push({
                label: this.designationSeule ? 'Attribuer à un autre responsable' : 'Modifier',
                icon: 'pi pi-pencil',
                command: () => this.edit(plan)
            });

            if (!this.designationSeule) {
                this.rowMenuItems.push({
                    label: 'Retirer',
                    icon: 'pi pi-trash text-red-500',
                    command: () => this.delete(plan)
                });
            }
        }
    }

    getInitials(name: any): string {
        if (!name || typeof name !== 'string') return 'U';
        return name.trim().charAt(0).toUpperCase();
    }
}
