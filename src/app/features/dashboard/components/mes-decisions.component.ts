import { CommonModule } from '@angular/common';
import { Component, EventEmitter, OnDestroy, OnInit, Output, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { Observable, Subject, catchError, map, of, takeUntil } from 'rxjs';

import { ModuleAbonnement } from '@core/enums';
import { accesAutorise } from '@core/auth';
import { WorkflowStateDto } from '@features/workflow/models';
import { 
    DemandeDocumentService, 
    DocumentaireATraiterService, 
    QmsDocumentService 
} from '@features/gestion-documentaire/services';
import { 
    NonConformiteService, 
    PlanActionService, 
    ProcNonConformiteService 
} from '@features/non-conformite/services';
import { WorkflowActionsComponent } from '@features/workflow';

/** Un dossier qui attend une décision de l'utilisateur, quelle que soit sa famille. */
interface DecisionAttendue {
    id: string;
    /** Référence courte et stable : numéro de document, de non-conformité, d'action. */
    reference?: string;
    /** Ce dont il s'agit, en clair. */
    titre: string;
    /** Précision de second rang : nature de la demande, processus concerné… */
    detail?: string;
    /** État du circuit : ce sont ses actions ouvertes qui deviennent les boutons de la ligne. */
    state?: WorkflowStateDto;
    /** Écran du module qui porte le dossier, pour l'ouvrir en entier. */
    route: string;
    parametres?: Record<string, string>;
    /** Échéance du dossier, telle que le serveur l'écrit. Portée par les actions correctives. */
    echeance?: string;
    /**
     * Dépôt d'une pièce jointe exigée par l'étape, rendant la référence qui la désigne.
     *
     * <p>Propre au dossier : la pièce se range dans le module qui le porte. Absent, le champ n'est
     * pas présenté — c'est alors l'écran du module qui permettra de joindre la pièce.</p>
     */
    deposerFichier?: (fichier: File) => Observable<string>;
}

/** Une famille de dossiers, avec ce qu'il faut pour décider d'en parler ou non. */
interface Famille {
    cle: 'documents' | 'demandes' | 'nonConformites' | 'plansAction';
    titre: string;
    icone: string;
    /** Écran complet de la famille, quand il y a plus de lignes que la place n'en montre. */
    route: string;
    lignes: DecisionAttendue[];
    /** Un chargement est en cours : distinguer « rien à faire » de « pas encore su ». */
    chargement: boolean;
}

/**
 * Ce que la liste de travail sait de la journée, à l'usage du reste de l'accueil.
 *
 * <p>Publié plutôt que lu à travers le composant : la synthèse et les indicateurs s'affichent
 * <b>avant</b> cette liste, et interroger un composant enfant qui n'existe pas encore au moment où
 * l'on dessine ce qui le précède donne un premier rendu faux, corrigé au cycle suivant.</p>
 */
export interface EtatDeLaListe {
    /** Un chargement est en cours : les nombres ne veulent encore rien dire. */
    chargement: boolean;
    /** Dossiers en attente d'une décision de l'utilisateur, toutes familles confondues. */
    total: number;
    /** L'utilisateur suit-il des actions correctives ? */
    suitDesActions: boolean;
    plansEnRetard: number;
    plansEcheanceProche: number;
}

/** Nombre de lignes montrées par famille : au-delà, l'écran du module est plus indiqué. */
const LIGNES_MONTREES = 5;

/** Fenêtre au-delà de laquelle une échéance n'est plus « proche ». */
const JOURS_ECHEANCE_PROCHE = 7;

/**
 * Jours restants avant une échéance, ou {@code null} si la date n'est pas lisible.
 *
 * <p>Les dates arrivent selon le module en `yyyy-MM-dd` ou en `dd-MM-yyyy`. Une date qu'on ne sait
 * pas lire n'est <b>pas</b> comptée : mieux vaut un indicateur qui sous-estime le retard qu'un
 * indicateur qui l'invente, et qu'on cesserait de croire.</p>
 */
function joursAvant(echeance?: string): number | null {
    if (!echeance) {
        return null;
    }
    const texte = echeance.trim().slice(0, 10);
    const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texte);
    const local = /^(\d{2})[-/](\d{2})[-/](\d{4})$/.exec(texte);
    let date: Date | null = null;
    if (iso) {
        date = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    } else if (local) {
        date = new Date(Number(local[3]), Number(local[2]) - 1, Number(local[1]));
    }
    if (!date || Number.isNaN(date.getTime())) {
        return null;
    }
    const aujourdhui = new Date();
    aujourdhui.setHours(0, 0, 0, 0);
    return Math.round((date.getTime() - aujourdhui.getTime()) / 86400000);
}

