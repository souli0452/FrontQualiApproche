import { Component, ComponentRef, EventEmitter, Input, OnInit, OnChanges, AfterViewInit, OnDestroy, SimpleChanges, Output, ViewChild, ViewContainerRef, booleanAttribute } from '@angular/core';
import { ConfirmationService, MenuItem, MessageService } from 'primeng/api';
import { CommonModule, DatePipe } from '@angular/common';
import { Table } from 'primeng/table';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FeaturesService } from "../../../services/feature-service";
import { TypeDemande } from "../../../utils/global/global-utils";
import { EtapeTraitement, StatusEnum } from '../../../enums/enums';
import { NgPrimeModule } from '../../../../prime-ng.module';
import { WorkflowActionsComponent, WorkflowDecisionDialogComponent, DecisionConfirmee } from '../../../shared';
import { WorkflowService } from '../../../services/workflow.service';
import { ResultatDecisionDto, StepDecision, WorkflowActionDto } from '../../../models/workflow.model';
import { ProcNonConformiteService } from '../../../services/non-conformite/proc-non-conformite.service';
import { Router } from '@angular/router';
import { NonConformiteService } from '../../../services/non-conformite/non-conformite.service';
import { GlobalSearchService } from '../../../services/non-conformite/global-search.service';


@Component({
    selector: 'app-traitement-table',
    templateUrl: './traitement-table.html',
    styleUrl: './traitement-table.scss',
    providers: [DatePipe],
    standalone: true,
    imports: [CommonModule, NgPrimeModule, WorkflowActionsComponent, WorkflowDecisionDialogComponent]
})
export class TraitementTableComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {
    @Input() demandeList: Array<any> = [];
    @Input() loading: boolean = false;
    @Input() paginator: boolean = true;
    @Input() showGridlines: boolean = true;
    @Input() balanceFrozen: boolean = false;

    @Input() totalElements: number = 0;
    @Input() pageSize: number = 10;
    @Input() currentPage: number = 0;
    @Input() recordName: string = 'non-conformités';
    @Output() pageChangeEvent = new EventEmitter<{ page: number, size: number }>();

    get skeletonRows(): number[] {
        return Array.from({ length: this.pageSize || 5 }, (_, i) => i);
    }

    @Input({ transform: booleanAttribute }) showSearch: boolean = false;


    @Input() btnActions?: EtapeTraitement = EtapeTraitement.RECEPTION;
    @Input() status?: String;
    @Input() title?: string;
    @Input() subtitle?: string;
    @Input() hasFilters: boolean = false;
    @Input() allowDeleteUnconditionally: boolean = false;
    @Output() onImputation = new EventEmitter<any>();
    @Output() onValidation = new EventEmitter<any>();
    @Output() onStructureValidation = new EventEmitter<any>();
    @Output() onSaveEntity = new EventEmitter<any>();
    @Output() onReceptionner = new EventEmitter<any>();
    @Output() onArchive = new EventEmitter<any>();
    @Output() onDelete = new EventEmitter<any>();

    @ViewChild('detailContainer', { read: ViewContainerRef, static: true }) detailContainer?: ViewContainerRef;
    @ViewChild('dt') dt?: Table;
    currentSearchQuery: string = '';
    private destroy$ = new Subject<void>();

    protected readonly BtnActions = EtapeTraitement;

    imputationKey = 'imputationKey_' + Math.random().toString(36).substr(2, 9);
    @Input() cols: any[] = [];
    colsFilter: any[] = [];
    agentSeachError: boolean = false;
    isAgentSeach: boolean = false;
    numerMatricule?: string;
    displayDetail = false;
    selectedDemande: any;
    componentRef: ComponentRef<any> | undefined;
    hasNonTraiter: boolean = true;
    hasInactive: boolean = true;
    nbreInactive: boolean = true;
    totalActions: number = 0;
    nombreTraites: number = 0;
    nombreNonTraites: number = 0;

    rowMenuItems: MenuItem[] = [];
    activeRow: any;

    constructor(
        private messageService: MessageService,
        private confirmationService: ConfirmationService,
        private featureService: FeaturesService,
        private datePipe: DatePipe,
        private nonConformiteService: ProcNonConformiteService,
        private workflowService: WorkflowService,
        private router: Router,
        private globalNcService: NonConformiteService,
        private globalSearchService: GlobalSearchService
    ) {
    }

