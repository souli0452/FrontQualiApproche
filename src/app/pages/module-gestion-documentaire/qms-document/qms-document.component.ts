import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MessageService, MenuItem } from 'primeng/api';
import { isUserInRoles } from '../../../utils/auth/auth-utils';
import { NgPrimeModule } from '../../../../prime-ng.module';
import {
  QmsDocumentService,
  // DocumentQms, QmsDocumentType, QmsDocumentVersion, QmsAuditLog
} from '../../../services/module-gestion-documentaire/qms-document.service';
import { showToast, StatusEnum } from '../../../utils/global/global-utils';
import { Structure } from '../../parametrages/structure/structure-config/structure';
import { StructureService } from '../../parametrages/structure/structure-service/structure-service';
import { WorkflowError, WorkflowService } from '../../../services/workflow.service';
import { AuthService } from '../../../services/auth-services/auth.service';
import {
  DomaineApplicationService,
  NiveauConfidentialiteService,
  PrioriteDocumentService
} from '../../../services/module-gestion-documentaire/referentiel-document.service';
import { DomaineApplication, NiveauConfidentialite, PrioriteDocument } from '../../../models/referentiel-document.model';
import { DocumentQms, DocumentUserAccess, QmsAuditLog, QmsDocumentType, QmsDocumentVersion, DocumentWorkflow, WorkflowStep } from '../../../models/gestion-documentaire.model';
import { WorkflowStateDto, WorkflowActionDto, ValidationHistoryDto } from '../../../models/workflow.model';
import { NgxPermissionsModule, NgxPermissionsService } from 'ngx-permissions';
import { QmsDocumentListComponent } from './components/qms-document-list.component';
import { QmsDocumentDetailComponent } from './components/qms-document-detail.component';
import { QmsDocumentHistoryComponent } from './components/qms-document-history.component';
import { QmsDocumentAuditComponent } from './components/qms-document-audit.component';
import { QmsTransitionDialogComponent, TransitionDecision } from './components/qms-transition-dialog.component';
import { DecisionConfirmee, WorkflowDecisionDialogComponent } from '../../../shared';
import { QmsDocumentDemandesComponent } from './components/qms-document-demandes.component';
import { DemandeDocumentService } from '../../../services/module-gestion-documentaire/demande-document.service';
import { DemandeDocumentDto } from '../../../models/demande-document.model';
import { QmsWorkflowHistoriqueComponent } from './components/qms-workflow-historique.component';
import { QmsAssignWorkflowDialogComponent } from './components/qms-assign-workflow-dialog.component';
import { QmsReclassementDialogComponent } from './components/qms-reclassement-dialog.component';
import { QmsDocumentAccessDialogComponent, AccessGrant } from './components/qms-document-access-dialog.component';

/**
 * Les six regards portés sur un document, réunis en onglets d'une même fiche.
 *
 * <p>Ils portent sur des objets différents et se complètent : la fiche décrit le document, les
 * versions retracent le fichier, les partages disent qui y accède, la piste d'audit journalise les
 * opérations, les demandes rapportent ce qu'on a demandé à son sujet, et le circuit conserve les
 * décisions. Aucun ne remplace un autre — d'où six onglets plutôt qu'un choix.</p>
 */
export type OngletDetail = 'detail' | 'historique' | 'partages' | 'audit' | 'demandes' | 'circuit';

@Component({
  selector: 'app-qms-document',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgPrimeModule, NgxPermissionsModule, QmsDocumentListComponent, QmsDocumentDetailComponent, QmsDocumentHistoryComponent, QmsDocumentAuditComponent, QmsTransitionDialogComponent, WorkflowDecisionDialogComponent, QmsWorkflowHistoriqueComponent, QmsDocumentDemandesComponent, QmsAssignWorkflowDialogComponent,
    QmsReclassementDialogComponent, QmsDocumentAccessDialogComponent],
  templateUrl: './qms-document.component.html',
  styleUrls: ['./qms-document.component.scss'],
  providers: [MessageService, DatePipe]
})
export class QmsDocumentComponent implements OnInit, OnDestroy {
  documents: DocumentQms[] = [];
  documentTypes: QmsDocumentType[] = [];
  /** Total du fonds visible, pour que le tableau sache combien de pages il reste. */
  totalDocuments = 0;
  /** Index de la première ligne affichée, dans le référentiel du tableau. */
  premiereLigne = 0;
  taillePage = 15;
  /** Une page a déjà été demandée : les bornes inchangées ne relancent plus rien. */
  private pageDejaChargee = false;
  structures: Structure[] = [];
  systemUsers: any[] = [];
  filteredUsers: any[] = [];
  selectedStructureFilter?: string;
  selectedUser?: any;
  loading = false;
  destroy$ = new Subject<void>();

  // Filter properties
  searchQuery = '';
  selectedType = '';
  selectedService = '';
  selectedPriorite = '';
  selectedNiveauConfidentialite = '';
  selectedDomaine = '';

  priorites: PrioriteDocument[] = [];
  /** Niveaux permis à l'utilisateur, résolus par le serveur — voir `filtrables()`. */
  niveauxConfidentialite: NiveauConfidentialite[] = [];
  domaines: DomaineApplication[] = [];
  selectedStatuses: string[] = [];
  dateFrom: string = '';
  dateTo: string = '';



  // Modals / View visibility
  showTransitionModal = false;
  showAssignWorkflowModal = false;

  activeTab = 'access';
  accessList: DocumentUserAccess[] = [];
  loadingAccess = false;

  roleOptions = [
    { label: 'Lecture Seule', value: 'READ_ONLY' },
    { label: 'Modification', value: 'WRITE' }
  ];

