import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { NgPrimeModule } from '@prime-ng';
import { Subject, forkJoin, takeUntil } from 'rxjs';
import { MessageService } from 'primeng/api';
import { AuditGestionService, contenu, messageErreur } from '../../services/audit.service';
import { AuditReferentielService } from '../../services/audit-referentiel.service';
import { Audit, AuditeurFiche, CritereEvaluationAuditeur, EvaluationAuditeur, NiveauEvaluationAuditeur, couleurDuNiveau } from '../../models/audit.model';

@Component({
    selector: 'app-evaluation-auditeurs',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule, NgPrimeModule],
    providers: [MessageService],
    templateUrl: './evaluation-auditeurs.component.html'
})
export class EvaluationAuditeursComponent implements OnInit, OnDestroy {

    audit: Audit | null = null;
    equipe: AuditeurFiche[] = [];
    criteres: CritereEvaluationAuditeur[] = [];
    niveaux: NiveauEvaluationAuditeur[] = [];
    loading = true;
    enCours = new Set<string>();
    auditId: string | null = null;
    auditeurSelectionneId: string | null = null;

    /** auditeurId|critereId → évaluation enregistrée. */
    private evaluations = new Map<string, EvaluationAuditeur>();
    /** auditeurId → moyenne tous audits confondus. */
    private moyennesGlobales: Record<string, number | null> = {};
    /** auditeurId|critereId → niveau choisi à l'écran. */
    choix: Record<string, string | undefined> = {};
    commentaires: Record<string, string> = {};
    /** Le commentaire tel qu'enregistré, pour savoir s'il a changé. */
    private commentairesEnregistres: Record<string, string> = {};

    private destroy$ = new Subject<void>();

    constructor(
        private auditService: AuditGestionService,
        private referentiel: AuditReferentielService,
        private route: ActivatedRoute,
        private messageService: MessageService
    ) {}

    ngOnInit(): void {
        this.auditId = this.route.snapshot.paramMap.get('id');
        if (this.auditId) this.charger(this.auditId);
    }

