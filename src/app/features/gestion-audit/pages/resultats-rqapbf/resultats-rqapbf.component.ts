import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { NgPrimeModule } from '@prime-ng';
import { Subject, forkJoin, takeUntil } from 'rxjs';
import { MessageService } from 'primeng/api';
import { AuditGestionService, contenu, messageErreur } from '../../services/audit.service';
import { Audit, EvaluationRQAPBF, NoeudReferentiel, NotationCritere } from '../../models/audit.model';
import { NiveauNotationRQAPBF, libelleNiveauDeScore, niveauDeScore } from '../../models/audit-enums';

interface LigneResultat {
    noeud: NoeudReferentiel;
    profondeur: number;
    score?: number;
}

/** La couleur d'un score, celle du niveau qu'il désigne. */
const COULEUR_NIVEAU: Record<NiveauNotationRQAPBF, string> = {
    [NiveauNotationRQAPBF.CONFORME]: 'text-emerald-600',
    [NiveauNotationRQAPBF.ACCEPTABLE]: 'text-sky-600',
    [NiveauNotationRQAPBF.A_AMELIORER]: 'text-amber-600',
    [NiveauNotationRQAPBF.NON_CONFORME]: 'text-red-600',
    [NiveauNotationRQAPBF.NON_APPLICABLE]: 'text-surface-400'
};

/**
 * Les résultats de l'évaluation RQAP-BF d'un audit (écran C13 de la maquette) : score global,
 * niveau et étoiles, radar des domaines, puis une ligne par domaine qui se déplie sur ses sections
 * et sous-sections. Officiels (critères publiés) une fois l'évaluation validée, provisoires avant
 * — et dits comme tels. Le détail critère par critère se relit dans la prévisualisation (C13P).
 */
@Component({
    selector: 'app-resultats-rqapbf',
    standalone: true,
    imports: [CommonModule, RouterModule, NgPrimeModule],
    providers: [MessageService],
    templateUrl: './resultats-rqapbf.component.html'
})
export class ResultatsRQAPBFComponent implements OnInit, OnDestroy {

    audit: Audit | null = null;
    evaluation: EvaluationRQAPBF | null = null;
    domaines: NoeudReferentiel[] = [];
    ouverts = new Set<string>();
    loading = true;
    auditId: string | null = null;
    radar: any;
    optionsRadar: any;

    private notations = new Map<string, NotationCritere>();
    private destroy$ = new Subject<void>();

    constructor(
        private auditService: AuditGestionService,
        private route: ActivatedRoute,
        private messageService: MessageService
    ) {}

