import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Subject, takeUntil } from 'rxjs';

import { NgPrimeModule } from '../../../../prime-ng.module';
import { AppCrudGenericComponent } from '../../../components/app-crud-generic/app-crud-generic.component';
import { TableColumn } from '../../../models/generique.model';
import { hasAnyPermission } from '../../../utils/auth/auth-utils';
import { AppRoleService } from '../../role/role-service/role.service';
import { WorkflowStepTemplateService } from '../../../services/module-gestion-documentaire/workflow-step-template.service';
import { WorkflowError, WorkflowService } from '../../../services/workflow.service';
import { WorkflowStepTemplate } from '../../../models/gestion-documentaire.model';
import {
  EmailTemplateDto,
  StepDecision,
  WorkflowDto,
  WorkflowStepDto,
  WorkflowTransitionDto
} from '../../../models/workflow.model';

/** Option de liste déroulante. */
interface Option<T = string> {
  label: string;
  value: T;
}

/**
 * Ligne du tableau : le circuit, augmenté de ce que la colonne affiche telle quelle.
 *
 * Le tableau générique lit la valeur brute du champ désigné par la colonne — il n'appelle aucune
 * méthode du composant. Le libellé du type de ressource et le nombre d'étapes sont donc calculés
 * ici, au moment du filtrage.
 */
type LigneCircuit = WorkflowDto & { typeLibelle: string; nbEtapes: number };

/**
 * Identifiant local d'une étape, le temps de la saisie.
 *
 * Les transitions doivent pouvoir désigner une étape qui n'existe pas encore côté serveur, donc
 * sans identifiant ni code. Ce jeton tient ce rôle pendant l'édition ; il est traduit en code
 * d'étape au moment d'enregistrer.
 */