    /**
     * Dépôt d'une pièce exigée par une étape du circuit, remis au moteur sous forme de référence.
     *
     * <p>Champ plutôt que méthode : la fonction est appelée depuis le dialogue de décision, hors
     * de tout contexte d'instance, et y perdrait son {@code this}.</p>
     */
    deposerFichier = (fichier: File) => this.nonConformiteService.deposerFichier(this.selectedDemande?.id, fichier);

    /**
     * Une décision du circuit vient d'être prise : la fiche se referme et la liste se recharge.
     *
     * <p>Recharger plutôt que corriger la ligne en mémoire : l'étape atteinte, les actions
     * désormais ouvertes et l'état du dossier sont décidés par le serveur. Les déduire ici aurait
     * recréé la seconde source de vérité dont on vient de se défaire.</p>
     */
    // ------------------------------------------------------------------ décision groupée

    /** Dossiers cochés. */
    selectionMultiple: any[] = [];

    /** Décision en cours d'application sur le lot : le dialogue et les boutons l'attendent. */
    lotEnCours = false;
    decisionGroupeeOuverte = false;
    actionGroupee?: WorkflowActionDto;

    /**
     * Décisions que le moteur ouvre sur <b>tous</b> les dossiers cochés.
     *
     * <p>L'intersection, et non l'union : proposer une action qu'un seul dossier autorise
     * garantissait un refus sur les autres. C'est ce que faisait l'ancien traitement groupé, qui
     * poussait la même charge utile sur toute la sélection.</p>
     */
    get actionsCommunes(): WorkflowActionDto[] {
        if (!this.selectionMultiple.length) {
            return [];
        }
        const [premier, ...autres] = this.selectionMultiple;
        const actions: WorkflowActionDto[] = premier?.workflowState?.allowedActions ?? [];
        return actions.filter((action) =>
            autres.every((dossier) =>
                (dossier?.workflowState?.allowedActions ?? []).some((a: WorkflowActionDto) => a.code === action.code)));
    }

    /** Étape des dossiers cochés : ils la partagent, l'action commune en découle. */
    get etapeDeLaSelection(): string | undefined {
        return this.selectionMultiple[0]?.workflowState?.currentStateName;
    }

    get champsDeLaSelection(): any[] {
        return this.selectionMultiple[0]?.workflowState?.currentStepFields ?? [];
    }

    get referenceDeLaSelection(): string {
        return `${this.selectionMultiple.length} dossier(s) sélectionné(s)`;
    }

    /**
     * Ce qu'il faut dire quand la sélection n'ouvre aucune décision commune.
     *
     * <p>Sans message, aucun bouton n'apparaissait et rien ne l'expliquait : l'utilisateur pouvait
     * croire à un écran qui ne répond pas, et cocher encore. La cause n'est pas la même selon qu'il
     * a coché un dossier ou plusieurs — l'un n'offre rien, les autres n'offrent rien
     * <b>ensemble</b>.</p>
     */
    get messageSansActionCommune(): string | null {
        if (!this.selectionMultiple.length || this.actionsCommunes.length) {
            return null;
        }
        if (this.selectionMultiple.length === 1) {
            return "Aucune décision ne vous est ouverte sur ce dossier à son étape actuelle.";
        }
        return "Ces dossiers n'ont aucune décision en commun : ils ne sont pas à la même étape, "
            + "ou toutes ne vous sont pas ouvertes. Traitez-les séparément, ou restreignez la "
            + "sélection.";
    }

    severiteDe(action: WorkflowActionDto): any {
        if (action.severity) {
            return action.severity;
        }
        if (action.decision === 'REJETE') {
            return 'danger';
        }
        return action.decision === 'CLOTURE' ? 'warn' : 'success';
    }

    ouvrirDecisionGroupee(action: WorkflowActionDto) {
        this.actionGroupee = action;
        this.decisionGroupeeOuverte = true;
    }