  /**
   * Liste, ou fiche du document.
   *
   * <p>Les cinq regards portés sur un document — sa fiche, ses versions, ses partages, sa piste
   * d'audit, ses demandes, les décisions de son circuit — étaient autant de vues plein écran, dont
   * chacune renvoyait à la liste. Passer de l'une à l'autre imposait de rouvrir le document, et
   * rien à l'écran ne disait qu'il existait des voisines. Ce sont désormais les onglets d'une même
   * fiche ({@link #ongletDetail}).</p>
   */
  currentView: 'list' | 'detail' = 'list';

  /** Onglet ouvert sur la fiche du document. */
  ongletDetail: OngletDetail = 'detail';

  /** Demandes portées sur le document consulté. */
  demandesDuDocument: DemandeDocumentDto[] = [];
  /** Décisions successives du circuit, distinctes des versions du fichier et des accès. */
  validationHistory: ValidationHistoryDto[] = [];
  /** États de circuit des documents listés, indexés par identifiant de document. */
  workflowStates: Record<string, WorkflowStateDto> = {};
  actionMenuItems: MenuItem[] = [];
  /** Dialogue de reclassement : ouverture et document concerné. */
  dialogueReclassementOuvert = false;

  // Selected object contexts
  selectedDocument?: DocumentQms;
  versionHistory: QmsDocumentVersion[] = [];
  auditLogs: QmsAuditLog[] = [];
  availableWorkflows: DocumentWorkflow[] = [];
  workflowState?: WorkflowStateDto;

