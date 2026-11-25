import { CommonModule } from '@angular/common';
import { Component, EventEmitter, OnDestroy, OnInit, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { Observable, Subject, catchError, map, of, takeUntil } from 'rxjs';
import { accesAutorise } from '@core/auth/auth-utils';
import { ModuleAbonnement } from '@core/enums/module-abonnement.enum';
import { WorkflowStateDto } from 'src/app/models/workflow.model';
import { WorkflowActionsComponent } from '@features/workflow/execution/workflow-actions.component';
import { DocumentaireATraiterService } from '@features/gestion-documentaire/services/documentaire-a-traiter.service';
import { QmsDocumentService } from '@features/gestion-documentaire/services/document.service';
import { DemandeDocumentService } from '@features/gestion-documentaire/services/demande.service';
import { NonConformiteService } from '@features/non-conformite/services/non-conformite.service';
import { PlanActionService } from '@features/non-conformite/services/plan-action.service';

/** Un dossier qui attend une décision de l'utilisateur, quelle que soit sa famille. */
export interface DecisionAttendue {
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
    /** Dépôt d'une pièce jointe exigée par l'étape, rendant la référence qui la désigne. */
    deposerFichier?: (fichier: File) => Observable<string>;
}

/** Ligne enrichie pour l'affichage dans la bannette unifiée. */
export interface LigneBannette extends DecisionAttendue {
    familleCle: Famille['cle'];
    familleCourt: string;
    familleIcone: string;
}

/** Un élément de ventilation modulaire pour les popovers d'indicateurs. */
export interface ElementVentilation {
    cle: string;
    titre: string;
    libelleCourt: string;
    icone: string;
    route: string;
    count: number;
}

/** Une famille de dossiers, avec ce qu'il faut pour décider d'en parler ou non. */
export interface Famille {
    cle: 'documents' | 'demandes' | 'nonConformites' | 'plansAction';
    titre: string;
    libelleCourt: string;
    badgeCourt: string;
    icone: string;
    /** Écran complet de la famille, quand il y a plus de lignes que la place n'en montre. */
    route: string;
    lignes: DecisionAttendue[];
    /** Un chargement est en cours : distinguer « rien à faire » de « pas encore su ». */
    chargement: boolean;
}

/**
 * Ce que la liste de travail sait de la journée, à l'usage du reste de l'accueil.
 */
export interface EtatDeLaListe {
    chargement: boolean;
    total: number;
    suitDesActions: boolean;
    plansEnRetard: number;
    plansEcheanceProche: number;
    repartition: ElementVentilation[];
}

/** Nombre de lignes montrées dans un onglet filtré par famille. */
const LIGNES_MONTREES = 7;

/** Nombre maximum de lignes par famille lorsqu'on affiche l'onglet « Tout ». */
const LIGNES_PAR_FAMILLE_TOUT = 3;

/** Fenêtre au-delà de laquelle une échéance n'est plus « proche ». */
const JOURS_ECHEANCE_PROCHE = 7;

/**
 * Jours restants avant une échéance, ou null si la date n'est pas lisible.
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
 */
@Component({
    selector: 'app-mes-decisions',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ButtonModule,
        InputTextModule,
        TagModule,
        TooltipModule,
        SkeletonModule,
        WorkflowActionsComponent
    ],
    templateUrl: 'mes-decisions.component.html',
})
export class MesDecisionsComponent implements OnInit, OnDestroy {

    readonly lignesMontrees = LIGNES_MONTREES;

    /** État courant, publié à chaque fois qu'une famille répond. */
    @Output() etat = new EventEmitter<EtatDeLaListe>();

    /** Notifie le parent lorsqu'on change l'onglet actif de la bannette. */
    @Output() ongletChange = new EventEmitter<'all' | Famille['cle']>();

