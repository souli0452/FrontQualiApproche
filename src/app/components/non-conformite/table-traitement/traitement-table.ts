import { Component, ComponentRef, EventEmitter, Input, OnInit, Output, ViewChild, ViewContainerRef } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { CommonModule, DatePipe } from '@angular/common';
import { FeaturesService } from "../../../services/feature-service";
import { TypeDemande } from "../../../utils/global/global-utils";
import { EtapeTraitement, StatusEnum } from '../../../enums/enums';
import { NgPrimeModule } from '../../../../prime-ng.module';
import { WorkflowActionsComponent, WorkflowDecisionDialogComponent, DecisionConfirmee } from '../../../shared';
import { WorkflowService } from '../../../services/workflow.service';
import { ResultatDecisionDto, WorkflowActionDto } from '../../../models/workflow.model';
import { ProcNonConformiteService } from '../../../services/non-conformite/proc-non-conformite.service';


@Component({
    selector: 'app-traitement-table',
    templateUrl: './traitement-table.html',
    styleUrl: './traitement-table.scss',
    providers: [DatePipe],
    standalone: true,
    imports: [CommonModule, NgPrimeModule, WorkflowActionsComponent, WorkflowDecisionDialogComponent]
})
export class TraitementTableComponent implements OnInit {
    @Input() demandeList: Array<any> = [];
    @Input() loading: boolean = false;
    @Input() paginator: boolean = true;
    @Input() showGridlines: boolean = true;
    @Input() balanceFrozen: boolean = false;

    @Input() totalElements: number = 0;
    @Input() pageSize: number = 10;
    @Input() currentPage: number = 0;
    @Output() pageChangeEvent = new EventEmitter<{ page: number, size: number }>();


    @Input() btnActions?: EtapeTraitement = EtapeTraitement.RECEPTION;
    @Input() status?: String;
    @Input() title?: string;
    @Output() onImputation = new EventEmitter<any>();
    @Output() onValidation = new EventEmitter<any>();
    @Output() onStructureValidation = new EventEmitter<any>();
    @Output() onEdition = new EventEmitter<any>();
    @Output() onSaveEntity = new EventEmitter<any>();
    @Output() onReceptionner = new EventEmitter<any>();

    @ViewChild('detailContainer', { read: ViewContainerRef, static: true }) detailContainer?: ViewContainerRef;

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
    constructor(
        private messageService: MessageService,
        private confirmationService: ConfirmationService,
        private featureService: FeaturesService,
        private datePipe: DatePipe,
        private nonConformiteService: ProcNonConformiteService,
        private workflowService: WorkflowService
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
        return action.severity ?? (action.decision === 'REJETE' ? 'danger' : 'success');
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
        const sens = this.actionGroupee?.decision === 'REJETE' ? 'REJETE' : 'APPROUVE';
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
        this.colsFilter = this.cols.map((value) => value.field);
    }

    closeDetailsDialog() {
        this.displayDetail = false;
        this.detailContainer?.clear();

    }
    displayDetails(rowData?: any) {
        if (this.displayDetail) {
            this.closeDetailsDialog();
        } else {
            this.selectedDemande = rowData;
            this.selectedDemande.btnActions = this.btnActions;
            this.totalActions = this.selectedDemande.planActions.length;
            this.hasNonTraiter = this.selectedDemande.planActions.some((action: { status: string }) => action.status === 'NON_TRAITER');
            this.hasInactive = this.selectedDemande.planActions.some((action: { status: string }) => action.status === 'INACTIF');

            this.nombreTraites = this.selectedDemande.planActions.filter((action: { status: string }) => action.status === 'TRAITER').length;
            this.nombreNonTraites = this.selectedDemande.planActions.filter((action: { status: string }) => action.status === 'NON_TRAITER').length;
            this.nbreInactive = this.selectedDemande.planActions.filter((action: { status: string }) => action.status === 'INACTIF').length;

            this.displayDetail = true;
            let componentRef: any;
            if (this.btnActions !== EtapeTraitement.CLOTURE && this.btnActions !== EtapeTraitement.IMPUTATION && this.btnActions !== EtapeTraitement.SUIVI_RQ) {
                componentRef = this.detailContainer?.createComponent(this.featureService.getDynamicFormTraitementComponent(this.selectedDemande.typeDemande));
            } else {
                componentRef = this.detailContainer?.createComponent(this.featureService.getDynamicDetailsDialogComponent(this.selectedDemande.typeDemande));
            }

            componentRef!.instance.demande = this.selectedDemande;
            this.componentRef = componentRef;
        }
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


    rechercher() {
        this.isAgentSeach = true;
        this.agentSeachError = false;
        if (this.numerMatricule) {
        }
    }

    //     this.onEdition.emit(this.selectedDemandes);
    editionNew() {
        this.onEdition.emit([this.selectedDemande]);
    }

    protected readonly TypeDemande = TypeDemande;

    private isContentEmpty(content: any): boolean {
        if (!content) return true;
        if (typeof content !== 'string') return false;
        // Supprime les balises HTML et les espaces vides pour voir s'il reste du texte
        const stripped = content.replace(/<[^>]*>/g, '').trim();
        return stripped.length === 0;
    }

}