    ngOnInit(): void {
        this.auditId = this.route.snapshot.paramMap.get('id');
        if (!this.auditId) return;
        forkJoin({
            audit: this.auditService.findById(this.auditId),
            arbre: this.auditService.getReferentielRQAPBF(),
            evaluations: this.auditService.getEvaluationsRQAPBF(this.auditId)
        })
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: ({ audit, arbre, evaluations }) => {
                    this.audit = (audit as any)?.data ?? null;
                    // La dernière validée fait foi ; à défaut, la dernière en cours.
                    this.evaluation = [...evaluations].reverse().find(e => e.statut === 'VALIDEE') ?? evaluations[evaluations.length - 1] ?? null;
                    this.notations = new Map((this.evaluation?.notations ?? []).map(n => [n.noeudId!, n]));
                    const racines = contenu<NoeudReferentiel>(arbre);
                    const retenus = this.audit?.domaineRqapbfIds?.length ? racines.filter(r => this.audit!.domaineRqapbfIds!.includes(r.id!)) : racines;
                    this.domaines = [...retenus].sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));
                    this.construireRadar();
                    this.loading = false;
                },
                error: err => {
                    this.loading = false;
                    this.messageService.add({ severity: 'error', summary: 'Erreur', detail: messageErreur(err, 'Les résultats n\'ont pas pu être chargés.'), life: 8000 });
                }
            });
    }

    private construireRadar(): void {
        const style = getComputedStyle(document.documentElement);
        const primaire = style.getPropertyValue('--p-primary-500').trim() || '#3b82f6';
        const texte = style.getPropertyValue('--p-text-muted-color').trim() || '#64748b';
        const grille = style.getPropertyValue('--p-content-border-color').trim() || '#e2e8f0';
        this.radar = {
            labels: this.domaines.map(d => d.code),
            datasets: [{
                label: 'Score (%)',
                data: this.domaines.map(d => Math.round(this.scoreDomaine(d) ?? 0)),
                borderColor: primaire,
                backgroundColor: primaire + '33',
                pointBackgroundColor: primaire
            }]
        };
        this.optionsRadar = {
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { r: { min: 0, max: 100, ticks: { display: false }, grid: { color: grille }, pointLabels: { color: texte } } }
        };
    }

    get officiel(): boolean {
        return this.evaluation?.statut === 'VALIDEE';
    }

    get score(): number | null | undefined {
        return this.officiel ? this.evaluation?.scoreOfficiel : this.evaluation?.scoreGlobal;
    }

    /** Le niveau atteint, aux seuils du serveur (90 / 70 / 50), partagés avec l'écran d'évaluation. */
    get niveau(): string {
        return this.niveauDe(this.score);
    }

    niveauDe(s?: number | null): string {
        return libelleNiveauDeScore(s);
    }

    /**
     * Les critères notables sous un nœud : ses feuilles — un domaine ou une section vides n'en ont
     * pas. On ne descend que sous les domaines retenus : une section, c'est l'enfant de l'un d'eux.
     */
    private feuilles(n: NoeudReferentiel): NoeudReferentiel[] {
        if (n.enfants?.length) return n.enfants.flatMap(e => this.feuilles(e));
        return !n.parentId || this.domaines.some(d => d.id === n.parentId) ? [] : [n];
    }

    /** L'avancement d'un nœud : ses critères notés, publiés. */
    avancement(n: NoeudReferentiel): { libelle: string; severite: any } {
        const feuilles = this.feuilles(n);
        const notes = feuilles.filter(f => this.notations.has(f.id!));
        if (!notes.length) return { libelle: 'Non évalué', severite: 'secondary' };
        if (notes.length === feuilles.length && notes.every(f => this.notations.get(f.id!)?.statut === 'PUBLIE')) return { libelle: 'Publié', severite: 'success' };
        if (notes.length === feuilles.length) return { libelle: 'Noté', severite: 'info' };
        return { libelle: 'En cours', severite: 'warn' };
    }

    get totalCriteres(): number {
        return this.domaines.reduce((t, d) => t + this.feuilles(d).length, 0);
    }

    get etoiles(): number[] {
        const s = this.score ?? 0;
        return [1, 2, 3, 4, 5].map(i => (s >= i * 20 ? 1 : s >= i * 20 - 10 ? 0.5 : 0));
    }

    /**
     * Le score d'un domaine : officiel (critères publiés) ou provisoire, sous la clé « code — libellé »
     * que le serveur lui donne (`EvaluationRQAPBF.genererResultatsParDomaine`).
     */
    scoreDomaine(d: NoeudReferentiel): number | undefined {
        const r = this.officiel ? this.evaluation?.resultatsOfficielsParDomaine : this.evaluation?.resultatsParDomaine;
        return r?.[`${d.code} — ${d.libelle}`];
    }

    /** Le détail d'un domaine : ses sections et sous-sections, avec leur score. */
    lignes(d: NoeudReferentiel): LigneResultat[] {
        const out: LigneResultat[] = [];
        const parcourir = (noeuds: NoeudReferentiel[], profondeur: number) => {
            for (const n of [...noeuds].sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0))) {
                if (!n.enfants?.length) continue;
                out.push({ noeud: n, profondeur, score: this.evaluation?.scoresParNoeud?.[n.code!] });
                parcourir(n.enfants, profondeur + 1);
            }
        };
        parcourir(d.enfants ?? [], 0);
        return out;
    }

    basculer(d: NoeudReferentiel): void {
        this.ouverts.has(d.id!) ? this.ouverts.delete(d.id!) : this.ouverts.add(d.id!);
    }

    get nombreNc(): number {
        return (this.evaluation?.notations ?? []).filter(n => n.constatRetenu === 'NC' && (!this.officiel || n.statut === 'PUBLIE')).length;
    }

    couleur(score?: number | null): string {
        const n = niveauDeScore(score);
        return n ? COULEUR_NIVEAU[n] : 'text-surface-400';
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }
}
