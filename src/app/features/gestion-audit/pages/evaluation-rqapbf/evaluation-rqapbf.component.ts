import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { NgPrimeModule } from '@prime-ng';
import { Observable, Subject, forkJoin, takeUntil, tap } from 'rxjs';
import { ConfirmationService, MessageService } from 'primeng/api';
import { AuditGestionService, contenu, messageErreur } from '../../services/audit.service';
import { Audit, EvaluationRQAPBF, NoeudReferentiel, NotationCritere } from '../../models/audit.model';
import {
    NiveauNotationRQAPBF,
    NIVEAU_NOTATION_RQAPBF_LABELS,
    NIVEAU_NOTATION_RQAPBF_SEVERITY,
    libelleNiveauDeScore
} from '../../models/audit-enums';

/** Le barème officiel de la grille RQAP-BF : part du score de chaque niveau. */
const BAREME: Record<NiveauNotationRQAPBF, string> = {
    [NiveauNotationRQAPBF.NON_CONFORME]: '0 / 1',
    [NiveauNotationRQAPBF.A_AMELIORER]: '0,45 / 1',
    [NiveauNotationRQAPBF.ACCEPTABLE]: '0,75 / 1',
    [NiveauNotationRQAPBF.CONFORME]: '1 / 1',
    [NiveauNotationRQAPBF.NON_APPLICABLE]: 'hors calcul'
};

/** L'ordre de la grille, du plus faible au plus fort, puis « non applicable ». */
const ORDRE_NIVEAUX = [
    NiveauNotationRQAPBF.NON_CONFORME,
    NiveauNotationRQAPBF.A_AMELIORER,
    NiveauNotationRQAPBF.ACCEPTABLE,
    NiveauNotationRQAPBF.CONFORME,
    NiveauNotationRQAPBF.NON_APPLICABLE
];

type Vue = 'domaines' | 'sections' | 'criteres' | 'notation' | 'apercu';

interface Saisie {
    niveau?: NiveauNotationRQAPBF;
    preuve?: string;
    commentaire?: string;
}

/**
 * L'évaluation RQAP-BF d'un audit, sur le parcours de la maquette : domaine (C11), section (C11S),
 * exigences et critères (C11Q), notation critère par critère (C12), puis prévisualisation par
 * niveau avant publication (C13P).
 *
 * <p>Le niveau détaillé (barème 0 / 0,45 / 0,75 / 1) fait le score ; le constat retenu pour la
 * synthèse reste binaire : seul « Conforme » vaut conforme, « Non applicable » n'en donne pas.
 * Une note reste en brouillon, hors rapport officiel, jusqu'à sa publication — critère par
 * critère ou par groupe de niveau. Valider publie le reste et fige l'évaluation.</p>
 */
@Component({
    selector: 'app-evaluation-rqapbf',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule, NgPrimeModule],
    providers: [MessageService, ConfirmationService],
    templateUrl: './evaluation-rqapbf.component.html'
})
export class EvaluationRQAPBFComponent implements OnInit, OnDestroy {

    audit: Audit | null = null;
    evaluation: EvaluationRQAPBF | null = null;
    domaines: NoeudReferentiel[] = [];
    loading = true;
    actionEnCours = false;
    auditId: string | null = null;

    vue: Vue = 'domaines';
    domaine: NoeudReferentiel | null = null;
    section: NoeudReferentiel | null = null;
    /** Les nœuds intermédiaires dépliés en C11Q. */
    ouverts = new Set<string>();

    /** La notation en cours (C12) : les critères de la section, la position, la saisie. */
    criteresSection: NoeudReferentiel[] = [];
    position = 0;
    saisie: Saisie = {};
    modifiee = false;

    readonly niveauOptions = ORDRE_NIVEAUX.map(n => ({ value: n, label: NIVEAU_NOTATION_RQAPBF_LABELS[n] }));

    private notations = new Map<string, NotationCritere>();
    /** Tous les domaines du référentiel, retenus par l'audit ou non : pour reconnaître une section. */
    private domaineIds = new Set<string>();
    private destroy$ = new Subject<void>();

    constructor(
        private auditService: AuditGestionService,
        private route: ActivatedRoute,
        private router: Router,
        private messageService: MessageService,
        private confirmationService: ConfirmationService
    ) {}

    ngOnInit(): void {
        this.auditId = this.route.snapshot.paramMap.get('id');
        if (this.auditId) this.charger(this.auditId);
    }

