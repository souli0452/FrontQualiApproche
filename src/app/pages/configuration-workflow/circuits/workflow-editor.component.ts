import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subject, takeUntil } from 'rxjs';

import { NgPrimeModule } from '../../../../prime-ng.module';
import { AppRoleService } from '../../role/role-service/role.service';
import { WorkflowStepTemplateService } from '../../../services/module-gestion-documentaire/workflow-step-template.service';
import { QmsDocumentService } from '../../../services/module-gestion-documentaire/qms-document.service';
import { SelectInputComponent } from '../../../shared';
import { WorkflowError, WorkflowService } from '../../../services/workflow.service';
import { WorkflowStepTemplate } from '../../../models/gestion-documentaire.model';
import { WorkflowConfigurationGuideComponent } from './workflow-configuration-guide.component';
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
 *
 * C'est une page (`circuits/edition/:id`, `nouveau` tenant lieu d'identifiant à la création — la
 * convention des rôles), et non plus un dialogue au-dessus de la liste : le formulaire le plus
 * profond de l'application — étapes, actions, champs — défilait dans une fenêtre de 62 rem, et la
 * saisie en cours n'avait pas d'adresse.
 */
/** Jetons de couleur admis par `p-button`, et par le serveur. */
type SeveriteBouton = 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'help' | 'contrast' | 'primary';