    private readonly documentaire = inject(DocumentaireATraiterService);
    private readonly documentService = inject(QmsDocumentService);
    private readonly demandeService = inject(DemandeDocumentService);
    private readonly ncService = inject(NonConformiteService);
    private readonly ncFichiers = inject(NonConformiteService);
    private readonly planService = inject(PlanActionService);
    private readonly router = inject(Router);
    private readonly destroy$ = new Subject<void>();

    /** Familles auxquelles l'utilisateur a accès, dans l'ordre où elles s'affichent. */
    famillesVisibles: Famille[] = [];

    /** Onglet sélectionné dans la bannette unifiée. */
    ongletActif: 'all' | Famille['cle'] = 'all';

    /** Filtre texte sur référence, titre, détail ou étape. */
    termeRecherche = '';

    get famillesAAfficher(): Famille[] {
        return this.famillesVisibles.filter((famille) => famille.chargement || famille.lignes.length);
    }

    /** Famille actuellement ciblée si un onglet dédié est actif. */
    get familleActive(): Famille | undefined {
        if (this.ongletActif === 'all') {
            return undefined;
        }
        return this.famillesVisibles.find((f) => f.cle === this.ongletActif);
    }

    /** Dossiers correspondant à l'onglet et au filtre texte (avant troncature). */
    get lignesCorrespondantes(): LigneBannette[] {
        const q = this.termeRecherche.trim().toLowerCase();
        const sources = this.ongletActif === 'all'
            ? this.famillesVisibles
            : this.famillesVisibles.filter((f) => f.cle === this.ongletActif);

        const resultat: LigneBannette[] = [];
        for (const famille of sources) {
            const lignesFamille = famille.lignes.filter((ligne) => {
                if (!q) return true;
                return (ligne.reference || '').toLowerCase().includes(q)
                    || (ligne.titre || '').toLowerCase().includes(q)
                    || (ligne.detail || '').toLowerCase().includes(q)
                    || (ligne.state?.currentStateName || '').toLowerCase().includes(q)
                    || famille.badgeCourt.toLowerCase().includes(q);
            });

            const tranche = (this.ongletActif === 'all' && !q)
                ? lignesFamille.slice(0, LIGNES_PAR_FAMILLE_TOUT)
                : lignesFamille;

            for (const ligne of tranche) {
                resultat.push({
                    ...ligne,
                    familleCle: famille.cle,
                    familleCourt: famille.badgeCourt,
                    familleIcone: famille.icone
                });
            }
        }
        return resultat;
    }

    /** Lignes visibles dans la bannette. */
    get lignesAffichees(): LigneBannette[] {
        if (this.ongletActif === 'all' && !this.termeRecherche.trim()) {
            return this.lignesCorrespondantes;
        }
        return this.lignesCorrespondantes.slice(0, LIGNES_MONTREES);
    }

    /** Nombre total réel de dossiers pour l'onglet actif. */
    get totalPourOngletActif(): number {
        if (this.ongletActif === 'all') {
            return this.total;
        }
        return this.familleActive?.lignes.length ?? 0;
    }