    charger(auditId: string): void {
        this.loading = true;
        forkJoin({
            audit: this.auditService.findById(auditId),
            arbre: this.auditService.getReferentielRQAPBF(),
            evaluation: this.auditService.getEvaluationRQAPBF(auditId)
        })
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: ({ audit, arbre, evaluation }) => {
                    this.audit = (audit as any)?.data ?? null;
                    const racines = contenu<NoeudReferentiel>(arbre);
                    this.domaineIds = new Set(racines.map(r => r.id!));
                    // Les domaines retenus par l'audit, ou tous s'il n'en désigne aucun.
                    const retenus = this.audit?.domaineRqapbfIds?.length ? racines.filter(r => this.audit!.domaineRqapbfIds!.includes(r.id!)) : racines;
                    this.domaines = this.tries(retenus);
                    this.appliquer(evaluation?.data ?? null);
                    this.loading = false;
                },
                error: err => {
                    this.loading = false;
                    this.erreur(err, 'L\'évaluation n\'a pas pu être chargée.');
                }
            });
    }

    private appliquer(evaluation: EvaluationRQAPBF | null): void {
        this.evaluation = evaluation;
        this.notations = new Map((evaluation?.notations ?? []).map(n => [n.noeudId!, n]));
        if (this.vue === 'notation') this.chargerSaisie();
    }

    // ---- Lecture de l'arbre ----

    tries(noeuds?: NoeudReferentiel[]): NoeudReferentiel[] {
        return [...(noeuds ?? [])].sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));
    }

    /**
     * Les critères notables sous un nœud : ses feuilles, ou lui-même s'il en est une — sauf un
     * domaine ou une section, qui ne sont que des conteneurs en attente de leur contenu.
     */
    feuilles(n: NoeudReferentiel): NoeudReferentiel[] {
        if (n.enfants?.length) return this.tries(n.enfants).flatMap(e => this.feuilles(e));
        return this.conteneur(n) ? [] : [n];
    }

    /** Un domaine ou une section : les deux premiers niveaux de l'arbre ne se notent jamais. */
    conteneur(n: NoeudReferentiel): boolean {
        return !n.parentId || this.domaineIds.has(n.parentId);
    }

    /** Le niveau que désigne un score, aux seuils partagés avec l'écran des résultats. */
    niveauDe(score?: number | null): string {
        return libelleNiveauDeScore(score);
    }

    notation(noeudId?: string): NotationCritere | undefined {
        return noeudId ? this.notations.get(noeudId) : undefined;
    }

    /** Le score d'un nœud (0-100) : celui du serveur, ou la note du critère. */
    score(n: NoeudReferentiel): number | undefined {
        return this.evaluation?.scoresParNoeud?.[n.code!] ?? (n.enfants?.length ? undefined : this.notation(n.id)?.score);
    }

    nbNotes(n: NoeudReferentiel): number {
        return this.feuilles(n).filter(f => this.notations.has(f.id!)).length;
    }

    avancement(n: NoeudReferentiel): { libelle: string; severite: any } {
        const feuilles = this.feuilles(n);
        const notes = feuilles.filter(f => this.notations.has(f.id!));
        if (!notes.length) return { libelle: 'Non commencé', severite: 'secondary' };
        if (notes.length === feuilles.length && notes.every(f => this.notation(f.id)?.statut === 'PUBLIE')) return { libelle: 'Publié', severite: 'success' };
        if (notes.length === feuilles.length) return { libelle: 'Noté', severite: 'info' };
        return { libelle: 'En cours', severite: 'warn' };
    }

    get totalCriteres(): number {
        return this.domaines.reduce((t, d) => t + this.feuilles(d).length, 0);
    }

    // ---- Navigation ----

    allerDomaines(): void {
        this.quitterNotation(() => { this.vue = 'domaines'; this.domaine = this.section = null; });
    }

    choisirDomaine(d: NoeudReferentiel): void {
        this.quitterNotation(() => { this.domaine = d; this.section = null; this.vue = 'sections'; });
    }

    choisirSection(s: NoeudReferentiel): void {
        this.quitterNotation(() => {
            this.section = s;
            this.ouverts = new Set(this.tries(s.enfants).filter(e => e.enfants?.length).map(e => e.id!));
            this.vue = 'criteres';
        });
    }

    basculer(n: NoeudReferentiel): void {
        this.ouverts.has(n.id!) ? this.ouverts.delete(n.id!) : this.ouverts.add(n.id!);
    }

    allerApercu(): void {
        this.quitterNotation(() => (this.vue = 'apercu'));
    }

    /** Ouvre la notation sur un critère, ou sur le premier non noté de la section. */
    noter(critere?: NoeudReferentiel): void {
        if (!this.section) return;
        this.criteresSection = this.feuilles(this.section);
        if (!this.criteresSection.length) return;
        const cible = critere ?? this.criteresSection.find(c => !this.notations.has(c.id!)) ?? this.criteresSection[0];
        this.position = Math.max(0, this.criteresSection.findIndex(c => c.id === cible?.id));
        this.vue = 'notation';
        this.chargerSaisie();
    }

    get critere(): NoeudReferentiel | undefined {
        return this.criteresSection[this.position];
    }

    /** Le chemin du critère dans la section, pour situer l'auditeur. */
    get chemin(): string {
        const c = this.critere;
        if (!c || !this.domaine) return '';
        const trouver = (n: NoeudReferentiel, acc: NoeudReferentiel[]): NoeudReferentiel[] | null => {
            if (n.id === c.id) return acc;
            for (const e of n.enfants ?? []) { const r = trouver(e, [...acc, n]); if (r) return r; }
            return null;
        };
        return (trouver(this.domaine, []) ?? []).map(n => n.code).join(' › ');
    }

    private chargerSaisie(): void {
        const n = this.notation(this.critere?.id);
        this.saisie = { niveau: n?.niveau as NiveauNotationRQAPBF, preuve: n?.preuve, commentaire: n?.commentaire };
        this.modifiee = false;
    }

    precedent(): void {
        this.enregistrerPuis(() => { this.position = Math.max(0, this.position - 1); this.chargerSaisie(); });
    }

    suivant(): void {
        this.enregistrerPuis(() => {
            if (this.position >= this.criteresSection.length - 1) {
                this.vue = 'apercu';
            } else {
                this.position++;
                this.chargerSaisie();
            }
        });
    }

    /** Quitter la notation enregistre d'abord la saisie en cours, pour ne rien perdre. */
    private quitterNotation(ensuite: () => void): void {
        if (this.vue === 'notation') this.enregistrerPuis(ensuite);
        else ensuite();
    }

    /**
     * Enregistre la saisie puis poursuit — ou retient l'auditeur quand sa preuve ou son commentaire
     * n'ont pas encore de niveau : sans lui rien ne s'enregistre, et passer au critère suivant
     * effacerait ce qu'il vient d'écrire.
     */
    private enregistrerPuis(ensuite: () => void): void {
        if (!this.modifiee || !this.evaluation?.id || !this.critere) {
            ensuite();
            return;
        }
        if (!this.saisie.niveau) {
            this.messageService.add({ severity: 'warn', summary: 'Niveau manquant', detail: 'Choisissez un niveau pour enregistrer.' });
            return;
        }
        this.actionEnCours = true;
        this.auditService.sauvegarderNotations(this.evaluation.id, [{ noeudId: this.critere.id, ...this.saisie }])
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: res => {
                    this.actionEnCours = false;
                    this.modifiee = false;
                    this.evaluation = res?.data ?? this.evaluation;
                    this.notations = new Map((this.evaluation?.notations ?? []).map(n => [n.noeudId!, n]));
                    ensuite();
                },
                error: err => {
                    this.actionEnCours = false;
                    this.erreur(err, 'La note n\'a pas pu être enregistrée.');
                }
            });
    }

    // ---- Constat et barème ----

    /** Le constat retenu pour la synthèse : seul « Conforme » vaut conforme ; « N/A » n'en donne pas. */
    constat(niveau?: string): 'CONFORME' | 'NC' | null {
        if (!niveau || niveau === NiveauNotationRQAPBF.NON_APPLICABLE) return null;
        return niveau === NiveauNotationRQAPBF.CONFORME ? 'CONFORME' : 'NC';
    }

    bareme(niveau?: string): string {
        return BAREME[niveau as NiveauNotationRQAPBF] ?? '—';
    }

    libelleNiveau(niveau?: string): string {
        return NIVEAU_NOTATION_RQAPBF_LABELS[niveau as NiveauNotationRQAPBF] ?? 'Non noté';
    }

    severiteNiveau(niveau?: string): any {
        return NIVEAU_NOTATION_RQAPBF_SEVERITY[niveau as NiveauNotationRQAPBF] ?? 'secondary';
    }

    /** Le rang du niveau dans la grille (1 à 4), comme sur la grille officielle. */
    rang(niveau?: string): string {
        const i = ORDRE_NIVEAUX.indexOf(niveau as NiveauNotationRQAPBF);
        return i >= 0 && i < 4 ? `${i + 1} · ` : '';
    }

    // ---- Prévisualisation par niveau (C13P) ----

    get groupes(): { niveau: NiveauNotationRQAPBF; notations: NotationCritere[]; brouillons: number }[] {
        return ORDRE_NIVEAUX
            .map(niveau => {
                const notations = (this.evaluation?.notations ?? []).filter(n => n.niveau === niveau);
                return { niveau, notations, brouillons: notations.filter(n => n.statut !== 'PUBLIE').length };
            })
            .filter(g => g.notations.length);
    }

    get nonNotes(): number {
        return this.totalCriteres - (this.evaluation?.criteresNotes ?? 0);
    }

    // ---- Gestes ----

    get validee(): boolean {
        return this.evaluation?.statut === 'VALIDEE';
    }

    get auditTermine(): boolean {
        return this.audit?.statut === 'CLOTURE' || this.audit?.statut === 'ANNULE';
    }

    get critereModifiable(): boolean {
        return !!this.evaluation && !this.validee && this.notation(this.critere?.id)?.statut !== 'PUBLIE';
    }

    ouvrir(): void {
        if (!this.auditId) return;
        this.geste(this.auditService.creerEvaluationRQAPBF(this.auditId), 'Évaluation ouverte.');
    }

    publierCritere(): void {
        const id = this.critere?.id;
        if (!this.evaluation?.id || !id) return;
        this.enregistrerPuis(() => this.geste(this.auditService.publierCritereRQAPBF(this.evaluation!.id!, id), 'Critère publié au rapport.'));
    }

    publierGroupe(event: Event, niveau: NiveauNotationRQAPBF): void {
        if (!this.evaluation?.id) return;
        this.confirmationService.confirm({
            target: event.currentTarget as EventTarget,
            message: `Publier les critères notés « ${NIVEAU_NOTATION_RQAPBF_LABELS[niveau]} » ? Une note publiée entre au rapport officiel et ne se corrige plus.`
                + (this.constat(niveau) === 'NC' ? ' Leur constat « NC » sera transmis au module Non-conformités.' : ''),
            icon: 'pi pi-send',
            acceptLabel: 'Publier',
            rejectLabel: 'Retour',
            accept: () => this.geste(this.auditService.publierEvaluationRQAPBF(this.evaluation!.id!, niveau), 'Groupe publié.')
        });
    }

    publierToutEtVoir(event: Event): void {
        if (!this.evaluation?.id) return;
        this.confirmationService.confirm({
            target: event.currentTarget as EventTarget,
            message: 'Publier tous les critères notés ? Ils entrent au rapport officiel et ne se corrigent plus.',
            icon: 'pi pi-send',
            acceptLabel: 'Publier',
            rejectLabel: 'Retour',
            accept: () => this.geste(this.auditService.publierEvaluationRQAPBF(this.evaluation!.id!), 'Tous les critères notés sont publiés.',
                () => this.router.navigate(['/gestion-audit/programme', this.auditId, 'resultats-rqapbf']))
        });
    }

    valider(event: Event): void {
        if (!this.evaluation?.id) return;
        this.confirmationService.confirm({
            target: event.currentTarget as EventTarget,
            message: 'Tout ce qui est noté sera publié et l\'évaluation figée : ses résultats deviennent officiels. Les critères au constat « NC » ouvriront une non-conformité. Continuer ?',
            icon: 'pi pi-lock',
            acceptLabel: 'Valider',
            rejectLabel: 'Retour',
            accept: () => this.enregistrerPuis(() => this.geste(this.auditService.validerEvaluationRQAPBF(this.evaluation!.id!), 'Évaluation validée.'))
        });
    }

    private geste(appel$: Observable<any>, succes: string, ensuite?: () => void): void {
        // Les compteurs des onglets et du menu suivent le geste.
        appel$ = appel$.pipe(tap(() => this.auditService.rafraichirNotifications()));
        this.actionEnCours = true;
        appel$.pipe(takeUntil(this.destroy$)).subscribe({
            next: res => {
                this.actionEnCours = false;
                this.appliquer(res?.data ?? this.evaluation);
                this.messageService.add({ severity: 'success', summary: 'Succès', detail: succes });
                ensuite?.();
            },
            error: err => {
                this.actionEnCours = false;
                this.erreur(err, 'L\'opération a échoué.');
            }
        });
    }

    private erreur(err: unknown, defaut: string): void {
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: messageErreur(err, defaut), life: 8000 });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }
}