    charger(auditId: string): void {
        this.loading = true;
        this.referentiel.rafraichirAuditeurs();
        forkJoin({
            audit: this.auditService.findById(auditId),
            auditeurs: this.referentiel.auditeurs(),
            criteres: this.referentiel.criteresEvaluation(),
            niveaux: this.referentiel.niveauxEvaluation(),
            evaluations: this.auditService.getEvaluationsAuditeur(auditId)
        })
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: r => {
                    this.audit = (r.audit as any)?.data ?? null;
                    const ids = [...new Set([this.audit?.responsableEquipeId, ...(this.audit?.membreEquipeIds ?? [])].filter(Boolean))] as string[];
                    this.equipe = ids.map(id => r.auditeurs.find(a => a.id === id) ?? { id, nomComplet: 'Auditeur hors du vivier' } as AuditeurFiche);
                    if (!this.auditeurSelectionneId || !this.equipe.some(a => a.id === this.auditeurSelectionneId)) {
                        this.auditeurSelectionneId = this.equipe[0]?.id ?? null;
                    }
                    this.equipe.forEach(a => this.chargerMoyenneGlobale(a));
                    const evals = contenu<EvaluationAuditeur>(r.evaluations);
                    this.criteres = r.criteres.filter(c => c.actif !== false || evals.some(e => e.critereId === c.id));
                    this.niveaux = r.niveaux.filter(n => n.actif !== false);
                    this.appliquer(evals);
                    this.loading = false;
                },
                error: err => {
                    this.loading = false;
                    this.erreur(err, 'L\'évaluation de l\'équipe n\'a pas pu être chargée.');
                }
            });
    }

    private appliquer(evals: EvaluationAuditeur[]): void {
        this.evaluations = new Map(evals.map(e => [this.cle(e.auditeurId, e.critereId), e]));
        this.choix = {};
        this.commentaires = {};
        this.commentairesEnregistres = {};
        for (const e of evals) {
            this.choix[this.cle(e.auditeurId, e.critereId)] = e.niveauId;
            if (e.commentaire) {
                this.commentaires[e.auditeurId!] = e.commentaire;
                this.commentairesEnregistres[e.auditeurId!] = e.commentaire;
            }
        }
    }

    get auditeurActif(): AuditeurFiche | null {
        return this.equipe.find(a => a.id === this.auditeurSelectionneId) ?? this.equipe[0] ?? null;
    }

    get indexActif(): number {
        const actif = this.auditeurActif;
        return actif ? this.equipe.findIndex(a => a.id === actif.id) : -1;
    }

    get nbMembresValides(): number {
        return this.equipe.filter(a => this.toutValide(a)).length;
    }

    selectionnerAuditeur(a: AuditeurFiche): void {
        this.auditeurSelectionneId = a.id ?? null;
    }

    naviguerMembre(delta: number): void {
        const cible = this.indexActif + delta;
        if (cible >= 0 && cible < this.equipe.length) {
            this.auditeurSelectionneId = this.equipe[cible].id ?? null;
        }
    }

    initiales(nom?: string): string {
        const propre = (nom ?? '').replace(/\([^)]*\)/g, '').trim();
        if (!propre) return '?';
        const parts = propre.split(/\s+/).filter(Boolean);
        return parts.length >= 2
            ? (parts[0][0] + parts[1][0]).toUpperCase()
            : propre.slice(0, 2).toUpperCase();
    }

    libelleCourt(libelle?: string): string {
        if (!libelle) return '';
        return libelle.split(/\s+[–—-]\s+/)[0].trim();
    }

    libelleDetail(libelle?: string): string {
        if (!libelle) return '';
        const parts = libelle.split(/\s+[–—-]\s+/);
        return parts.length > 1 ? parts.slice(1).join(' – ').trim() : '';
    }

    nbNotesSaisies(a: AuditeurFiche): number {
        return this.criteres.filter(c => !!this.choix[this.cle(a.id, c.id)]).length;
    }

    pourcentageSaisi(a: AuditeurFiche): number {
        return this.criteres.length ? Math.round((this.nbNotesSaisies(a) / this.criteres.length) * 100) : 0;
    }

    bordureStatut(a: AuditeurFiche): string {
        if (this.toutValide(a)) return 'border-l-emerald-500';
        if (this.aDesModifications(a)) return 'border-l-amber-500';
        if (this.criteres.some(c => !!this.evaluation(a.id, c.id))) return 'border-l-[#0084ca]';
        return 'border-l-surface-300 dark:border-l-surface-600';
    }

    cle(auditeurId?: string, critereId?: string): string {
        return `${auditeurId}|${critereId}`;
    }

    evaluation(auditeurId?: string, critereId?: string): EvaluationAuditeur | undefined {
        return this.evaluations.get(this.cle(auditeurId, critereId));
    }

    get evaluable(): boolean {
        return this.audit?.statut === 'EN_COURS' || this.audit?.statut === 'CLOTURE';
    }

    estValidee(auditeurId?: string, critereId?: string): boolean {
        return this.evaluation(auditeurId, critereId)?.statut === 'VALIDEE';
    }

    verrouillee(a: AuditeurFiche, c: CritereEvaluationAuditeur): boolean {
        return !this.evaluable || this.estValidee(a.id, c.id) || c.actif === false || this.enCours.has(a.id!);
    }

    choisir(a: AuditeurFiche, c: CritereEvaluationAuditeur, n: NiveauEvaluationAuditeur): void {
        if (!this.verrouillee(a, c)) {
            this.choix[this.cle(a.id, c.id)] = n.id;
        }
    }

    choisirPartout(a: AuditeurFiche, n: NiveauEvaluationAuditeur): void {
        this.criteres.forEach(c => this.choisir(a, c, n));
    }

    private aEnvoyer(a: AuditeurFiche): CritereEvaluationAuditeur[] {
        const commentaireChange = (this.commentaires[a.id!] ?? '') !== (this.commentairesEnregistres[a.id!] ?? '');
        return this.criteres.filter(c => {
            const k = this.cle(a.id, c.id);
            if (!this.choix[k] || this.estValidee(a.id, c.id)) return false;
            return commentaireChange || this.choix[k] !== this.evaluation(a.id, c.id)?.niveauId;
        });
    }

    aDesModifications(a: AuditeurFiche): boolean {
        return this.aEnvoyer(a).length > 0;
    }

    enregistrer(a: AuditeurFiche): void {
        const criteres = this.aEnvoyer(a);
        if (!criteres.length || !this.auditId) return;
        this.enCours.add(a.id!);
        forkJoin(criteres.map(c => this.auditService.creerEvaluationAuditeur({
            auditId: this.auditId!,
            auditeurId: a.id,
            critereId: c.id,
            niveauId: this.choix[this.cle(a.id, c.id)],
            commentaire: this.commentaires[a.id!] || undefined
        })))
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: () => {
                    this.enCours.delete(a.id!);
                    this.messageService.add({ severity: 'success', summary: 'Succès', detail: `Évaluation de ${a.nomComplet} enregistrée.` });
                    this.recharger();
                },
                error: err => {
                    this.enCours.delete(a.id!);
                    this.erreur(err, 'L\'enregistrement a échoué.');
                    this.recharger();
                }
            });
    }

    validerAuditeur(auditeur: AuditeurFiche): void {
        const brouillons = this.criteres
            .map(c => this.evaluation(auditeur.id, c.id))
            .filter((e): e is EvaluationAuditeur => !!e && e.statut !== 'VALIDEE');
        if (!brouillons.length) return;
        this.enCours.add(auditeur.id!);
        forkJoin(brouillons.map(e => this.auditService.validerEvaluationAuditeur(e.id!)))
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: () => {
                    this.enCours.delete(auditeur.id!);
                    this.messageService.add({ severity: 'success', summary: 'Validé', detail: `Évaluation de ${auditeur.nomComplet} validée.` });
                    this.recharger();
                },
                error: err => {
                    this.enCours.delete(auditeur.id!);
                    this.erreur(err, 'La validation a échoué.');
                    this.recharger();
                }
            });
    }

    aDesBrouillons(auditeur: AuditeurFiche): boolean {
        return this.criteres.some(c => {
            const e = this.evaluation(auditeur.id, c.id);
            return !!e && e.statut !== 'VALIDEE';
        });
    }

    toutValide(a: AuditeurFiche): boolean {
        return this.criteres.length > 0 && this.criteres.every(c => this.estValidee(a.id, c.id));
    }

    libelleStatut(a: AuditeurFiche): string {
        if (this.toutValide(a)) return 'Évaluation validée';
        if (this.criteres.some(c => this.evaluation(a.id, c.id))) return 'Évalué (brouillon)';
        return 'Non évalué';
    }

    severiteStatut(a: AuditeurFiche): any {
        if (this.toutValide(a)) return 'success';
        return this.criteres.some(c => this.evaluation(a.id, c.id)) ? 'info' : 'secondary';
    }

    private chargerMoyenneGlobale(a: AuditeurFiche): void {
        if (!a.id) return;
        this.auditService.getAuditeurById(a.id).pipe(takeUntil(this.destroy$)).subscribe({
            next: res => (this.moyennesGlobales[a.id!] = res?.data?.scoreEvaluationMoyen ?? null),
            error: () => (this.moyennesGlobales[a.id!] = null)
        });
    }

    niveauGlobal(a: AuditeurFiche): NiveauEvaluationAuditeur | null {
        const m = this.moyennesGlobales[a.id!];
        return m == null ? null : this.plusProche(m);
    }

    niveauMoyen(a: AuditeurFiche): NiveauEvaluationAuditeur | null {
        const valeurs = this.criteres
            .map(c => this.niveaux.find(n => n.id === this.evaluation(a.id, c.id)?.niveauId)?.ordre)
            .filter((v): v is number => v != null);
        if (!valeurs.length) return null;
        return this.plusProche(valeurs.reduce((x, y) => x + y, 0) / valeurs.length);
    }

    private plusProche(m: number): NiveauEvaluationAuditeur | null {
        if (!this.niveaux.length) return null;
        return this.niveaux.reduce((p, n) => (Math.abs((n.ordre ?? 0) - m) < Math.abs((p.ordre ?? 0) - m) ? n : p));
    }

    couleur(n: NiveauEvaluationAuditeur | null): string {
        return couleurDuNiveau(n, this.niveaux);
    }

    get niveauTop(): NiveauEvaluationAuditeur | null {
        if (!this.niveaux.length) return null;
        return this.niveaux.reduce((top, n) => (n.ordre ?? 0) > (top.ordre ?? 0) ? n : top);
    }

    get libelleNiveauTop(): string {
        return this.niveauTop?.libelle ?? 'Satisfaisant';
    }

    toutSatisfaisant(auditeur: AuditeurFiche): void {
        const top = this.niveauTop;
        if (!top || !this.evaluable) return;
        for (const c of this.criteres) {
            if (!this.verrouillee(auditeur, c)) {
                this.choix[this.cle(auditeur.id, c.id)] = top.id;
            }
        }
    }

    private recharger(): void {
        if (!this.auditId) return;
        this.auditService.getEvaluationsAuditeur(this.auditId).pipe(takeUntil(this.destroy$)).subscribe({
            next: r => this.appliquer(contenu<EvaluationAuditeur>(r)),
            error: err => this.erreur(err, 'Les évaluations n\'ont pas pu être relues.')
        });
        this.equipe.forEach(a => this.chargerMoyenneGlobale(a));
    }

    private erreur(err: unknown, defaut: string): void {
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: messageErreur(err, defaut), life: 8000 });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }
}