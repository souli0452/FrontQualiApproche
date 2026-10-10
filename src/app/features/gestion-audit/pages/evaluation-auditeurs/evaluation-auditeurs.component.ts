import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { NgPrimeModule } from '@prime-ng';
import { Subject, forkJoin, takeUntil } from 'rxjs';
import { MessageService } from 'primeng/api';
import { AuditGestionService, contenu, messageErreur } from '../../services/audit.service';
import { AuditReferentielService } from '../../services/audit-referentiel.service';
import { Audit, AuditeurFiche, CritereEvaluationAuditeur, EvaluationAuditeur, NiveauEvaluationAuditeur } from '../../models/audit.model';

/**
 * L'évaluation de l'équipe d'un audit mené, en cours ou clôturé (écran D15E de la maquette) :
 * une carte par membre, un choix de niveau par critère, un commentaire, puis « Enregistrer ».
 *
 * <p>Critères et niveaux viennent du paramétrage (referentiel-service) : un critère ou un niveau
 * retiré ne se propose plus. Une note se corrige tant qu'elle n'est pas validée.</p>
 */
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

    /** auditeurId|critereId → évaluation enregistrée. */
    private evaluations = new Map<string, EvaluationAuditeur>();
    /** auditeurId → moyenne tous audits confondus : la liste du vivier ne la sert pas, seule la fiche la calcule. */
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
                    const ids = [this.audit?.responsableEquipeId, ...(this.audit?.membreEquipeIds ?? [])];
                    this.equipe = r.auditeurs.filter(a => ids.includes(a.id));
                    this.equipe.forEach(a => this.chargerMoyenneGlobale(a));
                    const evals = contenu<EvaluationAuditeur>(r.evaluations);
                    // Un critère ou un niveau retiré reste affiché là où il a déjà servi.
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

    /** Les critères dont la note choisie diffère de l'enregistrée (ou tous, si le commentaire a changé). */
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

    /** Enregistre en brouillon les notes choisies d'un membre, avec son commentaire. */
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

    /** Valide toutes les notes en brouillon d'un auditeur : elles ne se corrigent plus. */
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
        return this.criteres.every(c => this.estValidee(a.id, c.id));
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

    /** La moyenne tous audits de l'auditeur, lue sur sa fiche (`/get/{id}`) ; sans elle, la carte reste lisible. */
    private chargerMoyenneGlobale(a: AuditeurFiche): void {
        if (!a.id) return;
        this.auditService.getAuditeurById(a.id).pipe(takeUntil(this.destroy$)).subscribe({
            next: res => (this.moyennesGlobales[a.id!] = res?.data?.scoreEvaluationMoyen ?? null),
            error: () => (this.moyennesGlobales[a.id!] = null)
        });
    }

    /** Le niveau le plus proche de la moyenne tous audits, comme l'affiche le portefeuille des auditeurs (A4). */
    niveauGlobal(a: AuditeurFiche): NiveauEvaluationAuditeur | null {
        const m = this.moyennesGlobales[a.id!];
        return m == null ? null : this.plusProche(m);
    }

    /** Le niveau le plus proche de la moyenne des notes enregistrées sur cet audit (sur l'ordre des niveaux). */
    niveauMoyen(a: AuditeurFiche): NiveauEvaluationAuditeur | null {
        const valeurs = this.criteres
            .map(c => this.niveaux.find(n => n.id === this.evaluation(a.id, c.id)?.niveauId)?.ordre)
            .filter((v): v is number => v != null);
        if (!valeurs.length) return null;
        return this.plusProche(valeurs.reduce((x, y) => x + y, 0) / valeurs.length);
    }

    /** Le serveur fait la moyenne des ordres des niveaux attribués ; on la ramène au niveau paramétré le plus proche. */
    private plusProche(m: number): NiveauEvaluationAuditeur | null {
        if (!this.niveaux.length) return null;
        return this.niveaux.reduce((p, n) => (Math.abs((n.ordre ?? 0) - m) < Math.abs((p.ordre ?? 0) - m) ? n : p));
    }

    /** Une teinte par rang, du plus bas (rouge) au plus haut (vert) : l'échelle est paramétrable. */
    private rang(n: NiveauEvaluationAuditeur): number {
        const i = this.niveaux.findIndex(x => x.id === n.id);
        return this.niveaux.length > 1 ? i / (this.niveaux.length - 1) : 1;
    }

    severite(n: NiveauEvaluationAuditeur): any {
        const r = this.rang(n);
        return r < 0.25 ? 'danger' : r < 0.5 ? 'warn' : r < 0.75 ? 'info' : 'success';
    }

    classeNiveau(n: NiveauEvaluationAuditeur): string {
        const r = this.rang(n);
        return r < 0.25 ? 'bg-red-500 text-white font-semibold'
            : r < 0.5 ? 'bg-amber-500 text-white font-semibold'
            : r < 0.75 ? 'bg-primary text-primary-contrast font-semibold'
            : 'bg-emerald-600 text-white font-semibold';
    }

    /** Relit les évaluations de l'audit et les moyennes globales, qu'une note vient de déplacer. */
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