    /** Lien "Tout voir" contextuel dans l'en-tête et le pied de la bannette. */
    get cibleVoirTout(): { route: string; libelle: string } | null {
        if (this.familleActive) {
            return {
                route: this.familleActive.route,
                libelle: this.familleActive.lignes.length
                    ? `Voir les ${this.familleActive.lignes.length}`
                    : 'Ouvrir le module'
            };
        }
        const principale = this.famillesVisibles.find((f) => f.lignes.length > 0) || this.famillesVisibles[0];
        if (!principale) {
            return null;
        }
        return {
            route: principale.route,
            libelle: `Voir ${principale.badgeCourt.toLowerCase()}`
        };
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

    selectionnerOnglet(cle: 'all' | Famille['cle']): void {
        if (cle !== 'all' && !this.famillesVisibles.some((f) => f.cle === cle)) {
            return;
        }
        this.ongletActif = cle;
        this.ongletChange.emit(cle);
    }

    reinitialiserFiltres(): void {
        this.ongletActif = 'all';
        this.termeRecherche = '';
        this.ongletChange.emit('all');
    }

    iconeBoiteClasse(cle: Famille['cle']): string {
        switch (cle) {
            case 'documents':
                return 'bg-[#0ea5e9]/10 text-[#0084ca] dark:text-sky-400 border-[#0ea5e9]/30';
            case 'demandes':
                return 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/30';
            case 'nonConformites':
                return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
            case 'plansAction':
                return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
        }
    }

    badgeOngletClasse(famille: Famille): string {
        if (famille.lignes.length === 0) {
            return 'bg-surface-100 dark:bg-surface-800 text-[var(--text-color-secondary)]';
        }
        switch (famille.cle) {
            case 'documents':
                return 'bg-[#0ea5e9]/15 text-[#0084ca] dark:text-sky-300';
            case 'demandes':
                return 'bg-violet-500/15 text-violet-700 dark:text-violet-300';
            case 'nonConformites':
                return 'bg-amber-500/15 text-amber-700 dark:text-amber-300';
            case 'plansAction':
                return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300';
        }
    }

    private famillesAccessibles(): Famille[] {
        const familles: Famille[] = [];
        if (this.accesDocumentaire) {
            familles.push({
                cle: 'documents', titre: 'Documents attendant votre décision',
                libelleCourt: 'Documents qualité', badgeCourt: 'Documents',
                icone: 'pi pi-file', route: '/gestion-documentaire/documents',
                lignes: [], chargement: true
            });
            familles.push({
                cle: 'demandes', titre: 'Demandes à instruire',
                libelleCourt: 'Demandes de documents', badgeCourt: 'Demandes',
                icone: 'pi pi-inbox', route: '/gestion-documentaire/demandes',
                lignes: [], chargement: true
            });
        }
        if (this.accesNonConformites) {
            familles.push({
                cle: 'nonConformites', titre: 'Non-conformités attendant votre décision',
                libelleCourt: 'Non-conformités', badgeCourt: 'Non-conformités',
                icone: 'pi pi-exclamation-triangle', route: '/non-conformite/vue-ensemble',
                lignes: [], chargement: true
            });
        }
        if (this.accesPlansAction) {
            familles.push({
                cle: 'plansAction', titre: 'Actions correctives à mener',
                libelleCourt: 'Plans d\'actions', badgeCourt: 'Actions',
                icone: 'pi pi-check-square', route: '/non-conformite/actions',
                lignes: [], chargement: true
            });
        }
        return familles;
    }

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
                error: () => { this.poser('documents', []); this.poser('demandes', []); }
            });
        }

        if (this.accesNonConformites) {
            this.ncService.nonConformiteATraiter()
                .pipe(catchError(() => of([])), takeUntil(this.destroy$))
                .subscribe((nonConformites: any[]) => this.poser('nonConformites',
                    (nonConformites ?? []).map((nc) => ({
                        id: nc.id,
                        reference: nc.numeroReference,
                        titre: nc.typeNonConformiteLibelle || nc.originNonConformiteLibelle
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

    private publier(): void {
        const repartition: ElementVentilation[] = this.famillesVisibles.map((f) => ({
            cle: f.cle,
            titre: f.titre,
            libelleCourt: f.libelleCourt || f.titre,
            icone: f.icone,
            route: f.route,
            count: f.lignes.length
        }));

        const etat: EtatDeLaListe = {
            chargement: this.chargement,
            total: this.total,
            suitDesActions: this.suitDesActions,
            plansEnRetard: this.plansEnRetard,
            plansEcheanceProche: this.plansEcheanceProche,
            repartition
        };
        void Promise.resolve().then(() => this.etat.emit(etat));
    }

    ouvrir(route: string, parametres?: Record<string, string>): void {
        this.router.navigate([route], parametres ? { queryParams: parametres } : {});
    }
}