    /**
     * Applique la décision à la sélection, puis rend compte de ce qui est passé.
     *
     * <p>Le serveur juge chaque dossier séparément : une partie peut être refusée. Annoncer un
     * succès global laisserait l'utilisateur croire que tout est fait, alors que des dossiers
     * seraient restés en place sans qu'il le sache.</p>
     */
    executerDecisionGroupee(decision: DecisionConfirmee) {
        const identifiants = this.selectionMultiple.map((d) => d.id).filter(Boolean);
        // L'approbation servait de sens par défaut à tout ce qui n'était pas un rejet : une
        // clôture groupée serait partie comme une approbation.
        const nature = this.actionGroupee?.decision;
        const sens: StepDecision = nature === 'REJETE' || nature === 'CLOTURE' ? nature : 'APPROUVE';
        if (!identifiants.length) {
            return;
        }

        this.lotEnCours = true;
        this.workflowService.decideEnLot(identifiants, sens, {
            comments: decision.comments,
            fields: decision.fields
        }).subscribe({
            next: (resultats) => {
                this.lotEnCours = false;
                this.decisionGroupeeOuverte = false;
                this.actionGroupee = undefined;
                this.selectionMultiple = [];
                this.rendreCompteDuLot(resultats);
                this.featureService.onReloadRequested(true);
            },
            error: (erreur: any) => {
                this.lotEnCours = false;
                this.messageService.add({
                    severity: 'error',
                    summary: 'Décision groupée refusée',
                    detail: erreur?.message || "Aucune décision n'a pu être enregistrée.",
                    life: 8000
                });
            }
        });
    }