/**
 * Ce qui attend une décision de l'utilisateur, dès la page d'accueil.
 *
 * <p>Un système de management de la qualité ne se pilote pas depuis des courbes : il se pilote
 * depuis les dossiers arrêtés en attente de quelqu'un. La première question de qui se connecte est
 * « qu'attend-on de moi ? », et la réponse tenait jusqu'ici dans quatre écrans à ouvrir un par un.</p>
 *
 * <p>Chaque famille n'est interrogée que si l'organisation a souscrit son module <b>et</b> que
 * l'utilisateur détient la permission d'y lire : appeler sans cela n'aurait rendu qu'un refus, et
 * afficher une section vide laisserait croire qu'il n'y a rien à faire là où il n'y a simplement pas
 * accès.</p>
 *
 * <p>Les décisions sont prises <b>ici</b>, sans changer d'écran : {@code app-workflow-actions} rend
 * les actions que le serveur déclare ouvertes sur chaque dossier et recueille ce que l'étape exige.
 * Aucune règle n'est rejouée dans le tableau de bord — la liste elle-même vient du moteur, qui seul
 * sait qui peut agir sur quoi.</p>
 */
@Component({
    selector: 'app-mes-decisions',
    standalone: true,
    imports: [CommonModule, ButtonModule, TagModule, TooltipModule, SkeletonModule,
        WorkflowActionsComponent],
    providers: [MessageService],
    template: `
        @if (famillesAAfficher.length) {
            <div class="flex flex-col gap-4">
                @for (famille of famillesAAfficher; track famille.cle) {
                    <div class="rounded-xl border border-surface-200 bg-surface-0 overflow-hidden">
                        <div class="flex items-center gap-2 px-4 py-3 border-b border-surface-200">
                            <i [class]="famille.icone" class="text-primary"></i>
                            <span class="font-semibold">{{ famille.titre }}</span>
                            @if (!famille.chargement) {
                                <p-tag [value]="famille.lignes.length.toString()"
                                       [severity]="famille.lignes.length ? 'warn' : 'secondary'"
                                       [rounded]="true"></p-tag>
                            }
                            <p-button label="Tout voir" icon="pi pi-arrow-right" iconPos="right"
                                      severity="secondary" [text]="true" size="small"
                                      styleClass="ml-auto"
                                      (onClick)="ouvrir(famille.route)"></p-button>
                        </div>

                        @if (famille.chargement) {
                            <div class="p-4 flex flex-col gap-2">
                                <p-skeleton height="2rem"></p-skeleton>
                                <p-skeleton height="2rem" width="70%"></p-skeleton>
                            </div>
                        } @else {
                            <ul class="list-none m-0 p-0 divide-y divide-surface-200">
                                @for (ligne of famille.lignes.slice(0, lignesMontrees); track ligne.id) {
                                    <li class="px-4 py-3 flex flex-col gap-2 lg:flex-row lg:items-center
                                               lg:justify-between">
                                        <div class="min-w-0">
                                            <div class="flex items-center gap-2 flex-wrap">
                                                @if (ligne.reference) {
                                                    <span class="font-mono text-xs text-surface-500">
                                                        {{ ligne.reference }}
                                                    </span>
                                                }
                                                <span class="font-medium truncate">{{ ligne.titre }}</span>
                                            </div>
                                            @if (ligne.detail) {
                                                <div class="text-xs text-surface-500 mt-0.5">{{ ligne.detail }}</div>
                                            }
                                        </div>

                                        <div class="flex items-center gap-2 flex-wrap lg:justify-end">
                                            <!-- Décider sans quitter l'accueil : ce sont les actions
                                                 que le serveur déclare ouvertes sur ce dossier. -->
                                            <app-workflow-actions
                                                [resourceId]="ligne.id"
                                                [reference]="ligne.reference"
                                                [state]="ligne.state"
                                                [deposerFichier]="ligne.deposerFichier"
                                                (executed)="charger()"></app-workflow-actions>
                                            <p-button icon="pi pi-external-link" severity="secondary"
                                                      [text]="true" [rounded]="true" size="small"
                                                      pTooltip="Ouvrir le dossier"
                                                      (onClick)="ouvrir(ligne.route, ligne.parametres)"></p-button>
                                        </div>
                                    </li>
                                }
                            </ul>

                            @if (famille.lignes.length > lignesMontrees) {
                                <div class="px-4 py-2 border-t border-surface-200 text-xs text-surface-500">
                                    {{ famille.lignes.length - lignesMontrees }} autre(s) dossier(s)
                                    dans l'écran du module.
                                </div>
                            }
                        }
                    </div>
                }
            </div>
        }
    `
})
export class MesDecisionsComponent implements OnInit, OnDestroy {