  // Form Groups
  showWorkflowModal = false;
  workflowDecision: 'APPROUVE' | 'REJETE' = 'APPROUVE';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    protected qmsService: QmsDocumentService,
    private workflowService: WorkflowService,
    private demandeService: DemandeDocumentService,
    protected structureService: StructureService,
    protected prioriteService: PrioriteDocumentService,
    protected niveauConfidentialiteService: NiveauConfidentialiteService,
    protected domaineService: DomaineApplicationService,
    private authService: AuthService,
    private ngxPermissionsService: NgxPermissionsService,
    private messageService: MessageService,
    private datePipe: DatePipe
  ) {



  }


  // Passés aux sous-composants : liés ici pour conserver le contexte du parent.
  readonly statusLabelFn = (doc: DocumentQms) => this.getStatusLabel(doc);
  readonly statusSeverityFn = (doc: DocumentQms) => this.getStatusSeverity(doc);
  readonly actionIconFn = (action: any) => this.getIconForAction(action);
  readonly actionClassFn = (action: any) => this.getClassForAction(action);
  readonly etapeDeCircuitFn = (doc: DocumentQms) => this.etapeDeCircuit(doc);
  readonly aUneDecisionAttendueFn = (doc: DocumentQms) => this.aUneDecisionAttendue(doc);
  readonly circuitTermineFn = (doc: DocumentQms) => this.circuitTermine(doc);

  ngOnInit(): void {
    this.loadInitialData();
    this.ouvrirLeDocumentDeLAdresse();
  }

  /**
   * Ouvre d'emblée la fiche du document désigné par l'adresse (`?documentId=`).
   *
   * <p>La vue d'ensemble y renvoie pour les dossiers qui offrent plus d'une décision : on ne choisit
   * pas entre approuver et retourner au rédacteur depuis une cellule de tableau. Le document est
   * désigné dans l'adresse plutôt que passé en mémoire — c'est un autre écran, et le lien reste
   * ainsi rechargeable et partageable.</p>
   *
   * <p>Un identifiant qui ne rend rien laisse la liste en place et le dit : le document a pu sortir
   * de portée entre-temps, et une fiche vide n'expliquerait rien.</p>
   */
  private ouvrirLeDocumentDeLAdresse(): void {
    const documentId = this.route.snapshot.queryParamMap.get('documentId');
    if (!documentId) {
      return;
    }

    this.qmsService.getDocumentById(documentId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (doc: any) => {
          this.selectedDocument = doc;
          this.workflowState = doc?.workflowState;
          this.currentView = 'detail';
          this.ongletDetail = 'detail';
        },
        error: () => this.messageService.add({
          severity: 'warn', summary: 'Document introuvable',
          detail: "Ce document n'est plus accessible : il a pu être retiré, ou sortir de votre périmètre."
        })
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadInitialData(): void {
    this.loading = true;

    // Les référentiels des filtres ne sont plus chargés ici : chaque liste déroulante charge le
    // sien, page par page. Les charger d'avance n'en ramenait que la première page — le reste
    // restait hors d'atteinte sans que rien ne le signale.

    // Les structures, elles, servent encore au dialogue de partage.
    this.structureService.getAllStructures(0, 1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => this.structures = res.data.content || [],
        error: (err: any) => console.error('Failed to load structures', err)
      });

    this.refreshList();
  }

  /**
   * Recharge la page courante du tableau.
   *
   * <p>La pagination est portée par le serveur : le tableau ne détient que la page affichée, et
   * le total lui dit combien il en reste. Il chargeait auparavant ce que le serveur voulait bien
   * lui donner — dix documents — et paginait cette poignée comme si elle était le fonds
   * entier.</p>
   *
   * @param remonter vrai lorsqu'un critère change : la page courante n'a alors plus de sens, et
   *                 rester en page 4 d'une recherche qui n'en compte qu'une afficherait un vide
   */
  refreshList(remonter = false): void {
    if (remonter) {
      this.premiereLigne = 0;
    }
    this.loading = true;
    this.qmsService.rechercherDocumentsPagines({
      page: Math.floor(this.premiereLigne / this.taillePage),
      size: this.taillePage,
      query: this.searchQuery || undefined,
      documentType: this.selectedType || undefined,
      // Le filtre n'est offert qu'à la qualité et à l'administration générale ; hors d'eux, il
      // n'est pas envoyé même s'il portait une valeur — un critère invisible qui restreindrait
      // silencieusement la liste serait pire que pas de filtre.
      serviceId: (this.peutFiltrerParProcessusEmetteur && this.selectedService) || undefined,
      prioriteId: this.selectedPriorite || undefined,
      niveauConfidentialiteId: this.selectedNiveauConfidentialite || undefined,
      domaineId: this.selectedDomaine || undefined,
      status: this.selectedStatuses.length ? this.selectedStatuses : undefined,
      createdAtFrom: this.dateFrom ? this.datePipe.transform(this.dateFrom, 'yyyy-MM-dd')! : undefined,
      createdAtTo: this.dateTo ? this.datePipe.transform(this.dateTo, 'yyyy-MM-dd')! : undefined
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ contenu, total }) => {
          this.documents = contenu;
          this.totalDocuments = total;
          this.pageDejaChargee = true;
          this.loading = false;
          // Les états de circuit ne sont demandés que pour la page affichée : les réclamer pour
          // tout le fonds était le prix caché du chargement en bloc.
          this.chargerEtatsDeCircuit(contenu);
        },
        error: (err: any) => {
          this.loading = false;
          showToast(StatusEnum.error, err.status, 'Erreur de chargement des documents', this.messageService, err);
        }
      });
  }

  ouvrirReclassement(doc: DocumentQms): void {
    this.selectedDocument = doc;
    this.dialogueReclassementOuvert = true;
  }

  /**
   * Applique le nouveau classement.
   *
   * <p>Le serveur peut avertir que le niveau retenu ferme le circuit du document : le classement
   * est appliqué malgré tout, mais l'avertissement reste affiché — un document immobile dont
   * personne ne comprend la cause coûte plus cher qu'un message de trop.</p>
   */
  appliquerReclassement(choix: { id: string | null; libelle: string | null }): void {
    if (!this.selectedDocument) {
      return;
    }
    this.loading = true;
    this.qmsService.reclasser(this.selectedDocument.id!, choix.id, choix.libelle)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (avertissement) => {
          this.loading = false;
          this.dialogueReclassementOuvert = false;
          this.messageService.add({
            severity: 'success',
            summary: choix.id ? 'Document classé' : 'Document déclassé',
            detail: choix.id
              ? `Le document est désormais classé « ${choix.libelle} ».`
              : "Le document n'est plus classé."
          });
          if (avertissement) {
            this.messageService.add({
              severity: 'warn', summary: 'Classement à revoir', detail: avertissement, sticky: true
            });
          }
          this.refreshList();
        },
        error: (err: any) => {
          this.loading = false;
          showToast(StatusEnum.error, err.status, "Le classement n'a pas pu être appliqué",
            this.messageService, err);
        }
      });
  }

  /**
   * Changement de page ou de taille de page demandé par le tableau.
   *
   * <p>Un tableau paresseux émet cet événement dès son affichage, puis chaque fois que ses
   * bornes changent — y compris quand c'est nous qui les avons remises à zéro en changeant de
   * filtre. Sans ce garde-fou, chaque recherche partait en double.</p>
   */
  changerDePage(evenement: { first: number; rows: number }): void {
    const premiere = evenement.first ?? 0;
    const taille = evenement.rows ?? this.taillePage;
    if (this.pageDejaChargee && premiere === this.premiereLigne && taille === this.taillePage) {
      return;
    }
    this.premiereLigne = premiere;
    this.taillePage = taille;
    this.refreshList();
  }

  /**
   * État de circuit de chaque document affiché, en une requête groupée.
   *
   * <p>La liste ne montrait que l'étape recopiée sur le document ({@code currentEtape}), tenue à
   * jour par notification : elle ne dit ni si le circuit est clos, ni — surtout — si une décision
   * est attendue de l'utilisateur qui regarde. Le serveur, lui, filtre déjà les actions selon les
   * habilitations de l'appelant ; c'est cette information qui manquait pour qu'on sache quoi
   * traiter sans ouvrir chaque fiche.</p>
   *
   * <p>Un échec est silencieux : la liste reste exploitable avec l'étape recopiée, et cet
   * enrichissement ne vaut pas de la faire échouer.</p>
   */
  private chargerEtatsDeCircuit(docs: DocumentQms[]): void {
    const identifiants = docs.map((doc) => doc.id).filter((id): id is string => !!id);
    if (identifiants.length === 0) {
      this.workflowStates = {};
      return;
    }

    // Le serveur borne le lot ; au-delà, la demande est découpée plutôt que refusée.
    const lots: string[][] = [];
    for (let i = 0; i < identifiants.length; i += WorkflowService.TAILLE_LOT_MAX) {
      lots.push(identifiants.slice(i, i + WorkflowService.TAILLE_LOT_MAX));
    }

    forkJoin(lots.map((lot) => this.workflowService.getWorkflowStatesForResources(lot)))
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resultats) => {
          this.workflowStates = Object.assign({}, ...resultats);
        },
        error: () => console.warn("États de circuit indisponibles pour la liste des documents.")
      });
  }

  /** Une décision est attendue de l'utilisateur courant sur ce document. */
  aUneDecisionAttendue(doc: DocumentQms): boolean {
    return (this.workflowStates[doc.id ?? '']?.allowedActions?.length ?? 0) > 0;
  }

  /** Étape courante telle que la connaît le moteur, à défaut celle recopiée sur le document. */
  etapeDeCircuit(doc: DocumentQms): string | undefined {
    return this.workflowStates[doc.id ?? '']?.currentStateName ?? doc.currentEtape;
  }

  circuitTermine(doc: DocumentQms): boolean {
    return this.workflowStates[doc.id ?? '']?.status === 'TERMINE';
  }

  navigateToCreate(): void {
    this.router.navigate(['../nouveau'], { relativeTo: this.route });
  }

  // --- Document Lifecycle Actions ---
  viewDetails(doc: DocumentQms): void {
    this.selectedDocument = doc;
    this.currentView = 'detail';
    this.ongletDetail = 'detail';

    if (doc.id) {
      this.workflowState = undefined;
      this.qmsService.getDocumentById(doc.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (fullDoc: any) => { this.selectedDocument = fullDoc; this.workflowState = fullDoc.workflowState; },
          error: (err: any) => console.warn('Could not fetch dynamic workflow state', err)
        });
    }
  }

  openTransitionDialog(doc: DocumentQms): void {
    this.selectedDocument = doc;
    this.showTransitionModal = true;
  }

  submitTransition(decision: TransitionDecision): void {
    if (!this.selectedDocument) return;

    this.loading = true;

    this.qmsService.transitionStatus(this.selectedDocument.id!, decision.nextStatus, decision.reason)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedDoc) => {
          this.loading = false;
          this.showTransitionModal = false;
          if (this.currentView === 'detail' && this.selectedDocument?.id === updatedDoc.id) {
            this.selectedDocument = updatedDoc;
          }
          this.refreshList();
          this.messageService.add({
            severity: 'success',
            summary: 'Statut mis à jour',
            detail: `Le document est maintenant dans l'état: ${this.getStatusLabel(updatedDoc)}`
          });
        },
        error: (err: any) => {
          this.loading = false;
          showToast(StatusEnum.error, err.status, 'Échec de la transition', this.messageService, err);
        }
      });
  }

  // --- Document Opener ---
  openSecuredDocument(doc: DocumentQms): void {
    this.messageService.add({
      severity: 'info',
      summary: 'Ouverture du document',
      detail: 'Chargement en cours...'
    });

    this.qmsService.exportSecuredPdf(doc.id!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob: Blob) => {
          const url = window.URL.createObjectURL(blob);
          window.open(url, '_blank');
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Échec de l\'ouverture',
            detail: 'Le fichier est introuvable ou inaccessible.'
          });
        }
      });
  }

  // --- Document Downloader ---
  downloadSecuredPdf(doc: DocumentQms): void {
    this.messageService.add({
      severity: 'info',
      summary: 'Téléchargement en cours',
      detail: 'Récupération du fichier...'
    });

    this.qmsService.exportSecuredPdf(doc.id!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob: Blob) => {
          const filename = doc.documentNumber ?? 'document';
          const url = window.URL.createObjectURL(blob);
          const link = window.document.createElement('a');
          link.href = url;
          link.download = filename;
          link.click();
          window.URL.revokeObjectURL(url);
          this.messageService.add({
            severity: 'success',
            summary: 'Téléchargement réussi',
            detail: `Le fichier "${filename}" a été téléchargé.`
          });
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Échec du téléchargement',
            detail: 'Le fichier est introuvable ou inaccessible.'
          });
        }
      });
  }

  /**
   * Peut-on filtrer la liste par processus émetteur ?
   *
   * <p>Réservé à la qualité et à l'administration générale : ce sont les seuls dont la liste porte
   * sur plusieurs structures. Pour les autres, le serveur restreint déjà le fonds visible à leur
   * propre structure — le filtre n'y avait qu'un effet, celui de vider la liste dès qu'on y
   * choisissait une autre structure, sans que rien n'explique pourquoi.</p>
   *
   * <p>Mêmes rôles que le reclassement d'un document, plus bas : la question posée est la même,
   * « voit-on au-delà de sa structure ». Le contrôle qui compte reste celui du serveur ; l'écran se
   * borne à ne pas proposer un critère qui ne peut rien rendre.</p>
   */
  get peutFiltrerParProcessusEmetteur(): boolean {
    return isUserInRoles(['SUPER_ADMIN', 'SUPERADMIN', 'ADMIN', 'RESPONSABLE_QUALITE']);
  }

  // ---------------------------------------------------------------- onglets de la fiche

  /**
   * Le suivi interne du document est-il ouvert à l'appelant ?
   *
   * <p>Faux sur un document reçu par simple partage, venu d'une autre structure : le serveur refuse
   * alors ses versions, sa piste d'audit et les décisions de son circuit. C'est lui qui le dit —
   * l'écran ne le devine pas.</p>
   */
  private get aLeSuiviInterne(): boolean {
    return this.selectedDocument?.suiviInterneAutorise !== false;
  }

  /**
   * Droit d'ouvrir chaque onglet, exprimé une fois.
   *
   * <p>Ces conditions gardent trois choses à la fois : l'en-tête de l'onglet, le panneau qu'il
   * révèle, et l'ouverture par programme depuis le menu de la liste. Les avoir écrites dans le
   * gabarit ne gardait que les en-têtes : le panneau se rendait quand même dès que
   * {@link #ongletDetail} le désignait, et le menu de la liste y menait sans vérifier la
   * permission. Le serveur refusait bien les données, mais l'écran proposait une vue qu'il aurait
   * dû taire.</p>
   */
  get peutVoirLesVersions(): boolean {
    return this.aLeSuiviInterne && this.hasPermission('document-history');
  }

  get peutVoirLaPisteAudit(): boolean {
    return this.aLeSuiviInterne && this.hasPermission('document-audit');
  }

  get peutGererLesPartages(): boolean {
    return this.aLeSuiviInterne && this.hasPermission('document-write');
  }

  /** Déposer une demande ne dépend pas de l'écriture ; en lire l'historique non plus. */
  get peutVoirLesDemandes(): boolean {
    return this.aLeSuiviInterne;
  }

  get peutVoirLeCircuit(): boolean {
    return this.aLeSuiviInterne && this.hasPermission('document-history');
  }

  /** L'onglet demandé est-il ouvert à l'appelant ? La fiche elle-même l'est toujours. */
  private ongletAutorise(onglet: OngletDetail): boolean {
    switch (onglet) {
      case 'historique': return this.peutVoirLesVersions;
      case 'audit': return this.peutVoirLaPisteAudit;
      case 'partages': return this.peutGererLesPartages;
      case 'demandes': return this.peutVoirLesDemandes;
      case 'circuit': return this.peutVoirLeCircuit;
      default: return true;
    }
  }

  /**
   * Ouvre un onglet de la fiche, et charge ce qu'il montre.
   *
   * <p>Le chargement suit l'onglet : demander les six jeux de données à l'ouverture d'un document
   * aurait déclenché six requêtes pour cinq vues que l'utilisateur n'ouvre pas toujours. Chaque
   * activation relit — une piste d'audit ou une liste de demandes périmée serait pire qu'une
   * seconde d'attente.</p>
   *
   * <p>Un onglet hors de portée ramène à la fiche : le contrôle ne peut pas vivre dans les seuls
   * en-têtes, puisque le menu de la liste ouvre un onglet directement.</p>
   */
  // `p-tabs` émet la valeur de l'onglet sans la typer plus finement que « chaîne ou nombre ».
  ouvrirOnglet(onglet: OngletDetail | string | number): void {
    const doc = this.selectedDocument;
    const demande = onglet as OngletDetail;
    this.ongletDetail = this.ongletAutorise(demande) ? demande : 'detail';
    if (!doc?.id) {
      return;
    }

    switch (this.ongletDetail) {
      case 'historique':
        this.chargerVersions(doc);
        break;
      case 'audit':
        this.chargerPisteAudit(doc);
        break;
      case 'demandes':
        this.chargerDemandes(doc);
        break;
      case 'circuit':
        this.chargerHistoriqueCircuit(doc);
        break;
      case 'partages':
        this.chargerPartages(doc);
        break;
      default:
        break;
    }
  }

  // --- Version History Drawer ---
  /** Ouvre la fiche sur ses versions. Conservé : le menu de la liste y mène directement. */
  viewVersionHistory(doc: DocumentQms): void {
    this.selectedDocument = doc;
    this.currentView = 'detail';
    this.ouvrirOnglet('historique');
  }

  private chargerVersions(doc: DocumentQms): void {
    this.loading = true;
    this.qmsService.getVersionHistory(doc.id!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (history) => {
          this.versionHistory = history;
          this.loading = false;
        },
        error: (err: any) => {
          this.loading = false;
          showToast(StatusEnum.error, err.status, 'Erreur historique de versions', this.messageService, err);
        }
      });
  }

  // --- Audit Trail Logs Drawer ---
  /** Ouvre la fiche sur sa piste d'audit. */
  viewAuditLogs(doc: DocumentQms): void {
    this.selectedDocument = doc;
    this.currentView = 'detail';
    this.ouvrirOnglet('audit');
  }

  private chargerPisteAudit(doc: DocumentQms): void {
    this.loading = true;
    this.qmsService.getAuditLogs(doc.id!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (logs) => {
          this.auditLogs = logs;
          this.loading = false;
        },
        error: (err: any) => {
          this.loading = false;
          showToast(StatusEnum.error, err.status, "Erreur logs d'audit", this.messageService, err);
        }
      });
  }

  // Dynamic Actions Menu Trigger
  setActionMenu(event: any, menu: any, doc: DocumentQms) {
    this.selectedDocument = doc;
    const items: MenuItem[] = [
      {
        label: 'Détails',
        icon: 'pi pi-eye',
        command: () => this.viewDetails(doc)
      },
      {
        label: 'Ouvrir le document',
        icon: 'pi pi-external-link',
        command: () => this.openSecuredDocument(doc)
      },
      {
        label: 'Télécharger le document',
        icon: 'pi pi-download',
        command: () => this.downloadSecuredPdf(doc)
      }
    ];

    const hasValidate = this.hasPermission('DOC_VALIDATE');
    const hasWrite = this.hasPermission('DOC_WRITE');

    // Les boutons et étapes s'adaptent à 100% au workflow actif du document
    if (doc.currentEtape && hasValidate) {
      items.push({
        label: this.getWorkflowDecisionLabel(doc.currentEtape, 'APPROUVE'),
        icon: 'pi pi-check-circle',
        command: () => this.openWorkflowDialog(doc, {code: 'APPROUVE', libelle: 'Approuver'})
      });
      items.push({
        label: this.getWorkflowDecisionLabel(doc.currentEtape, 'REJETE'),
        icon: 'pi pi-times-circle',
        command: () => this.openWorkflowDialog(doc, {code: 'REJETE', libelle: 'Rejeter'})
      });
    }

    items.push(
      {
        label: 'Historique Versions',
        icon: 'pi pi-history',
        command: () => this.viewVersionHistory(doc)
      },
      {
        label: 'Piste d\'Audit',
        icon: 'pi pi-list',
        command: () => this.viewAuditLogs(doc)
      }
    );

    if (hasWrite || this.hasPermission('DOC_SHARE')) {
      items.push({
        label: 'Partage & Permissions',
        icon: 'pi pi-share-alt',
        command: () => this.openShareModal(doc)
      });
    }

    // Le classement décide de qui voit le document : seules l'administration générale et la
    // qualité le révisent. Le serveur le vérifie de son côté ; l'écran se borne à ne pas
    // proposer une action qui serait refusée.
    if (isUserInRoles(['SUPER_ADMIN', 'SUPERADMIN', 'ADMIN', 'RESPONSABLE_QUALITE'])) {
      items.push({
        label: doc.niveauConfidentialiteId
          ? 'Changer le niveau de confidentialité'
          : 'Classer le document',
        icon: 'pi pi-shield',
        command: () => this.ouvrirReclassement(doc)
      });
    }

    this.actionMenuItems = items;
    menu.toggle(event);
  }

  getWorkflowDecisionLabel(currentEtape: string | undefined, decision: 'APPROUVE' | 'REJETE'): string {
    if (!currentEtape) return decision === 'APPROUVE' ? 'Approuver' : 'Rejeter';
    return decision === 'APPROUVE' ? `Approuver (${currentEtape})` : `Rejeter (${currentEtape})`;
  }

  selectedWorkflowAction?: any;

  openWorkflowDialog(doc: DocumentQms, action: any): void {
    this.selectedDocument = doc;
    this.selectedWorkflowAction = action;
    this.showWorkflowModal = true;
  }

  /**
   * Transmet la décision, commentaire et champs saisis compris.
   *
   * <p>Seul le commentaire partait jusqu'ici : une étape exigeant d'autres saisies se soldait par
   * un refus en 400 que l'écran ne permettait pas de corriger, faute de présenter les champs.</p>
   */
  submitWorkflowDecision(decision: DecisionConfirmee): void {
    if (!this.selectedDocument || !this.selectedWorkflowAction) return;

    this.loading = true;
    const docId = this.selectedDocument.id!;
    const actionCode = this.selectedWorkflowAction.code;
    // Étape sur laquelle l'écran croit agir : le serveur rejette la demande en 409 si le dossier
    // a changé d'étape entre-temps, ce qui neutralise aussi le second envoi d'un double clic.
    const expectedStateCode = this.workflowState?.currentStateCode;

    this.workflowService
      .executeTransition(docId, actionCode, {
        comments: decision.comments,
        expectedStateCode,
        fields: decision.fields
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loading = false;
          this.showWorkflowModal = false;
          this.selectedWorkflowAction = undefined;
          this.refreshList();
          // La fiche reste affichée après la décision : sans relecture, elle continuerait à
          // proposer les actions de l'étape précédente, que le serveur refuserait désormais.
          if (this.currentView === 'detail' && this.selectedDocument) {
            this.viewDetails(this.selectedDocument);
          }
          this.messageService.add({
            severity: 'success',
            summary: 'Action exécutée',
            detail: "L'action a été enregistrée avec succès."
          });
        },
        error: (erreur: WorkflowError) => {
          this.loading = false;
          this.signalerErreurWorkflow(erreur);
        }
      });
  }

  /**
   * Présente le message du serveur plutôt qu'un libellé générique.
   *
   * <p>workflow-service rédige des messages destinés à l'utilisateur, qui disent quoi faire :
   * quels champs manquent, ou que le dossier a changé d'étape. Dans ce dernier cas l'écran est
   * périmé — le dialogue est refermé et la fiche rechargée, sinon l'utilisateur réessaierait
   * indéfiniment une action qui ne peut plus aboutir.</p>
   */
  private signalerErreurWorkflow(erreur: WorkflowError): void {
    this.messageService.add({
      severity: erreur.estInterdit ? 'warn' : 'error',
      summary: erreur.estPerime ? 'Dossier modifié entre-temps' : "Action impossible",
      detail: erreur.message,
      life: 8000
    });

    if (erreur.estPerime) {
      this.showWorkflowModal = false;
      this.selectedWorkflowAction = undefined;
      if (this.selectedDocument) {
        this.viewDetails(this.selectedDocument);
      }
      this.refreshList();
    }
  }

  /**
   * Ouvre le dépôt d'une demande sur ce document.
   *
   * <p>La page de dépôt reçoit le document en paramètre : on y arrive depuis sa fiche, il n'y a
   * aucune raison de le rechercher dans une liste. La nature — modification ou suppression — s'y
   * choisit, avec l'avertissement qui accompagne la seconde.</p>
   */
  demanderUneModification(doc: DocumentQms): void {
    this.router.navigate(['/gestion-documentaire/demandes/nouvelle'],
      { queryParams: { documentId: doc.id } });
  }

  /**
   * Demandes de modification et de suppression portées sur ce document.
   *
   * <p>Quatrième regard sur le dossier : l'historique porte sur les versions, la piste d'audit sur
   * les opérations, la traçabilité sur les décisions du circuit du document — aucune ne disait ce
   * qu'on avait demandé à son sujet.</p>
   */
  viewDemandes(doc: DocumentQms): void {
    this.selectedDocument = doc;
    this.currentView = 'detail';
    this.ouvrirOnglet('demandes');
  }

  private chargerDemandes(doc: DocumentQms): void {
    this.demandesDuDocument = [];
    this.loading = true;

    this.demandeService
      .parDocument(doc.id!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (demandes) => {
          this.demandesDuDocument = demandes ?? [];
          this.loading = false;
        },
        error: (erreur: any) => {
          this.loading = false;
          this.messageService.add({
            severity: 'error', summary: 'Demandes indisponibles',
            detail: erreur.error?.message || "Les demandes de ce document n'ont pas pu être chargées."
          });
        }
      });
  }

  /** Décisions successives du circuit : qui a validé, quand, sur quels motifs. */
  viewValidationHistory(doc: DocumentQms): void {
    this.selectedDocument = doc;
    this.currentView = 'detail';
    this.ouvrirOnglet('circuit');
  }

  private chargerHistoriqueCircuit(doc: DocumentQms): void {
    this.validationHistory = [];
    this.loading = true;

    this.workflowService
      .getValidationHistory(doc.id!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (historique) => {
          this.validationHistory = historique;
          this.loading = false;
        },
        error: (erreur: WorkflowError) => {
          this.loading = false;
          this.signalerErreurWorkflow(erreur);
        }
      });
  }

  /**
   * L'apparence d'une action découle de sa décision (APPROUVE / REJETE), pas de son code.
   * Le code est l'identifiant technique de la transition — « 15 », « 18 » — qu'aucun test de
   * libellé ne pouvait reconnaître : tous les boutons ressortaient gris, y compris l'approbation
   * et le rejet. Le libellé reste utilisé en dernier recours pour affiner l'icône.
   */
  getIconForAction(action: WorkflowActionDto): string {
    if (action?.decision === 'REJETE') return 'pi pi-times-circle';
    if (action?.decision === 'APPROUVE') {
      return (action.libelle || '').toUpperCase().includes('SOUMETTRE') ? 'pi pi-send' : 'pi pi-check-circle';
    }
    return 'pi pi-cog';
  }

  getClassForAction(action: WorkflowActionDto): string {
    if (action?.decision === 'REJETE') return 'p-button-danger shadow-sm';
    if (action?.decision === 'APPROUVE') {
      return (action.libelle || '').toUpperCase().includes('SOUMETTRE')
        ? 'p-button-info shadow-sm'
        : 'p-button-success shadow-sm';
    }
    return 'p-button-secondary shadow-sm';
  }

  executeDynamicAction(action: any): void {
    if (!this.selectedDocument) return;
    this.openWorkflowDialog(this.selectedDocument, action);
  }

  openAssignWorkflowModal(doc: DocumentQms): void {
    this.selectedDocument = doc;

    // Charger les workflows disponibles
    this.loading = true;
    this.workflowService.getAllWorkflows()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (workflows: any) => {
          this.availableWorkflows = workflows;
          this.loading = false;
          this.showAssignWorkflowModal = true;
        },
        error: (err: any) => {
          this.loading = false;
          showToast(StatusEnum.error, err.status, 'Erreur de chargement des workflows', this.messageService, err);
        }
      });
  }


  submitWorkflowAssignment(workflowId: string): void {
    if (!this.selectedDocument) return;

    this.loading = true;

    this.qmsService.assignWorkflow(this.selectedDocument.id!, workflowId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedDoc) => {
          this.loading = false;
          this.showAssignWorkflowModal = false;
          this.refreshList();
          this.messageService.add({
            severity: 'success',
            summary: 'Workflow assigné',
            detail: 'Le document a été soumis au circuit de validation avec succès.'
          });
        },
        error: (err) => {
          this.loading = false;
          // showToast with err
          showToast(StatusEnum.error, err.status, "Échec de l'assignation du workflow", this.messageService, err);
        }
      });
  }

  editInOffice(_doc: DocumentQms): void {
    this.messageService.add({
      severity: 'info',
      summary: 'Non disponible',
      detail: "L'édition en direct n'est pas encore supportée."
    });
  }

  // --- Partage & Gestion des Accès (ACL) ---
  /**
   * Ouvre la fiche sur ses partages.
   *
   * <p>Ils tenaient dans une fenêtre surgissante : on ne pouvait pas les regarder en même temps que
   * le document, et rien sur la fiche ne disait avec qui il était partagé sans ouvrir ce dialogue.
   * C'est une propriété du document, elle se consulte comme les autres.</p>
   */
  openShareModal(doc: DocumentQms): void {
    this.selectedDocument = doc;
    this.currentView = 'detail';
    this.ouvrirOnglet('partages');
  }

  private chargerPartages(doc: DocumentQms): void {
    this.activeTab = 'access';
    this.selectedStructureFilter = undefined;
    this.selectedUser = undefined;
    this.filteredUsers = [];
    this.systemUsers = [];
    this.loadSystemUsers();
    this.loadDocumentAccess(doc);
    this.chargerPartagesStructure(doc);
  }

  /** Structures déjà destinataires d'un partage sur ce document. */
  partagesStructure: any[] = [];

  chargerPartagesStructure(doc: DocumentQms): void {
    this.qmsService.getPartagesStructure(doc.id!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (partages) => (this.partagesStructure = partages ?? []),
        error: () => (this.partagesStructure = [])
      });
  }

  /**
   * Partage le document avec une structure entière, à l'étape en cours.
   *
   * <p>Le serveur consigne l'étape et refuse le partage vers la structure émettrice ; l'écran ne
   * la propose donc pas.</p>
   */
  partagerAvecStructure(choix: { structureId: string; structureLibelle: string }): void {
    if (!this.selectedDocument?.id) {
      return;
    }
    this.qmsService.partagerAvecStructureDestinataire(
        this.selectedDocument.id, choix.structureId, choix.structureLibelle)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success', summary: 'Partagé',
            detail: `Document ouvert à ${choix.structureLibelle || 'la structure choisie'}.`
          });
          this.chargerPartagesStructure(this.selectedDocument!);
        },
        error: (err: any) => this.messageService.add({
          severity: 'error', summary: 'Partage impossible',
          detail: err.error?.message || "Le partage n'a pas pu être enregistré."
        })
      });
  }

  retirerPartageStructure(partage: any): void {
    if (!this.selectedDocument?.id) {
      return;
    }
    this.qmsService.retirerPartageStructure(this.selectedDocument.id, partage.structureId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success', summary: 'Partage retiré',
            detail: 'La structure n\'a plus accès à ce document.'
          });
          this.chargerPartagesStructure(this.selectedDocument!);
        },
        error: (err: any) => this.messageService.add({
          severity: 'error', summary: 'Retrait impossible',
          detail: err.error?.message || "Le partage n'a pas pu être retiré."
        })
      });
  }

  loadDocumentAccess(doc: DocumentQms): void {
    this.loadingAccess = true;
    this.qmsService.getDocumentAccess(doc.id!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (list) => {
          this.accessList = list;
          this.loadingAccess = false;
        },
        error: (err: any) => {
          this.loadingAccess = false;
          console.error('Erreur chargement des accès', err);
        }
      });
  }

  extractUserInfos(u: any): { id: string; firstName: string; lastName: string; email: string; fullName: string } {
    const userObj = u.user ? u.user : u;
    const id = userObj.id || userObj.userId || '';
    const firstName = userObj.firstName || '';
    const lastName = userObj.lastName || '';
    const email = userObj.email || '';
    const fullName = `${firstName} ${lastName}`.trim() || userObj.username || id;
    return { id, firstName, lastName, email, fullName };
  }

  loadSystemUsers(): void {
    this.authService.getAllUsers(0, 1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          const users = res.data?.content || res.content || res || [];
          const list = Array.isArray(users) ? users : [];
          this.systemUsers = list.map((u: any) => this.extractUserInfos(u));
          this.filteredUsers = [...this.systemUsers];
        },
        error: (err: any) => {
          console.error('Erreur chargement des utilisateurs du système', err);
        }
      });
  }

  onStructureFilterChange(structureId?: string): void {
    this.selectedUser = undefined;

    if (!structureId) {
      this.filteredUsers = [...this.systemUsers];
      return;
    }

    this.loadingAccess = true;
    this.authService.loadAgentPublicByService(structureId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          const users = res.data?.content || res.data || res.content || res || [];
          const list = Array.isArray(users) ? users : [];
          this.filteredUsers = list.map((u: any) => this.extractUserInfos(u));
          this.loadingAccess = false;
        },
        error: (err: any) => {
          this.loadingAccess = false;
          console.error('Erreur chargement des utilisateurs de la structure', err);
          this.filteredUsers = [];
        }
      });
  }

  onUserSelected(user: any): void {
    if (user) {
    } else {
    }
  }

  /**
   * Permissions réellement détenues par l'utilisateur, chargées à la connexion dans
   * NgxPermissionsService. Cette méthode renvoyait `true` sans rien vérifier : tous les boutons
   * s'affichaient pour tout le monde. La comparaison est insensible à la casse, le serveur
   * normalisant les codes en majuscules.
   */
  hasPermission(p: string): boolean {
    const detenues = Object.keys(this.ngxPermissionsService.getPermissions() || {});
    const attendue = p.toUpperCase();
    return detenues.some(d => d.toUpperCase() === attendue);
  }

  submitPermissions(octroi: AccessGrant): void {
    if (!this.selectedDocument) return;
    this.loading = true;
    this.qmsService.grantAccess(
      this.selectedDocument.id!,
      octroi.userId,
      octroi.userFullName,
      octroi.userEmail,
      octroi.role
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loading = false;
          this.loadDocumentAccess(this.selectedDocument!);
          this.messageService.add({
            severity: 'success',
            summary: 'Accès accordé',
            detail: `Les droits ${octroi.role} ont été accordés.`
          });
        },
        error: (err: any) => {
          this.loading = false;
          showToast(StatusEnum.error, err.status, "Échec de l'affectation", this.messageService, err);
        }
      });
  }

  revokeAccess(access: DocumentUserAccess): void {
    if (!this.selectedDocument) return;
    this.qmsService.revokeAccess(this.selectedDocument.id!, access.userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loadDocumentAccess(this.selectedDocument!);
          this.messageService.add({
            severity: 'success',
            summary: 'Accès révoqué',
            detail: `L'accès de l'utilisateur a été révoqué.`
          });
        },
        error: (err: any) => showToast(StatusEnum.error, err.status, 'Échec de la révocation', this.messageService, err)
      });
  }

  // Helper mapping tags classes
  getStatusSeverity(doc: DocumentQms | undefined): string {
    if (!doc) return 'secondary';
    if (doc.obsolete) return 'danger';
    if (doc.enRetardRevision) return 'danger';
    if (doc.esTraiter) return 'success';
    if (doc.currentEtape) return 'warn';
    return 'info'; // Brouillon
  }

  getStatusLabel(doc: DocumentQms | undefined): string {
    if (!doc) return 'Inconnu';
    if (doc.obsolete) return 'Obsolète';
    if (doc.enRetardRevision) return 'En Retard Révision';
    if (doc.esTraiter) return 'Validé / En Vigueur';
    if (doc.currentEtape) return doc.currentEtape;
    return 'Brouillon';
  }

  getTransitionOptions(doc: DocumentQms | undefined): { label: string; value: string }[] {
    if (!doc) return [];
    if (doc.obsolete) {
      return [
        { label: 'Lancer une révision (Brouillon)', value: 'brouillon' }
      ];
    }
    if (doc.enRetardRevision) {
      return [
        { label: 'Lancer une révision (Brouillon)', value: 'brouillon' },
        { label: 'Rendre Obsolète', value: 'obsolete' }
      ];
    }
    if (doc.esTraiter) {
      return [
        { label: 'Rendre Obsolète', value: 'obsolete' },
        { label: 'Retourner en modification (Brouillon)', value: 'brouillon' }
      ];
    }
    if (doc.currentEtape) {
      // En cours de validation par le workflow
      return [
        { label: 'Valider et Publier (Mise en vigueur)', value: 'valide' },
        { label: 'Rejeter au step précédent', value: 'brouillon' }
      ];
    }
    // Brouillon
    return [
      { label: 'Soumettre pour approbation', value: 'en_approbation' }
    ];
  }
}