    private rendreCompteDuLot(resultats: ResultatDecisionDto[]) {
        const abouties = resultats.filter((r) => r.aboutie).length;
        const refusees = resultats.filter((r) => !r.aboutie);

        if (abouties) {
            this.messageService.add({
                severity: 'success',
                summary: 'Décisions enregistrées',
                detail: `${abouties} dossier(s) traité(s).`,
                life: 5000
            });
        }
        // Les refus sont énoncés un par un, avec leur motif : « 3 refusés » n'apprendrait rien à
        // qui doit décider quoi faire ensuite.
        for (const refus of refusees) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Dossier non traité',
                detail: refus.motif || 'La décision a été refusée sur ce dossier.',
                life: 10000
            });
        }
    }

    circuitAvance() {
        this.closeDetailsDialog();
        this.featureService.onReloadRequested(true);
    }

    ngOnInit() {
        this.updateColsFilter();
        console.log("DONNEES DU TABLEAU INITIALES (ngOnInit) :", this.demandeList);
    }

    ngAfterViewInit() {
        this.globalSearchService.searchQuery$
            .pipe(takeUntil(this.destroy$))
            .subscribe((query: string) => {
                this.currentSearchQuery = query || '';
                if (this.dt) {
                    this.dt.filterGlobal(this.currentSearchQuery, 'contains');
                }
            });
    }

    ngOnChanges(changes: any) {
        if (changes.cols) {
            this.updateColsFilter();
        }
        if (changes.demandeList) {
            console.log("DONNEES DU TABLEAU MISES A JOUR (ngOnChanges) :", this.demandeList);
            if (this.dt && this.currentSearchQuery) {
                setTimeout(() => {
                    this.dt?.filterGlobal(this.currentSearchQuery, 'contains');
                });
            }
        }
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    private updateColsFilter() {
        const baseFields = this.cols ? this.cols.map((col: any) => col.field) : [];
        const extraFields = [
            'numeroReference', 'numeroDeReference', 'numeroNc',
            'structureSoumissionLibelle', 'structureDeSoumissionLibelle', 'procEmetteur',
            'typeNonConformiteLibelle', 'sourceDeNonConformiteLibelle',
            'niveauNonConformiteLibelle', 'etatDeTraitement', 'status',
            'description', 'justification'
        ];
        this.colsFilter = Array.from(new Set([...baseFields, ...extraFields]));
    }

    onLocalSearchInput(val: string) {
        this.currentSearchQuery = val;
        this.globalSearchService.updateSearchQuery(val);
        if (this.dt) {
            this.dt.filterGlobal(val, 'contains');
        }
    }

    closeDetailsDialog() {
        this.displayDetail = false;
        this.detailContainer?.clear();

    }
    displayDetails(rowData?: any) {
        console.log("DONNEES DE LA DEMANDE SELECTIONNEE (displayDetails) :", rowData);
        if (this.displayDetail) {
            this.closeDetailsDialog();
        } else {
            const targetId = rowData?.nonConformeId || rowData?.id;
            if (targetId) {
                this.globalNcService.findNCById(targetId).subscribe({
                    next: (reponse: any) => {
                        const parentNC = reponse?.data ?? reponse;
                        if (parentNC) {
                            // On injecte les données d'origine de la demande pour s'assurer qu'il a le bon circuit, etc.
                            parentNC.btnActions = this.btnActions;
                            parentNC.workflowState = parentNC.workflowState || rowData.workflowState;
                            this.openDetailsWithNC(parentNC);
                        } else {
                            this.openDetailsWithNC(rowData);
                        }
                    },
                    error: () => {
                        this.openDetailsWithNC(rowData);
                    }
                });
            } else {
                this.openDetailsWithNC(rowData);
            }
        }
    }

    private openDetailsWithNC(ncData: any) {
        this.selectedDemande = ncData;
        this.selectedDemande.btnActions = this.btnActions;
        if (this.selectedDemande) {
            this.selectedDemande.planActions = this.selectedDemande.planActions || [];
        }
        this.totalActions = this.selectedDemande.planActions.length;
        this.hasNonTraiter = this.selectedDemande.planActions.some((action: { status: string }) => action.status === 'NON_TRAITER');
        this.hasInactive = this.selectedDemande.planActions.some((action: { status: string }) => action.status === 'INACTIF');

        this.nombreTraites = this.selectedDemande.planActions.filter((action: { status: string }) => action.status === 'TRAITER').length;
        this.nombreNonTraites = this.selectedDemande.planActions.filter((action: { status: string }) => action.status === 'NON_TRAITER').length;
        this.nbreInactive = this.selectedDemande.planActions.filter((action: { status: string }) => action.status === 'INACTIF').length;

        this.displayDetail = true;
        this.detailContainer?.clear();
        let componentRef: any;
        if (this.btnActions !== EtapeTraitement.CLOTURE && this.btnActions !== EtapeTraitement.IMPUTATION && this.btnActions !== EtapeTraitement.SUIVI_RQ) {
            componentRef = this.detailContainer?.createComponent(this.featureService.getDynamicFormTraitementComponent(this.selectedDemande.typeDemande));
        } else {
            componentRef = this.detailContainer?.createComponent(this.featureService.getDynamicDetailsDialogComponent(this.selectedDemande.typeDemande));
        }

        componentRef!.instance.demande = this.selectedDemande;
        this.componentRef = componentRef;
    }

    onPageChange(event: any) {
        // PrimeNG renvoie : 
        // event.page : l'index de la page (0, 1, 2...)
        // event.rows : le nombre de lignes par page
        this.pageChangeEvent.emit({ 
            page: event.page, 
            size: event.rows 
        });
    }

    getSeverity(gravity: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
        if (!gravity) return 'secondary';
        
        const val = gravity.toLowerCase().trim();
        if (val.includes('critique') || val.includes('danger')) {
            return 'danger';  // 🔴 Rouge
        }
        if (val.includes('majeur')) { // <-- Sans le 'e'
            return 'warn'; // 🟡 Orange
        }
        if (val.includes('mineur')) { // <-- Sans le 'e'
            return 'info';    // 🔵 Bleu
        }
        
        return 'secondary';
    }

    getGravityStyle(gravity: string): { [key: string]: string } {
        const severity = this.getSeverity(gravity);
        switch (severity) {
            case 'danger':
                return { 'color': '#ef4444' };
            case 'warn':
                return { 'color': '#f97316' };
            case 'info':
                return { 'color': '#0084ca' };
            default:
                return { 'color': '#64748b' };
        }
    }

    isRejet(rowData: any): boolean {
        if (!rowData || rowData.status === 'DRAFT' || rowData.status === 'Brouillon') return false;

        const STEP_ORDER: Record<string, number> = {
            'SOUMISSION': 1,
            'RECEPTION': 2,
            'VALIDATION_RQ': 3,
            'IMPUTATION': 4,
            'TRAITEMENT': 5,
            'VALIDATION': 6,
            'VALIDATION_RS': 7,
            'SUIVI_RQ': 8,
            'CLOTURE': 9,

            // Support des codes numériques du moteur de workflow
            '1': 1, // SOUMISSION
            '2': 2, // RECEPTION
            '3': 3, // VALIDATION_RQ
            '4': 4, // IMPUTATION
            '5': 5, // TRAITEMENT
            '6': 6, // VALIDATION
            '7': 7, // VALIDATION_RS
            '8': 8, // SUIVI_RQ
            '9': 9  // CLOTURE
        };

        const currentOrder = STEP_ORDER[rowData.etatDeTraitement || ''] || 0;

        // Rechercher dans l'historique à quelle étape le document de rejet a été attaché
        const saisies = rowData.workflowState?.saisies || [];
        const docRejetId = rowData.docRejet?.id?.toLowerCase();
        const docRejetNom = (rowData.docRejet?.nom || rowData.docRejet?.nomFichier || '').toLowerCase();

        const rejectionSaisie = saisies.find((s: any) => {
            const val = (s.value || '').toLowerCase();
            const fieldName = (s.fieldName || '').toLowerCase();
            const fieldLabel = (s.fieldLabel || '').toLowerCase();

            return fieldName.includes('rejet') || 
                   fieldLabel.includes('rejet') ||
                   fieldName === 'docrejet' ||
                   (docRejetId && val.includes(docRejetId)) ||
                   (docRejetNom && val.includes(docRejetNom));
        });

        if (rejectionSaisie) {
            const rejectOrder = STEP_ORDER[rejectionSaisie.stepCode || ''] || 0;
            if (rejectOrder > currentOrder) {
                return true; // Rejet actif
            }
        }

        // Cas de repli : retour à l'étape initiale SOUMISSION
        if (rowData.etatDeTraitement === 'SOUMISSION' && rowData.status !== 'DRAFT') {
            return true;
        }

        return false;
    }

    getWorkflowStatusSeverity(statusName: string, rowData?: any): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
        if (!statusName) return 'info';
        const val = statusName.toLowerCase().trim();
        if (this.isRejet(rowData)) {
            return 'danger'; // 🔴 Rouge pour indiquer un rejet
        }
        if (val.includes('clôture') || val.includes('cloture')) {
            return 'success'; // 🟢 Vert
        }
        return 'info'; // 🔵 Bleu par défaut
    }

    formatWorkflowStatusName(statusName: string, rowData?: any): string {
        if (!statusName) return '';
        const val = statusName.trim();
        if (this.isRejet(rowData)) {
            return 'Rejetée (À corriger)';
        }
        if (val.toLowerCase() === 'clôture' || val.toLowerCase() === 'cloture') {
            return 'Clôturé';
        }
        return val;
    }

    getInitials(name: any): string {
        if (!name || typeof name !== 'string') return 'U';
        return name.trim().charAt(0).toUpperCase();
    }

    buildRowMenu(rowData: any) {
        this.activeRow = rowData;
        this.rowMenuItems = [];

        // 1. Action commune : Détails
        this.rowMenuItems.push({
            label: 'Détails',
            icon: 'pi pi-search',
            command: () => this.displayDetails(rowData)
        });

        // 2. Si c'est un brouillon (DRAFT)
        if (rowData.status === 'DRAFT' || rowData.status === 'Brouillon') {
            this.rowMenuItems.push({
                label: 'Modifier',
                icon: 'pi pi-pencil',
                command: () => this.modifierBrouillon(rowData)
            });
            this.rowMenuItems.push({
                label: 'Soumettre',
                icon: 'pi pi-send',
                command: () => this.soumettreBrouillon(rowData)
            });
            this.rowMenuItems.push({
                label: 'Supprimer',
                icon: 'pi pi-trash',
                styleClass: 'delete-menu-item',
                command: () => this.supprimerBrouillon(rowData)
            });
        } else if (rowData.status === 'PUBLISHED' || rowData.status === 'Publié') {
            this.rowMenuItems.push({
                label: 'Archiver',
                icon: 'pi pi-file',
                command: () => this.archiverDossier(rowData)
            });
            this.rowMenuItems.push({
                label: 'Supprimer',
                icon: 'pi pi-trash',
                styleClass: 'delete-menu-item',
                command: () => this.supprimerDossier(rowData)
            });
        } else {
            // Si c'est rejeté à l'étape SOUMISSION, on permet la modification et la suppression
            if (this.isRejet(rowData) && rowData.etatDeTraitement === 'SOUMISSION') {
                this.rowMenuItems.push({
                    label: 'Modifier',
                    icon: 'pi pi-pencil',
                    command: () => this.modifierBrouillon(rowData)
                });
                this.rowMenuItems.push({
                    label: 'Supprimer',
                    icon: 'pi pi-trash text-red-500',
                    command: () => this.supprimerBrouillon(rowData)
                });
            }
            if (this.allowDeleteUnconditionally && !this.rowMenuItems.find(i => i.label === 'Supprimer')) {
                this.rowMenuItems.push({
                    label: 'Supprimer',
                    icon: 'pi pi-trash',
                    styleClass: 'delete-menu-item',
                    command: () => this.supprimerDossier(rowData)
                });
            }


            // 3. Actions de workflow dynamiques issues du moteur
            const actions = rowData.workflowState?.allowedActions || [];
            actions.forEach((action: any) => {
                this.rowMenuItems.push({
                    label: action.libelle,
                    icon: action.icon || 'pi pi-cog',
                    command: () => {
                        this.displayDetails(rowData);
                    }
                });
            });
        }
    }

    modifierBrouillon(rowData: any) {
        this.router.navigate(['/non-conformite/declaration', rowData.id]);
    }

    soumettreBrouillon(rowData: any) {
        this.confirmationService.confirm({
            message: 'Voulez-vous vraiment soumettre cette non-conformité ?',
            header: 'Confirmation',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Oui',
            rejectLabel: 'Non',
            accept: () => {
                this.loading = true;
                this.globalNcService.updateStatus(rowData.id, 'PUBLISHED').subscribe({
                    next: () => {
                        this.messageService.add({ severity: 'success', summary: 'Succès', detail: 'La non-conformité a été soumise avec succès.' });
                        this.featureService.onReloadRequested(true);
                        this.loading = false;
                    },
                    error: () => {
                        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Une erreur est survenue lors de la soumission.' });
                        this.loading = false;
                    }
                });
            }
        });
    }

    supprimerBrouillon(rowData: any) {
        this.confirmationService.confirm({
            message: 'Voulez-vous vraiment supprimer définitivement ce brouillon ?',
            header: 'Confirmation de suppression',
            icon: 'pi pi-trash',
            acceptLabel: 'Supprimer',
            rejectLabel: 'Annuler',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => {
                this.loading = true;
                this.globalNcService.delete(rowData.id).subscribe({
                    next: () => {
                        this.messageService.add({ severity: 'success', summary: 'Succès', detail: 'Le brouillon a été supprimé avec succès.' });
                        this.featureService.onReloadRequested(true);
                        this.loading = false;
                    },
                    error: () => {
                        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Une erreur est survenue lors de la suppression.' });
                        this.loading = false;
                    }
                });
            }
        });
    }

    archiverDossier(rowData: any) {
        this.confirmationService.confirm({
            message: 'Voulez-vous vraiment archiver cette non-conformité ?',
            header: 'Confirmation d\'archivage',
            icon: 'pi pi-file',
            acceptLabel: 'Archiver',
            rejectLabel: 'Annuler',
            accept: () => {
                this.onArchive.emit(rowData);
            }
        });
    }

    supprimerDossier(rowData: any) {
        this.confirmationService.confirm({
            message: 'Voulez-vous vraiment supprimer cette non-conformité ?',
            header: 'Confirmation de suppression',
            icon: 'pi pi-trash',
            acceptLabel: 'Supprimer',
            rejectLabel: 'Annuler',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => {
                this.onDelete.emit(rowData);
            }
        });
    }

        getCellValue(rowData: any, col: any): string {
        if (!rowData || !col) return "";
        const val = rowData[col.field];
        if (val !== undefined && val !== null && val !== "") {
            return val;
        }
        
        // Fallbacks automatiques entre anciennes et nouvelles nomenclatures
        if (col.field === "numeroReference" && rowData.numeroDeReference) return rowData.numeroDeReference;
        if (col.field === "numeroDeReference" && rowData.numeroDeReference) return rowData.numeroDeReference;
        if (col.field === "justification" && rowData.description) return rowData.description;
        if (col.field === "description" && rowData.justification) return rowData.justification;
        if (col.field === "typeNonConformiteLibelle" && rowData.sourceDeNonConformiteLibelle) return rowData.sourceDeNonConformiteLibelle;
        if (col.field === "sourceDeNonConformiteLibelle" && rowData.sourceDeNonConformiteLibelle) return rowData.sourceDeNonConformiteLibelle;
        if (col.field === "typeProcessusLibelle" && rowData.categorieProcessusLibelle) return rowData.categorieProcessusLibelle;
        if (col.field === "categorieProcessusLibelle" && rowData.categorieProcessusLibelle) return rowData.categorieProcessusLibelle;
        if (col.field === "structureSoumissionLibelle" && rowData.structureDeSoumissionLibelle) return rowData.structureDeSoumissionLibelle;
        if (col.field === "structureDeSoumissionLibelle" && rowData.structureDeSoumissionLibelle) return rowData.structureDeSoumissionLibelle;

        // Si c'est un PlanAction (il a nonConformeId ou nonConformiteId)
        if (rowData.nonConformeId || rowData.nonConformiteId) {
            if (col.field === "numeroReference" || col.field === "numeroDeReference") {
                return rowData.numeroNc || rowData.nonConformite?.numeroDeReference || rowData.nonConformite?.numeroDeReference || "";
            }
            if (col.field === "structureSoumissionLibelle" || col.field === "structureDeSoumissionLibelle") {
                return rowData.procEmetteur || rowData.nonConformite?.structureDeSoumissionLibelle || rowData.nonConformite?.structureDeSoumissionLibelle || "";
            }
            if (col.field === "typeNonConformiteLibelle" || col.field === "sourceDeNonConformiteLibelle") {
                return rowData.nonConformite?.sourceDeNonConformiteLibelle || rowData.nonConformite?.sourceDeNonConformiteLibelle || "";
            }
            if (col.field === "niveauNonConformiteLibelle") {
                return rowData.nonConformite?.niveauNonConformiteLibelle || "";
            }
        }
        
        return "";
    }

    rechercher() {
        this.isAgentSeach = true;
        this.agentSeachError = false;
        if (this.numerMatricule) {
        }
    }

    /** Édition de la fiche de clôture en cours : le bouton l'affiche, le loader global ignore les GET. */
    ficheEnCours = false;

    /**
     * Télécharge la fiche de clôture du dossier ouvert, composée par le serveur.
     *
     * <p>Remplace l'ancien rapport Jasper, qui partait d'ici vers l'écran parent par un
     * {@code @Output} — seul l'écran Suivi le branchait, si bien que le même dossier clôturé
     * s'éditait ou non selon la liste d'où on l'ouvrait. Le téléchargement est désormais le fait
     * de la fiche elle-même, partout où elle s'affiche.</p>
     */
    editerFicheCloture() {
        const dossier = this.selectedDemande;
        if (!dossier?.id || this.ficheEnCours) {
            return;
        }
        this.ficheEnCours = true;
        this.nonConformiteService.ficheCloture(dossier.id).subscribe({
            next: (fiche) => {
                this.ficheEnCours = false;
                const url = window.URL.createObjectURL(fiche);
                const lien = document.createElement('a');
                lien.href = url;
                lien.download = `Fiche_NC_${dossier.numeroDeReference || dossier.id}.pdf`;
                lien.click();
                setTimeout(() => window.URL.revokeObjectURL(url), 100);
            },
            error: async (erreur) => {
                this.ficheEnCours = false;
                this.messageService.add({
                    severity: 'error', summary: 'Fiche de clôture',
                    detail: await this.messageDuRefus(erreur), life: 5000
                });
            }
        });
    }

    /**
     * Le message que le serveur a réellement rendu : demandé en {@code blob}, un refus arrive lui
     * aussi en {@code Blob}, et le lire comme un objet donnait un toast muet.
     */
    private async messageDuRefus(erreur: any): Promise<string> {
        try {
            if (erreur?.error instanceof Blob) {
                const corps = JSON.parse(await erreur.error.text());
                if (corps?.message) {
                    return corps.message;
                }
            }
        } catch {
            // Corps illisible : le message générique suffit.
        }
        return erreur?.error?.message || "La fiche n'a pas pu être éditée. Veuillez réessayer.";
    }

    protected readonly TypeDemande = TypeDemande;

}