    readonly lignesMontrees = LIGNES_MONTREES;

    /** État courant, publié à chaque fois qu'une famille répond. */
    @Output() etat = new EventEmitter<EtatDeLaListe>();

    private readonly documentaire = inject(DocumentaireATraiterService);
    private readonly documentService = inject(QmsDocumentService);
    private readonly demandeService = inject(DemandeDocumentService);
    private readonly ncService = inject(NonConformiteService);
    private readonly ncFichiers = inject(ProcNonConformiteService);
    private readonly planService = inject(PlanActionService);
    private readonly router = inject(Router);
    private readonly destroy$ = new Subject<void>();

    /** Familles auxquelles l'utilisateur a accès, dans l'ordre où elles s'affichent. */
    famillesVisibles: Famille[] = [];

    /**
     * Familles à montrer : celles qui portent quelque chose, et celles qu'on attend encore.
     *
     * <p>Une section vide n'apprend rien : elle occupe l'écran pour dire qu'il n'y a rien à y faire,
     * et fait descendre ce qui, justement, attend une décision. Quand tout est vide, c'est la phrase
     * de synthèse de l'accueil qui le dit, une fois pour toutes.</p>
     *
     * <p>Celles qui chargent restent affichées : leur faire apparaître puis disparaître la section au
     * fil des réponses du serveur donnerait un écran qui saute.</p>
     */
    get famillesAAfficher(): Famille[] {
        return this.famillesVisibles.filter((famille) => famille.chargement || famille.lignes.length);
    }

    /** Nombre total de dossiers en attente, pour la phrase de synthèse de l'accueil. */
    get total(): number {
        return this.famillesVisibles.reduce((somme, famille) => somme + famille.lignes.length, 0);
    }

    /** Vrai tant qu'une famille n'a pas répondu : le total ne veut encore rien dire. */
    get chargement(): boolean {
        return this.famillesVisibles.some((famille) => famille.chargement);
    }

    /** L'utilisateur suit-il des actions correctives ? Sinon leurs indicateurs n'ont pas lieu. */
    get suitDesActions(): boolean {
        return this.famillesVisibles.some((famille) => famille.cle === 'plansAction');
    }

    /** Actions correctives dont l'échéance est passée : c'est le retard qui se voit en audit. */
    get plansEnRetard(): number {
        return this.plans((jours) => jours < 0);
    }