@Component({
  selector: 'app-workflow-editor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, NgPrimeModule,
    WorkflowConfigurationGuideComponent, SelectInputComponent],
  providers: [MessageService],
  templateUrl: './workflow-editor.component.html'
})
export class WorkflowEditorComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly workflowService = inject(WorkflowService);
  private readonly roleService = inject(AppRoleService);
  private readonly stepTemplateService = inject(WorkflowStepTemplateService);
  /**
   * Types de documents, pour réserver un circuit à l'un d'eux.
   *
   * <p>La liste vient du module documentaire : c'est lui qui détient les types, et le moteur ne
   * connaît de la cible qu'un identifiant opaque.</p>
   */
  protected readonly qmsService = inject(QmsDocumentService);
  private readonly messageService = inject(MessageService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly destroy$ = new Subject<void>();

  /** Le circuit à modifier est en cours de relecture : le formulaire n'est pas encore montrable. */
  chargement = false;
  enregistrement = false;

  /**
   * Habilitations proposables : les rôles de l'organisation, précédés des deux <b>désignations</b>.
   *
   * <p>Une étape ne se décide pas toujours par appartenance à un groupe. Ces deux valeurs disent
   * « une personne », et le serveur les reconnaît comme telles :</p>
   * <ul>
   *   <li>{@code @CREATEUR} — celui qui a ouvert le dossier. Soumettre sa propre déclaration est un
   *       acte personnel, et le dossier revient à son auteur quand on le lui renvoie ;</li>
   *   <li>{@code @TITULAIRE} — celui à qui le dossier a été confié, l'agent imputé. Se déplace au
   *       fil du circuit, contrairement au créateur.</li>
   * </ul>
   *
   * <p>Elles n'étaient pas offertes : la liste ne contenait que les rôles rendus par user-service,
   * si bien que les circuits livrés s'en servaient sans que personne ne puisse les choisir — ni les
   * retirer. Une règle configurable dans le code et pas à l'écran n'est pas configurable.</p>
   */
  rolesDisponibles: Option[] = [];

  /** Les deux désignations, en tête de liste : elles précèdent les rôles, elles ne s'y mêlent pas. */
  private readonly designations: Option[] = [
    { label: '👤 Le créateur du dossier (celui qui l\'a déposé)', value: '@CREATEUR' },
    { label: '👤 Le titulaire du dossier (celui à qui il est confié)', value: '@TITULAIRE' }
  ];
  /**
   * Faits qu'une transition peut exiger du dossier.
   *
   * <p>Le champ reste saisissable : la liste n'est qu'un rappel de ce qui existe déjà, et un fait
   * tout neuf doit pouvoir être posé avant que quiconque ne l'ait déclaré.</p>
   */
  faitsConnus: Option<string | null>[] = [];
  modelesEmail: Option<string | null>[] = [];
  modelesEtape: WorkflowStepTemplate[] = [];
  /** Types documentaires connus, pour afficher en clair le type réservé par un circuit. */
  typesDocument: any[] = [];

  readonly typesRessource: Option[] = [
    { label: 'Documents', value: 'DOCUMENT' },
    { label: 'Non-conformités', value: 'NON_CONFORMITE' },
    { label: "Plans d'action", value: 'PLAN_ACTION' }
  ];

  /**
   * Icônes proposées pour les boutons d'action, en classes PrimeIcons.
   *
   * <p>Une liste courte et parlante plutôt que le catalogue entier : les circuits enchaînent
   * toujours les mêmes gestes — soumettre, prendre en charge, approuver, renvoyer, refuser,
   * clôturer. Le champ reste ouvert à la saisie pour une icône qui n'y figurerait pas.</p>
   */
  readonly iconesAction: Option[] = [
    { label: 'Envoyer', value: 'pi pi-send' },
    { label: 'Flèche droite', value: 'pi pi-arrow-right' },
    { label: 'Prendre en charge', value: 'pi pi-inbox' },
    { label: 'Attribuer', value: 'pi pi-user-edit' },
    { label: 'Valider', value: 'pi pi-check' },
    { label: 'Approuver', value: 'pi pi-check-circle' },
    { label: 'Clôturer', value: 'pi pi-lock' },
    { label: 'Retourner', value: 'pi pi-undo' },
    { label: 'Demander une correction', value: 'pi pi-replay' },
    { label: 'Réattribuer', value: 'pi pi-refresh' },
    { label: 'Refuser', value: 'pi pi-times-circle' },
    { label: 'Interdire', value: 'pi pi-ban' }
  ];

  /**
   * Couleurs de bouton, dans le vocabulaire PrimeNG que le serveur accepte tel quel.
   *
   * <p>Le classement suit l'effet sur le dossier, non la décision : un renvoi en correction
   * (`warn`) et un refus ferme (`danger`) sont tous deux des rejets, mais l'un invite à
   * reprendre quand l'autre arrête.</p>
   */
  readonly severitesAction: Option[] = [
    { label: 'Vert — aboutissement', value: 'success' },
    { label: 'Bleu — pas en avant', value: 'info' },
    { label: 'Orange — renvoi en correction', value: 'warn' },
    { label: 'Rouge — refus ferme', value: 'danger' },
    { label: 'Gris — action secondaire', value: 'secondary' },
    { label: 'Violet — aide', value: 'help' },
    { label: 'Noir — contraste', value: 'contrast' },
    { label: 'Couleur principale', value: 'primary' }
  ];

  /** Apparence retenue par le serveur quand rien n'est saisi, reproduite pour l'aperçu. */
  private static readonly APPARENCE_PAR_DEFAUT: Record<string, { icone: string; severite: string }> = {
    APPROUVE: { icone: 'pi pi-check', severite: 'success' },
    REJETE: { icone: 'pi pi-times', severite: 'danger' }
  };

  /**
   * Nature d'une action : elle fait avancer le dossier, ou elle le renvoie en arrière.
   *
   * <p>Ce n'est plus son identité — plusieurs actions d'une même étape peuvent approuver — mais
   * c'est ce qui donne son sens à un franchissement : la couleur du bouton par défaut, l'issue
   * publiée aux modules métier à la fin du circuit, et la portée des champs demandés.</p>
   */
  readonly naturesAction: Option<string>[] = [
    { label: 'Approbation — le dossier avance', value: 'APPROUVE' },
    { label: 'Rejet — le dossier revient en arrière', value: 'REJETE' }
  ];

  /**
   * Type de document déjà réservé, à réinjecter dans sa liste déroulante.
   *
   * <p>La liste se charge page par page : le type retenu — celui d'un circuit qu'on modifie — n'est
   * pas nécessairement en première page, et le champ paraîtrait vide alors qu'il porte une valeur.
   * Seul l'identifiant est connu ici ; le libellé s'affichera dès que sa page sera chargée.</p>
   */
  typeRetenu(): any[] {
    const cible = this.formulaire?.get('cibleId')?.value;
    if (!cible) {
      return [];
    }
    // Le libellé vient du catalogue chargé à l'ouverture de l'écran. À défaut — type supprimé
    // depuis, ou catalogue indisponible — on le dit, plutôt que d'afficher un identifiant brut.
    const connu = this.typesDocument.find((type) => type.id === cible);
    return [connu ?? { id: cible, libelle: 'Type inconnu ou supprimé' }];
  }

  /** Icône telle qu'elle s'affichera : celle saisie, ou celle que porte la nature de l'action. */
  apercuIcone(valeur: string | null, decision: string): string {
    return valeur || WorkflowEditorComponent.APPARENCE_PAR_DEFAUT[decision]?.icone || 'pi pi-check';
  }

  /**
   * Couleur telle qu'elle s'affichera : celle saisie, ou celle que porte la décision.
   *
   * <p>Le type est celui qu'attend `p-button` — c'est bien ce même jeton que le serveur
   * enregistre, ce qui garantit que l'aperçu montre le bouton tel qu'il sera rendu.</p>
   */
  apercuSeverite(valeur: string | null, decision: string): SeveriteBouton {
    return (valeur || WorkflowEditorComponent.APPARENCE_PAR_DEFAUT[decision]?.severite
      || 'success') as SeveriteBouton;
  }

  /**
   * Décision à laquelle un champ se rapporte.
   *
   * <p>Sans cette portée, un justificatif de rejet se présentait aussi à qui approuvait : on lui
   * demandait de motiver un refus qu'il n'était pas en train de prononcer.</p>
   */
  readonly porteesChamp: Option<string | null>[] = [
    { label: 'Toutes les décisions', value: null },
    { label: 'Approbation seulement', value: 'APPROUVE' },
    { label: 'Rejet seulement', value: 'REJETE' }
  ];

  /**
   * Provenance des valeurs d'une liste de choix.
   *
   * <p>Une liste écrite à la main convient à « Oui, Non ». Elle ne convient pas aux structures ni
   * aux utilisateurs, qui vivent au référentiel et changent sans qu'on remanie le circuit : une
   * structure créée après coup n'y aurait jamais figuré.</p>
   */
  readonly sourcesDeChoix: Option<string | null>[] = [
    { label: 'Liste que je saisis', value: null },
    { label: 'Structures du référentiel', value: '@STRUCTURES' },
    { label: 'Utilisateurs', value: '@UTILISATEURS' },
    { label: 'Agents de ma structure', value: '@UTILISATEURS_MA_STRUCTURE' }
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
  modeEdition = false;
  circuitEnCours?: WorkflowDto;
  formulaire: FormGroup;

  /**
   * Guide de configuration, en dialogue au-dessus de la page : l'auteur d'un circuit a besoin de
   * s'y reporter au moment où il hésite sur un réglage, sans quitter la saisie et perdre ce qu'il
   * a saisi.
   */
  guideOuvert = false;

  constructor() {
    this.formulaire = this.fb.group({
      nom: [null, Validators.required],
      resourceType: [null, Validators.required],
      description: [null],
      actif: [true],
      // Réservation du circuit à un type de document. Vide : le circuit vaut pour toute la famille.
      cibleId: [null],
      steps: this.fb.array([])
    });
  }

  ngOnInit(): void {
    // La page sert la création comme la modification : `nouveau` tient lieu d'identifiant, la
    // convention des rôles (`roles/:id`).
    const id = this.route.snapshot.paramMap.get('id');
    this.modeEdition = !!id && id !== 'nouveau';
    if (this.modeEdition) {
      this.chargerCircuit(id!);
    } else {
      this.preparerCreation();
    }

    this.chargerRoles();
    this.chargerModelesEmail();
    this.chargerModelesEtape();
    this.chargerTypesDocument();
    this.chargerFaits();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ---------------------------------------------------------------- chargement

  private chargerRoles(): void {
    this.roleService
      .getAllRoles(0, 1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (reponse: any) => {
          const roles = reponse?.data?.content ?? reponse?.data ?? [];
          // La valeur retenue est le **nom** du rôle : c'est lui qu'inscrivent les circuits
          // livrés, et le serveur accepte indifféremment le nom ou l'identifiant.
          this.rolesDisponibles = [
            ...this.designations,
            ...(roles as any[])
              .map((role) => ({ label: role.name ?? role.id, value: role.name ?? role.id }))
              .filter((option) => !!option.value)
          ];
        },
        // Les désignations restent proposées même sans user-service : elles ne viennent pas de lui.
        error: () => {
          this.rolesDisponibles = [...this.designations];
          console.warn('Liste des rôles indisponible.');
        }
      });
  }

  /**
   * Champs de l'étape pouvant désigner le titulaire du dossier.
   *
   * <p>La valeur saisie dans ce champ devient la personne à qui les étapes suivantes seront
   * réservées. C'est ainsi qu'une imputation nomme quelqu'un sans qu'il faille inventer un rôle
   * « agent imputé », lequel ouvrirait le traitement de tout dossier à tout agent imputable.</p>
   */
  champsDesignables(indexEtape: number): Option<string | null>[] {
    const champs = (this.etapes.at(indexEtape).get('fields') as FormArray | null)?.controls ?? [];
    return champs
      .map((champ) => champ.get('fieldName')?.value)
      .filter((nom: string) => !!nom)
      .map((nom: string) => ({ label: nom, value: nom }));
  }

  /**
   * Catalogue des types documentaires.
   *
   * <p>Chargé en entier — quelques dizaines d'entrées — et non page par page : il ne sert qu'à
   * traduire en clair l'identifiant réservé par un circuit, ce qu'une seule page ne permettrait pas
   * pour un type situé au-delà.</p>
   */
  private chargerTypesDocument(): void {
    this.qmsService.typeDocumentQmsGetAll(0, 1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => (this.typesDocument = res?.data?.content ?? res?.content ?? []),
        error: () => console.warn('Types de documents indisponibles.')
      });
  }

  private chargerFaits(): void {
    this.workflowService
      .getFaitsConnus()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (faits) => {
          this.faitsConnus = (faits ?? []).map((fait) => ({ label: fait, value: fait }));
        },
        error: () => console.warn('Liste des faits indisponible.')
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

  // ---------------------------------------------------------------- édition

  get etapes(): FormArray {
    return this.formulaire.get('steps') as FormArray;
  }

  champsDeLEtape(index: number): FormArray {
    return this.etapes.at(index).get('fields') as FormArray;
  }

  /** Actions proposées par une étape. Il y en a au moins une, jamais un nombre fixe. */
  actionsDeLEtape(index: number): FormArray {
    return this.etapes.at(index).get('actions') as FormArray;
  }

  /**
   * Le formulaire d'une action, qu'elle vienne du serveur ou qu'on l'ajoute.
   *
   * <p>Le code est saisissable : c'est lui qui identifie l'action dans son étape, qui l'apparie
   * d'un enregistrement à l'autre, et par lequel un champ se rattache à elle. Laissé vide, le
   * serveur reprend le nom de la décision — ce qui suffit tant que l'étape n'offre qu'une action
   * de cette nature.</p>
   */
  private groupeAction(transition: Partial<WorkflowTransitionDto>, cible: string | null): FormGroup {
    return this.fb.group({
      id: [transition.id ?? null],
      code: [transition.code ?? null],
      decision: [transition.decision ?? 'APPROUVE', Validators.required],
      cible: [cible],
      label: [transition.label ?? null],
      icon: [transition.icon ?? null],
      severity: [transition.severity ?? null],
      requiredRole: [transition.requiredRole ?? null],
      conditionRequise: [transition.conditionRequise ?? null],
      conditionLibelle: [transition.conditionLibelle ?? null]
    });
  }

  ajouterAction(indexEtape: number): void {
    this.actionsDeLEtape(indexEtape).push(this.groupeAction({ decision: 'APPROUVE' }, null));
  }

  supprimerAction(indexEtape: number, indexAction: number): void {
    const actions = this.actionsDeLEtape(indexEtape);
    actions.removeAt(indexAction);
    // Une étape sans action est une impasse : le dossier s'y arrête et rien ne peut plus le faire
    // avancer. Mieux vaut la laisser porter une action à configurer qu'un circuit sans issue.
    if (actions.length === 0) {
      this.ajouterAction(indexEtape);
    }
  }

  /**
   * Actions auxquelles un champ de cette étape peut être rattaché.
   *
   * <p>« Toutes » d'abord : c'est le cas courant, et un champ qui ne nomme aucune action reste
   * régi par sa seule portée de décision.</p>
   */
  actionsDesignables(indexEtape: number): Option<string | null>[] {
    const actions = this.actionsDeLEtape(indexEtape).controls.map((action, rang) => {
      const code = (action.get('code')?.value as string) || (action.get('decision')?.value as string);
      const libelle = (action.get('label')?.value as string) || code || `Action ${rang + 1}`;
      return { label: `${libelle} (${code})`, value: code };
    });
    return [{ label: 'Toutes les actions', value: null }, ...actions.filter((option) => !!option.value)];
  }

  private preparerCreation(): void {
    this.circuitEnCours = undefined;
    // La liste transmet son filtre courant : créer un circuit depuis la vue « Non-conformités »
    // pré-remplit le type, comme le faisait le dialogue.
    const type = this.route.snapshot.queryParamMap.get('type');
    this.formulaire.reset({ actif: true, resourceType: type ?? null });
    this.etapes.clear();
    this.ajouterEtape();
  }

  private chargerCircuit(id: string): void {
    this.chargement = true;

    // Relecture systématique : la ligne de la liste peut être en retard sur le serveur, et
    // enregistrer à partir d'elle réécrirait le circuit avec un état périmé.
    this.workflowService
      .getWorkflowById(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (complet) => {
          this.chargement = false;
          this.remplirFormulaire(complet);
        },
        error: (erreur: WorkflowError) => {
          this.chargement = false;
          this.signalerErreur(erreur);
        }
      });
  }

  /** Retour à la liste, sans enregistrer — le formulaire meurt avec la page. */
  annuler(): void {
    this.router.navigate(['/configurations/circuits']);
  }

  private remplirFormulaire(circuit: WorkflowDto): void {
    this.circuitEnCours = circuit;
    this.formulaire.patchValue({
      nom: circuit.nom,
      resourceType: circuit.resourceType,
      description: circuit.description,
      actif: circuit.actif ?? true,
      cibleId: circuit.cibleId ?? null
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
          champTitulaire: [etape.champTitulaire ?? null],
          description: [etape.description ?? null],
          // Autant d'actions que l'étape en propose. Elles tenaient auparavant dans deux jeux de
          // contrôles figés — approbation et rejet — et une étape ne pouvait donc rien offrir
          // d'autre : ni « demander un complément », ni « transférer », qui sont pourtant des
          // suites courantes et qui approuvent l'une comme l'autre.
          actions: this.fb.array(
            (etape.transitions ?? []).map((transition) =>
              this.groupeAction(transition, this.cibleDe(transition, identifiantParCode)))
          ),
          fields: this.fb.array(
            (etape.fields ?? []).map((champ) =>
              this.fb.group({
                id: [champ.id ?? null],
                fieldName: [champ.fieldName, Validators.required],
                fieldLabel: [champ.fieldLabel, Validators.required],
                type: [champ.type || 'TEXT', Validators.required],
                required: [champ.required ?? false],
                decision: [champ.decision ?? null],
                // Le champ ne se présente qu'à l'action nommée. Sans cette portée, le motif que
                // réclame « Demander un complément » serait demandé à qui valide simplement.
                actionCode: [champ.actionCode ?? null],
                // La source et la liste littérale occupent le même emplacement côté serveur :
                // séparées ici pour que l'écran présente l'une ou l'autre, jamais les deux.
                source: [this.sourceDepuisOptions(champ.options)],
                options: [this.sourceDepuisOptions(champ.options) ? null : (champ.options ?? null)]
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
        champTitulaire: [null],
        description: [null],
        // Une étape ajoutée l'est en fin de circuit : approuver la clôt, rejeter renvoie à la
        // précédente. Les destinations des autres étapes ne sont jamais réécrites.
        actions: this.fb.array([
          this.groupeAction({ code: 'APPROUVE', decision: 'APPROUVE' }, null),
          this.groupeAction({ code: 'REJETE', decision: 'REJETE' },
            precedente ? precedente.get('identifiantLocal')?.value : null)
        ]),
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
      (etape.get('actions') as FormArray).controls.forEach((action) => {
        if (action.get('cible')?.value === identifiant) {
          action.get('cible')?.setValue(null);
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
        decision: [null],
        source: [null],
        options: [null]
      })
    );
  }

  /** La valeur d'{@code options} désigne-t-elle une source, ou est-ce une liste littérale ? */
  private sourceDepuisOptions(options?: string | null): string | null {
    const valeur = (options ?? '').trim();
    return valeur.startsWith('@') ? valeur : null;
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
        // Le message de succès est confié à la liste via l'état de navigation : cette page est
        // détruite par le retour, et un toast émis ici mourrait avec elle.
        this.router.navigate(['/configurations/circuits'], {
          state: { circuitEnregistre: payload.nom }
        });
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

    const construireTransition = (action: any): WorkflowTransitionDto => ({
      // Le code identifie l'action dans son étape, là où la décision ne dit plus que sa nature.
      // Vide, le serveur reprend le nom de la décision et le rend unique.
      code: action.code || null,
      decision: action.decision as StepDecision,
      toStepCode: action.cible ? (codeParIdentifiant.get(action.cible) ?? null) : null,
      // Sans destination, la décision clôt le circuit — et il faut le déclarer. Le serveur
      // ignore une transition sans destination ni ce marqueur, plutôt que de supposer une fin
      // de circuit que personne n'a demandée.
      terminal: !action.cible,
      requiredRole: action.requiredRole || null,
      label: action.label || null,
      // Laissés vides, le serveur reprend l'icône et la couleur que porte la décision.
      icon: action.icon || null,
      severity: action.severity || null,
      // Vide, la transition est franchissable sans condition — c'est le cas de la plupart.
      conditionRequise: action.conditionRequise || null,
      // Ce que la condition veut dire : c'est la phrase que verra celui qui attend que le dossier
      // avance. Le nom du fait est technique, et l'écran ne peut pas le traduire sans se doter
      // d'une table de correspondance qui mentirait au premier fait nouveau.
      conditionLibelle: action.conditionLibelle || null
    });

    const circuit: WorkflowDto = {
      nom: valeurs.nom,
      resourceType: valeurs.resourceType,
      description: valeurs.description,
      actif: valeurs.actif ?? true,
      // Vide vaut « aucune réservation » : le serveur ramène la chaîne vide à l'absence de cible.
      cibleId: valeurs.cibleId || null,
      steps: etapes.map((etape, index): WorkflowStepDto => ({
        id: etape.id ?? undefined,
        code: codeParIdentifiant.get(etape.identifiantLocal) ?? null,
        nomEtape: etape.nomEtape,
        stepOrder: index + 1,
        responsableRole: etape.responsableRole,
        etatTraitement: etape.etatTraitement || null,
        emailTemplateCode: etape.emailTemplateCode || null,
        stepTemplateId: etape.stepTemplateId || null,
        // Renvoyé tel quel : omis, le serveur l'efface et l'étape cesse de désigner le titulaire.
        champTitulaire: etape.champTitulaire || null,
        description: etape.description,
        fields: (etape.fields ?? []).map((champ: any) => ({
          id: champ.id ?? null,
          fieldName: champ.fieldName,
          fieldLabel: champ.fieldLabel,
          type: champ.type,
          required: !!champ.required,
          decision: champ.decision || null,
          actionCode: champ.actionCode || null,
          // Une seule colonne côté serveur : la source, si elle est choisie, y prend la place de
          // la liste saisie à la main.
          options: champ.source || champ.options || null
        })),
        // Une action sans nature ne serait ni une avancée ni un retour : le serveur l'écarterait
        // en silence. On ne la lui envoie pas.
        transitions: (etape.actions ?? [])
          .filter((action: any) => !!action.decision)
          .map((action: any) => construireTransition(action))
      }))
    };

    return circuit;
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
    // Un 409 signifie que le circuit a changé sous la saisie. On ne recharge pas d'office : le
    // formulaire porte le travail de l'utilisateur, et c'est le message qui l'invite à rouvrir.
  }

  private titreErreur(erreur: WorkflowError): string {
    if (erreur.estInterdit) return 'Action non autorisée';
    if (erreur.estPerime) return 'Modification impossible en l’état';
    if (erreur.status === 404) return 'Circuit introuvable';
    if (erreur.status === 400) return 'Saisie à corriger';
    return 'Erreur';
  }
}