function nouvelIdentifiantLocal(): string {
  return (crypto as any)?.randomUUID
    ? crypto.randomUUID()
    : `etape-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Même normalisation que le serveur (`WorkflowService.normaliserCode`) : majuscules, accents
 * retirés, séparateurs réduits au souligné, longueur bornée.
 *
 * Elle est reproduite ici pour que le code annoncé à l'enregistrement soit exactement celui que
 * le serveur retiendra : les transitions désignent l'étape par ce code, et une divergence
 * enverrait la destination sur une autre étape.
 */
function normaliserCode(valeur: string | null | undefined): string {
  if (!valeur || !valeur.trim()) {
    return 'ETAPE';
  }
  const normalise = valeur
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  if (!normalise) {
    return 'ETAPE';
  }
  return normalise.length > 60 ? normalise.slice(0, 60) : normalise;
}

/**
 * Premier code libre à partir de `base`, suffixé au besoin — la règle du serveur, là encore.
 *
 * Une même entrée de catalogue peut légitimement servir deux fois dans un circuit (deux
 * vérifications successives) ; leurs codes doivent pourtant différer, faute de quoi rien ne
 * distinguerait les deux étapes comme destination d'une transition.
 */
function codeDisponible(base: string, dejaPris: Set<string>): string {
  if (!dejaPris.has(base)) {
    return base;
  }
  for (let suffixe = 2; ; suffixe++) {
    const candidat = `${base}_${suffixe}`;
    if (!dejaPris.has(candidat)) {
      return candidat;
    }
  }
}

/**
 * Éditeur unique des circuits de validation, tous types de ressource confondus.
 *
 * Quatre écrans faisaient ce travail en parallèle — un par type de ressource, plus deux variantes
 * jamais alignées — pour environ trois mille lignes largement identiques. Leurs divergences
 * n'étaient pas cosmétiques : chacun exposait un sous-ensemble différent du contrat du serveur,
 * si bien que la fin de circuit explicite, l'activation d'un circuit ou l'état de traitement
 * d'une étape étaient saisissables ici et invisibles là.
 *
 * Ce qu'aucun des quatre n'exposait complètement, et qui figure ici :
 *
 * - `actif` — un seul circuit par type de ressource est ouvert aux nouveaux dossiers ;
 * - `terminal` — une décision qui clôt le circuit, déclarée et non déduite de l'absence de
 *   destination ; sans ce marqueur, le moteur ignore purement et simplement la transition ;
 * - `etatTraitement` — l'état métier propagé au service propriétaire du dossier ;
 * - les champs de saisie exigés à chaque étape.
 */
@Component({
  selector: 'app-workflow-editor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, NgPrimeModule, AppCrudGenericComponent],
  providers: [MessageService, ConfirmationService],
  templateUrl: './workflow-editor.component.html'
})
export class WorkflowEditorComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly workflowService = inject(WorkflowService);
  private readonly roleService = inject(AppRoleService);
  private readonly stepTemplateService = inject(WorkflowStepTemplateService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);

  private readonly destroy$ = new Subject<void>();

  chargement = true;
  enregistrement = false;

  circuits: LigneCircuit[] = [];
  private tousLesCircuits: WorkflowDto[] = [];

  typeFiltre: string | null = null;

  readonly titrePage = 'Circuits de validation';

  /**
   * Filtre servi par la barre du tableau générique. La recherche libre y est déjà, portée par le
   * composant : n'y reste que ce qu'il ne sait pas faire seul, le filtre par type de ressource.
   */
  readonly filtres = [
    {
      field: 'resourceType',
      label: 'Type de ressource',
      placeHolder: 'Tous les types',
      list: [
        { label: 'Documents', value: 'DOCUMENT' },
        { label: 'Non-conformités', value: 'NON_CONFORMITE' },
        { label: "Plans d'action", value: 'PLAN_ACTION' },
        { label: 'Demandes sur documents', value: 'DEMANDE_DOCUMENT' }
      ],
      value: null as string | null
    }
  ];

  /**
   * Colonnes du tableau générique — le même composant que le catalogue d'étapes et le reste des
   * écrans de configuration. Le tableau maison qui figurait ici en reproduisait le rendu, les
   * filtres et le menu d'actions, sans en hériter les corrections.
   */
  readonly colonnes: TableColumn[] = [
    { field: 'nom', header: 'Circuit', type: 'string', filter: true },
    { field: 'description', header: 'Description', type: 'string', filter: true },
    { field: 'typeLibelle', header: 'Type de ressource', type: 'string', filter: true, width: '12rem' },
    { field: 'nbEtapes', header: 'Étapes', type: 'number', filter: false, width: '7rem' },
    {
      field: 'actif',
      header: 'Statut',
      type: 'boolean',
      filter: false,
      labelTrue: 'Actif',
      labelFalse: 'Inactif',
      width: '8rem'
    }
  ];

  /**
   * Le tableau générique réclame un formulaire : celui de son dialogue intégré, dont cet écran ne
   * se sert pas — la saisie d'un circuit passe par le dialogue dédié. On lui confie donc un groupe
   * vide plutôt que le formulaire d'édition, qu'il lui arrive de réinitialiser.
   */
  readonly formulaireTableau = this.fb.group({});

  /**
   * Actions du menu de ligne. Modifier et supprimer sont retirés faute de `workflow-write` —
   * l'équivalent de `*ngxPermissionsOnly` que portaient les boutons du tableau maison, exprimé
   * en TypeScript puisque le menu du tableau générique est construit par le composant.
   */
  actionsLigne: { label: string; icon: string; action: string }[] = [];

  /**
   * L'écran se consulte sans `workflow-write` ; il ne se modifie pas. Le bouton de création était
   * offert à tous, et la saisie n'échouait qu'à l'enregistrement, en 403 — après avoir composé
   * tout un circuit.
   */
  peutEcrire = false;

  /**
   * Types de ressource pour lesquels plusieurs circuits sont actifs à la fois.
   *
   * Le serveur n'en ouvre qu'un — le premier rendu, dans un ordre non garanti. C'est donc une
   * configuration à l'effet imprévisible, et l'écran doit le dire. L'alerte se lisait auparavant
   * ligne par ligne ; le tableau générique n'ayant pas de gabarit de cellule, elle est portée par
   * un bandeau, ce qui la rend au passage visible sans survol.
   */
  typesEnConflit: string[] = [];

  rolesDisponibles: Option[] = [];
  modelesEmail: Option<string | null>[] = [];
  modelesEtape: WorkflowStepTemplate[] = [];

  readonly typesRessource: Option[] = [
    { label: 'Documents', value: 'DOCUMENT' },
    { label: 'Non-conformités', value: 'NON_CONFORMITE' },
    { label: "Plans d'action", value: 'PLAN_ACTION' }
  ];

  readonly typesChamp: Option[] = [
    { label: 'Texte court', value: 'TEXT' },
    { label: 'Texte long', value: 'TEXTAREA' },
    { label: 'Nombre', value: 'NUMERIC' },
    { label: 'Date', value: 'DATE' },
    { label: 'Liste de choix', value: 'SELECT' },
    { label: 'Fichier', value: 'FILE' }
  ];

  // Édition
  dialogueOuvert = false;
  modeEdition = false;
  circuitEnCours?: WorkflowDto;
  formulaire: FormGroup;

  // Consultation
  dialogueDetailOuvert = false;
  circuitConsulte?: WorkflowDto;

  constructor() {
    this.formulaire = this.fb.group({
      nom: [null, Validators.required],
      resourceType: [null, Validators.required],
      description: [null],
      actif: [true],
      steps: this.fb.array([])
    });
  }

  ngOnInit(): void {
    // Les permissions sont chargées avant l'activation de la route (permissionGuard), et c'est la
    // même source que celle du menu — pas un second mécanisme d'habilitation.
    this.peutEcrire = hasAnyPermission(['workflow-write']);
    this.actionsLigne = [
      { label: 'Consulter', icon: 'pi pi-eye', action: 'consulter' },
      ...(this.peutEcrire
        ? [
            { label: 'Modifier', icon: 'pi pi-pencil', action: 'modifier' },
            { label: 'Supprimer', icon: 'pi pi-trash', action: 'supprimer' }
          ]
        : [])
    ];

    this.chargerCircuits();
    this.chargerRoles();
    this.chargerModelesEmail();
    this.chargerModelesEtape();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ---------------------------------------------------------------- chargement

  chargerCircuits(): void {
    this.chargement = true;
    this.workflowService
      .getAllWorkflows()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (circuits) => {
          this.tousLesCircuits = circuits;
          this.appliquerFiltres();
          this.chargement = false;
        },
        error: (erreur: WorkflowError) => {
          this.chargement = false;
          this.signalerErreur(erreur);
        }
      });
  }

  private chargerRoles(): void {
    this.roleService
      .getAllRoles(0, 1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (reponse: any) => {
          const roles = reponse?.data?.content ?? reponse?.data ?? [];
          // La valeur retenue est le **nom** du rôle : c'est lui qu'inscrivent les circuits
          // livrés, et le serveur accepte indifféremment le nom ou l'identifiant.
          this.rolesDisponibles = (roles as any[])
            .map((role) => ({ label: role.name ?? role.id, value: role.name ?? role.id }))
            .filter((option) => !!option.value);
        },
        error: () => console.warn('Liste des rôles indisponible.')
      });
  }

  private chargerModelesEmail(): void {
    this.workflowService
      .getAllEmailTemplates()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (modeles: EmailTemplateDto[]) => {
          this.modelesEmail = [
            { label: 'Aucune notification', value: null },
            ...modeles.map((modele) => ({
              label: modele.description || modele.subject || modele.code,
              value: modele.code
            }))
          ];
        },
        error: () => console.warn("Modèles d'e-mail indisponibles.")
      });
  }

  private chargerModelesEtape(): void {
    this.stepTemplateService
      .getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (modeles: WorkflowStepTemplate[]) => (this.modelesEtape = modeles ?? []),
        error: () => console.warn("Catalogue d'étapes indisponible.")
      });
  }

  // ---------------------------------------------------------------- liste

  appliquerFiltres(): void {
    // La recherche libre est assurée par le tableau générique ; il ne reste ici que le filtre par
    // type de ressource, qu'il ne sait pas exprimer seul.
    this.circuits = this.tousLesCircuits
      .filter((circuit) => !this.typeFiltre || circuit.resourceType === this.typeFiltre)
      .map((circuit) => ({
        ...circuit,
        typeLibelle: this.libelleType(circuit.resourceType),
        nbEtapes: this.nombreEtapes(circuit)
      }));

    this.typesEnConflit = this.typesRessource
      .filter(
        (type) =>
          this.tousLesCircuits.filter((circuit) => circuit.actif && circuit.resourceType === type.value)
            .length > 1
      )
      .map((type) => type.label);
  }

  /** Reçoit l'entrée de filtre du tableau générique, qui y a posé la valeur choisie. */
  filtrerParType(filtre: any): void {
    this.typeFiltre = (typeof filtre === 'string' || filtre === null) ? filtre : (filtre?.value ?? null);
    this.appliquerFiltres();
  }

  libelleType(type?: string): string {
    return this.typesRessource.find((option) => option.value === type)?.label ?? (type ?? '—');
  }

  nombreEtapes(circuit: WorkflowDto): number {
    return circuit.steps?.length ?? 0;
  }

  /**
   * Aiguillage du menu d'actions du tableau générique, qui n'émet qu'un couple action/ligne.
   *
   * La suppression conserve sa propre confirmation (`supprimer`), qui énonce ce qui est en jeu —
   * les dossiers en cours sur ce circuit — là où celle du tableau générique est générique.
   */
  executerAction(evenement: { action: string; user: any }): void {
    const circuit = evenement.user as WorkflowDto;
    switch (evenement.action) {
      case 'consulter':
        this.consulter(circuit);
        break;
      case 'modifier':
        this.ouvrirModification(circuit);
        break;
      case 'supprimer':
        this.supprimer(circuit);
        break;
    }
  }

  // ---------------------------------------------------------------- édition

  get etapes(): FormArray {
    return this.formulaire.get('steps') as FormArray;
  }

  champsDeLEtape(index: number): FormArray {
    return this.etapes.at(index).get('fields') as FormArray;
  }

  ouvrirCreation(): void {
    this.modeEdition = false;
    this.circuitEnCours = undefined;
    this.formulaire.reset({ actif: true, resourceType: this.typeFiltre ?? null });
    this.etapes.clear();
    this.ajouterEtape();
    this.dialogueOuvert = true;
  }

  ouvrirModification(circuit: WorkflowDto): void {
    this.modeEdition = true;
    this.circuitEnCours = circuit;
    this.chargement = true;

    // Relecture systématique : la ligne de la liste peut être en retard sur le serveur, et
    // enregistrer à partir d'elle réécrirait le circuit avec un état périmé.
    this.workflowService
      .getWorkflowById(circuit.id!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (complet) => {
          this.chargement = false;
          this.remplirFormulaire(complet);
          this.dialogueOuvert = true;
        },
        error: (erreur: WorkflowError) => {
          this.chargement = false;
          this.signalerErreur(erreur);
        }
      });
  }

  private remplirFormulaire(circuit: WorkflowDto): void {
    this.circuitEnCours = circuit;
    this.formulaire.patchValue({
      nom: circuit.nom,
      resourceType: circuit.resourceType,
      description: circuit.description,
      actif: circuit.actif ?? true
    });
    this.etapes.clear();

    const etapesTriees = [...(circuit.steps ?? [])].sort((a, b) => a.stepOrder - b.stepOrder);

    // Le code d'étape est la seule clé stable pour reconstituer les destinations : le rang se
    // décale au moindre réordonnancement, et le nom n'est qu'un libellé.
    const identifiantParCode = new Map<string, string>();
    const identifiants = etapesTriees.map((etape) => {
      const identifiant = nouvelIdentifiantLocal();
      if (etape.code) {
        identifiantParCode.set(etape.code, identifiant);
      }
      return identifiant;
    });

    etapesTriees.forEach((etape, index) => {
      const approbation = etape.transitions?.find((t) => t.decision === 'APPROUVE');
      const rejet = etape.transitions?.find((t) => t.decision === 'REJETE');

      this.etapes.push(
        this.fb.group({
          identifiantLocal: [identifiants[index]],
          id: [etape.id ?? null],
          code: [etape.code ?? null],
          stepTemplateId: [etape.stepTemplateId ?? null],
          nomEtape: [etape.nomEtape, Validators.required],
          responsableRole: [etape.responsableRole ?? null, Validators.required],
          etatTraitement: [etape.etatTraitement ?? null],
          emailTemplateCode: [etape.emailTemplateCode ?? null],
          description: [etape.description ?? null],
          cibleApprobation: [this.cibleDe(approbation, identifiantParCode)],
          libelleApprobation: [approbation?.label ?? null],
          roleApprobation: [approbation?.requiredRole ?? null],
          avecRejet: [!!rejet],
          cibleRejet: [this.cibleDe(rejet, identifiantParCode)],
          libelleRejet: [rejet?.label ?? null],
          roleRejet: [rejet?.requiredRole ?? null],
          fields: this.fb.array(
            (etape.fields ?? []).map((champ) =>
              this.fb.group({
                id: [champ.id ?? null],
                fieldName: [champ.fieldName, Validators.required],
                fieldLabel: [champ.fieldLabel, Validators.required],
                type: [champ.type || 'TEXT', Validators.required],
                required: [champ.required ?? false],
                options: [champ.options ?? null]
              })
            )
          )
        })
      );
    });

    if (this.etapes.length === 0) {
      this.ajouterEtape();
    }
  }

  /** Destination d'une transition, ramenée à l'identifiant local de l'étape visée. */
  private cibleDe(
    transition: WorkflowTransitionDto | undefined,
    identifiantParCode: Map<string, string>
  ): string | null {
    if (!transition?.toStepCode) {
      return null;
    }
    return identifiantParCode.get(transition.toStepCode) ?? null;
  }

  ajouterEtape(): void {
    const precedente = this.etapes.length > 0 ? this.etapes.at(this.etapes.length - 1) : null;
    this.etapes.push(
      this.fb.group({
        identifiantLocal: [nouvelIdentifiantLocal()],
        id: [null],
        code: [null],
        stepTemplateId: [null],
        nomEtape: [null, Validators.required],
        responsableRole: [null, Validators.required],
        etatTraitement: [null],
        emailTemplateCode: [null],
        description: [null],
        // Une étape ajoutée l'est en fin de circuit : approuver la clôt, rejeter renvoie à la
        // précédente. Les destinations des autres étapes ne sont jamais réécrites.
        cibleApprobation: [null],
        libelleApprobation: [null],
        roleApprobation: [null],
        avecRejet: [true],
        cibleRejet: [precedente ? precedente.get('identifiantLocal')?.value : null],
        libelleRejet: [null],
        roleRejet: [null],
        fields: this.fb.array([])
      })
    );
  }

  supprimerEtape(index: number): void {
    const identifiant = this.etapes.at(index).get('identifiantLocal')?.value;
    this.etapes.removeAt(index);
    // Une destination pointant sur l'étape retirée deviendrait une fin de circuit silencieuse :
    // elle est remise à vide, ce qui oblige à statuer explicitement.
    this.etapes.controls.forEach((etape) => {
      ['cibleApprobation', 'cibleRejet'].forEach((champ) => {
        if (etape.get(champ)?.value === identifiant) {
          etape.get(champ)?.setValue(null);
        }
      });
    });
  }

  deplacerEtape(index: number, sens: -1 | 1): void {
    const cible = index + sens;
    if (cible < 0 || cible >= this.etapes.length) {
      return;
    }
    const controle = this.etapes.at(index);
    this.etapes.removeAt(index);
    this.etapes.insert(cible, controle);
  }

  /** Destinations proposées : les autres étapes, plus la fin de circuit. */
  ciblesPossibles(indexEtape: number): Option<string | null>[] {
    const options: Option<string | null>[] = this.etapes.controls
      .map((etape, index) => ({
        label: `${index + 1}. ${etape.get('nomEtape')?.value || 'Étape sans nom'}`,
        value: etape.get('identifiantLocal')?.value as string
      }))
      .filter((_, index) => index !== indexEtape);
    return [{ label: 'Fin du circuit', value: null }, ...options];
  }

  appliquerModeleEtape(index: number, modeleId: string | null): void {
    const modele = this.modelesEtape.find((m) => m.id === modeleId);
    if (!modele) {
      return;
    }
    // Pré-remplissage seulement : le catalogue est administré par un autre service, et un
    // circuit doit rester saisissable sans lui.
    const etape = this.etapes.at(index);
    etape.patchValue({
      nomEtape: modele.nomEtape,
      responsableRole: modele.responsableRole ?? etape.get('responsableRole')?.value,
      description: modele.description ?? etape.get('description')?.value,
      stepTemplateId: modele.id ?? null
    });

    // Le code vient du catalogue lui aussi : c'est tout son intérêt. « Vérification » vaut
    // VERIFICATION dans tous les circuits, ce qui les rend comparables et les statistiques
    // agrégeables — alors qu'une étape créée sans modèle recevait jusqu'ici un code dérivé de son
    // identifiant local, illisible et propre à cette saisie.
    //
    // Une étape déjà enregistrée fait exception : son code est son identité, les transitions des
    // autres étapes le désignent et les dossiers en cours s'y rapportent. Le serveur refuse d'ailleurs
    // en 409 toute tentative de le changer ; on ne le propose donc pas.
    if (!etape.get('id')?.value) {
      etape.patchValue({ code: modele.code ?? null });
    }
  }

  ajouterChamp(indexEtape: number): void {
    this.champsDeLEtape(indexEtape).push(
      this.fb.group({
        id: [null],
        fieldName: [null, Validators.required],
        fieldLabel: [null, Validators.required],
        type: ['TEXT', Validators.required],
        required: [false],
        options: [null]
      })
    );
  }

  supprimerChamp(indexEtape: number, indexChamp: number): void {
    this.champsDeLEtape(indexEtape).removeAt(indexChamp);
  }

  // ---------------------------------------------------------------- enregistrement

  enregistrer(): void {
    if (this.formulaire.invalid) {
      this.formulaire.markAllAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'Formulaire incomplet',
        detail: 'Renseignez les champs obligatoires avant d’enregistrer.'
      });
      return;
    }
    if (this.etapes.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Circuit vide',
        detail: 'Un circuit doit comporter au moins une étape.'
      });
      return;
    }

    const payload = this.construirePayload();
    this.enregistrement = true;

    const requete = this.modeEdition && this.circuitEnCours?.id
      ? this.workflowService.updateWorkflow(this.circuitEnCours.id, payload)
      : this.workflowService.createWorkflow(payload);

    requete.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.enregistrement = false;
        this.dialogueOuvert = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Circuit enregistré',
          detail: `« ${payload.nom} » a été enregistré.`
        });
        this.chargerCircuits();
      },
      error: (erreur: WorkflowError) => {
        this.enregistrement = false;
        this.signalerErreur(erreur);
      }
    });
  }

  private construirePayload(): WorkflowDto {
    const valeurs = this.formulaire.getRawValue();
    const etapes: any[] = valeurs.steps ?? [];

    // Une étape déjà enregistrée garde son code — il est immuable côté serveur, et il réserve sa
    // place. Une étape nouvelle reçoit celui de son modèle de catalogue, à défaut un code dérivé
    // de son nom : c'est ce qui fait qu'une même nature d'étape porte partout le même identifiant.
    //
    // L'unicité est arbitrée ici plutôt que laissée au serveur, car les destinations de transition
    // sont exprimées en codes : si deux étapes revendiquaient le même, le serveur suffixerait la
    // seconde et toutes les destinations qui la visaient retomberaient sur la première.
    const codesReserves = new Set<string>();
    etapes.forEach((etape) => {
      if (etape.id && etape.code) {
        codesReserves.add(etape.code);
      }
    });

    const codeParIdentifiant = new Map<string, string>();
    etapes.forEach((etape) => {
      if (etape.id && etape.code) {
        codeParIdentifiant.set(etape.identifiantLocal, etape.code);
        return;
      }
      const code = codeDisponible(normaliserCode(etape.code || etape.nomEtape), codesReserves);
      codesReserves.add(code);
      codeParIdentifiant.set(etape.identifiantLocal, code);
    });

    const construireTransition = (
      decision: StepDecision,
      cible: string | null,
      role: string | null,
      libelle: string | null
    ): WorkflowTransitionDto => ({
      decision,
      toStepCode: cible ? (codeParIdentifiant.get(cible) ?? null) : null,
      // Sans destination, la décision clôt le circuit — et il faut le déclarer. Le serveur
      // ignore une transition sans destination ni ce marqueur, plutôt que de supposer une fin
      // de circuit que personne n'a demandée.
      terminal: !cible,
      requiredRole: role || null,
      label: libelle || null
    });

    const circuit: WorkflowDto = {
      nom: valeurs.nom,
      resourceType: valeurs.resourceType,
      description: valeurs.description,
      actif: valeurs.actif ?? true,
      steps: etapes.map((etape, index): WorkflowStepDto => ({
        id: etape.id ?? undefined,
        code: codeParIdentifiant.get(etape.identifiantLocal) ?? null,
        nomEtape: etape.nomEtape,
        stepOrder: index + 1,
        responsableRole: etape.responsableRole,
        etatTraitement: etape.etatTraitement || null,
        emailTemplateCode: etape.emailTemplateCode || null,
        stepTemplateId: etape.stepTemplateId || null,
        description: etape.description,
        fields: (etape.fields ?? []).map((champ: any) => ({
          id: champ.id ?? null,
          fieldName: champ.fieldName,
          fieldLabel: champ.fieldLabel,
          type: champ.type,
          required: !!champ.required,
          options: champ.options || null
        })),
        transitions: [
          construireTransition('APPROUVE', etape.cibleApprobation, etape.roleApprobation, etape.libelleApprobation),
          // Le rejet n'est émis que s'il est voulu : émettre une transition de rejet sans
          // destination ne la supprime pas, elle devient une clôture du dossier.
          ...(etape.avecRejet
            ? [construireTransition('REJETE', etape.cibleRejet, etape.roleRejet, etape.libelleRejet)]
            : [])
        ]
      }))
    };

    return circuit;
  }

  // ---------------------------------------------------------------- consultation et suppression

  consulter(circuit: WorkflowDto): void {
    this.chargement = true;
    this.workflowService
      .getWorkflowById(circuit.id!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (complet) => {
          this.chargement = false;
          this.circuitConsulte = complet;
          this.dialogueDetailOuvert = true;
        },
        error: (erreur: WorkflowError) => {
          this.chargement = false;
          this.signalerErreur(erreur);
        }
      });
  }

  etapesTriees(circuit?: WorkflowDto): WorkflowStepDto[] {
    return [...(circuit?.steps ?? [])].sort((a, b) => a.stepOrder - b.stepOrder);
  }

  /** Description lisible d'une transition, pour la vue de consultation. */
  descriptionTransition(transition: WorkflowTransitionDto, circuit?: WorkflowDto): string {
    if (transition.terminal || !transition.toStepCode) {
      return 'clôt le circuit';
    }
    const destination = circuit?.steps?.find((etape) => etape.code === transition.toStepCode);
    return `mène à « ${destination?.nomEtape ?? transition.toStepCode} »`;
  }

  supprimer(circuit: WorkflowDto): void {
    this.confirmationService.confirm({
      header: 'Supprimer ce circuit ?',
      message:
        `« ${circuit.nom} » sera définitivement supprimé. ` +
        'La suppression est refusée si des dossiers y sont encore en cours.',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Supprimer',
      rejectLabel: 'Annuler',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.workflowService
          .deleteWorkflow(circuit.id!)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.messageService.add({
                severity: 'success',
                summary: 'Circuit supprimé',
                detail: `« ${circuit.nom} » a été supprimé.`
              });
              this.chargerCircuits();
            },
            error: (erreur: WorkflowError) => this.signalerErreur(erreur)
          });
      }
    });
  }

  // ---------------------------------------------------------------- erreurs

  /**
   * Affiche le message du serveur plutôt qu'un libellé générique.
   *
   * workflow-service répond en 4xx explicites et rédige des messages destinés à l'utilisateur
   * (« des dossiers sont actuellement en cours sur ces étapes », « le code de l'étape ne peut pas
   * être modifié »). Les remplacer par « une erreur est survenue » privait l'utilisateur de la
   * seule information qui lui permettait de corriger sa saisie.
   */
  private signalerErreur(erreur: WorkflowError): void {
    this.messageService.add({
      severity: erreur.estInterdit ? 'warn' : 'error',
      summary: this.titreErreur(erreur),
      detail: erreur.message,
      life: 8000
    });
    if (erreur.estPerime) {
      this.chargerCircuits();
    }
  }

  private titreErreur(erreur: WorkflowError): string {
    if (erreur.estInterdit) return 'Action non autorisée';
    if (erreur.estPerime) return 'Modification impossible en l’état';
    if (erreur.status === 404) return 'Circuit introuvable';
    if (erreur.status === 400) return 'Saisie à corriger';
    return 'Erreur';
  }
}