    /** Actions correctives à échéance dans la semaine : celles qu'on peut encore tenir. */
    get plansEcheanceProche(): number {
        return this.plans((jours) => jours >= 0 && jours <= JOURS_ECHEANCE_PROCHE);
    }

    private plans(retenu: (jours: number) => boolean): number {
        const plans = this.famillesVisibles.find((famille) => famille.cle === 'plansAction');
        if (!plans) {
            return 0;
        }
        return plans.lignes.filter((ligne) => {
            const jours = joursAvant(ligne.echeance);
            return jours !== null && retenu(jours);
        }).length;
    }

    private get accesDocumentaire(): boolean {
        return accesAutorise(['document-read', 'document-write', 'DOC_READ'],
            ModuleAbonnement.DOCUMENTAIRE);
    }

    private get accesNonConformites(): boolean {
        return accesAutorise(['nc-read', 'NC_READ', 'CONSULTATION_NC'],
            ModuleAbonnement.NON_CONFORMITE);
    }

    private get accesPlansAction(): boolean {
        return accesAutorise(['plan-action-read', 'plan-action-write', 'TRAITEMENT_PLAN'],
            ModuleAbonnement.NON_CONFORMITE);
    }

    ngOnInit(): void {
        this.famillesVisibles = this.famillesAccessibles();
        this.publier();
        this.charger();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Les familles que cet utilisateur peut voir.
     *
     * <p>Documents et demandes forment deux sections distinctes : instruire une demande de
     * modification et valider un document ne sont pas le même geste, et les mélanger obligerait à
     * relire chaque ligne pour savoir de quoi il s'agit.</p>
     */
    private famillesAccessibles(): Famille[] {
        const familles: Famille[] = [];
        if (this.accesDocumentaire) {
            familles.push({
                cle: 'documents', titre: 'Documents attendant votre décision',
                icone: 'pi pi-file', route: '/gestion-documentaire/documents',
                lignes: [], chargement: true
            });
            familles.push({
                cle: 'demandes', titre: 'Demandes à instruire',
                icone: 'pi pi-inbox', route: '/gestion-documentaire/demandes',
                lignes: [], chargement: true
            });
        }
        if (this.accesNonConformites) {
            familles.push({
                cle: 'nonConformites', titre: 'Non-conformités attendant votre décision',
                icone: 'pi pi-exclamation-triangle', route: '/non-conformite/vue-ensemble',
                lignes: [], chargement: true
            });
        }
        if (this.accesPlansAction) {
            familles.push({
                cle: 'plansAction', titre: 'Actions correctives à mener',
                icone: 'pi pi-check-square', route: '/non-conformite/actions',
                lignes: [], chargement: true
            });
        }
        return familles;
    }

    /**
     * Relit les familles accessibles.
     *
     * <p>Rappelé après chaque décision : le dossier décidé quitte la liste, et la cloche de
     * notifications se corrige du même coup — elle lit le même état que le module documentaire.</p>
     */
    charger(): void {
        this.famillesVisibles.forEach((famille) => famille.chargement = true);
        this.publier();

        if (this.accesDocumentaire) {
            this.documentaire.rafraichir().pipe(takeUntil(this.destroy$)).subscribe({
                next: (etat) => {
                    this.poser('documents', (etat.documents ?? []).map((document: any) => ({
                        id: document.id,
                        reference: document.documentNumber,
                        titre: document.titre || document.objet || 'Document',
                        detail: document.typeDocumentLibelle || document.structureLibelle,
                        state: document.workflowState,
                        route: '/gestion-documentaire/documents',
                        parametres: { documentId: document.id },
                        deposerFichier: (fichier: File) =>
                            this.documentService.deposerFichierDEtape(document.id, fichier)
                    })));
                    this.poser('demandes', (etat.demandes ?? []).map((demande) => ({
                        id: demande.id,
                        reference: demande.documentNumber,
                        titre: demande.objectif || 'Demande',
                        detail: demande.type === 'SUPPRESSION'
                            ? 'Demande de suppression' : 'Demande de modification',
                        state: demande.workflowState,
                        route: '/gestion-documentaire/demandes',
                        parametres: { demandeId: demande.id },
                        deposerFichier: (fichier: File) =>
                            this.demandeService.deposerFichierDEtape(demande.id, fichier)
                    })));
                },
                // Un module indisponible ne doit pas vider l'accueil des autres : la section reste,
                // simplement vide, et les non-conformités s'affichent quand même.
                error: () => { this.poser('documents', []); this.poser('demandes', []); }
            });
        }

        if (this.accesNonConformites) {
            this.ncService.nonConformiteATraiter()
                .pipe(catchError(() => of([])), takeUntil(this.destroy$))
                .subscribe((nonConformites: any[]) => this.poser('nonConformites',
                    (nonConformites ?? []).map((nc) => ({
                        id: nc.id,
                        reference: nc.numeroDeReference,
                        titre: nc.sourceDeNonConformiteLibelle || nc.originNonConformiteLibelle
                            || 'Non-conformité',
                        detail: nc.nomProcessus || nc.structureDeSoumissionLibelle,
                        state: nc.workflowState,
                        route: '/non-conformite/vue-ensemble',
                        deposerFichier: (fichier: File) =>
                            this.ncFichiers.deposerFichier(nc.id, fichier)
                    }))));
        }

        if (this.accesPlansAction) {
            this.ncService.planActionsATraiter()
                .pipe(catchError(() => of([])), takeUntil(this.destroy$))
                .subscribe((plans: any[]) => this.poser('plansAction', (plans ?? []).map((plan) => ({
                    id: plan.id,
                    reference: plan.numeroOdre || plan.numeroNc,
                    titre: plan.solutionRetenues || plan.actionCorrective || 'Action corrective',
                    detail: plan.dateEcheance ? `Échéance : ${plan.dateEcheance}` : plan.responsable,
                    echeance: plan.dateEcheance,
                    state: plan.workflowState,
                    route: '/non-conformite/actions',
                    deposerFichier: (fichier: File) => this.planService
                        .deposerFichier(plan.id, fichier).pipe(map((reponse: any) => `${reponse}`))
                }))));
        }
    }

    private poser(cle: Famille['cle'], lignes: DecisionAttendue[]): void {
        const famille = this.famillesVisibles.find((candidate) => candidate.cle === cle);
        if (!famille) {
            return;
        }
        famille.lignes = lignes.filter((ligne) => !!ligne.id);
        famille.chargement = false;
        this.publier();
    }

    /**
     * Publie l'état, toujours après le cycle de détection en cours.
     *
     * <p>La première publication a lieu pendant que le parent se dessine — il crée cette liste au
     * milieu de son propre gabarit. Émettre alors change une valeur qu'il vient de vérifier, ce
     * qu'Angular signale en {@code NG0100} et qui, en production, aurait donné un affichage en retard
     * d'un cycle. Le report d'une micro-tâche suffit : l'état publié est celui du moment où il est
     * lu, et les publications suivantes viennent de réponses réseau, donc déjà hors du cycle.</p>
     */
    private publier(): void {
        // L'état est saisi maintenant et remis ensuite : le prendre dans la micro-tâche perdrait le
        // moment du chargement, et l'accueil passerait du silence au résultat sans jamais dire
        // qu'il cherche.
        const etat: EtatDeLaListe = {
            chargement: this.chargement,
            total: this.total,
            suitDesActions: this.suitDesActions,
            plansEnRetard: this.plansEnRetard,
            plansEcheanceProche: this.plansEcheanceProche
        };
        void Promise.resolve().then(() => this.etat.emit(etat));
    }

    ouvrir(route: string, parametres?: Record<string, string>): void {
        this.router.navigate([route], parametres ? { queryParams: parametres } : {});
    }
}
