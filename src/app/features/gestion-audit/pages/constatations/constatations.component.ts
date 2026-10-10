import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgPrimeModule } from '@prime-ng';
import { Observable, Subject, catchError, forkJoin, of, takeUntil, throwError, tap } from 'rxjs';
import { ConfirmationService, MessageService } from 'primeng/api';
import { currentUserState } from '@core/auth/auth.state';
import { hasAnyPermission } from '@core/auth/auth-utils';
import { SelectInputComponent } from '@shared/ui/select-input/select-input.component';
import { AuditLibelleComponent } from '../../components/libelle-aide.component';
import { AuditGestionService, contenu, messageErreur } from '../../services/audit.service';
import { AuditReferentielService } from '../../services/audit-referentiel.service';
import { Audit, ChecklistAudit, ConstatAudit, PointControle, TypeConstatRef } from '../../models/audit.model';
import { StatutAudit, StatutConstat, STATUT_AUDIT_LABELS, STATUT_AUDIT_SEVERITY, STATUT_CONSTAT_LABELS, STATUT_CONSTAT_SEVERITY } from '../../models/audit-enums';
import { NatureChoixComponent } from './nature-choix.component';
import { PreuvesConstatComponent } from './preuves-constat.component';

type Vue = 'saisie' | 'mes-constats' | 'compilation';

/** Ce que l'on retouche d'un constat, sur place. */
interface Retouche {
    natureId?: string;
    critereAudit?: string;
    observation?: string;
    commentaireEquipe?: string;
}

/**
 * Les constats d'un audit en cours, en trois vues tirées de la maquette :
 * <ul>
 *   <li><b>Saisie</b> (C10) — l'auditeur parcourt les points de contrôle qui lui sont assignés et
 *   y consigne son constat, privé tant qu'il ne l'a pas publié ;</li>
 *   <li><b>Mes constats du jour</b> (C10M) — il relit ses brouillons et les verse à l'équipe ;</li>
 *   <li><b>Compilation d'équipe</b> (C10P) — l'équipe relit les constats versés, groupés par
 *   nature, les retouche, les renvoie à leur auteur ou les valide (publiés, ils entrent au
 *   rapport et les écarts ouvrent leur non-conformité).</li>
 * </ul>
 * Nature, point de contrôle et rédacteur se choisissent ou se lisent : rien ne se ressaisit.
 */
@Component({
    selector: 'app-audit-constatations',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule, NgPrimeModule, SelectInputComponent, AuditLibelleComponent,
        NatureChoixComponent, PreuvesConstatComponent],
    providers: [MessageService, ConfirmationService],
    templateUrl: './constatations.component.html'
})
export class AuditConstatationsComponent implements OnInit, OnDestroy {

    readonly StatutConstat = StatutConstat;

    vue: Vue = 'saisie';
    auditId: string | null = null;
    auditsDisponibles: Audit[] = [];
    loadingAudits = false;
    loading = false;
    saving = false;
    enCours = false;

    typesConstat: TypeConstatRef[] = [];
    /** Mes brouillons, visibles de moi seul. */
    brouillons: ConstatAudit[] = [];
    /** La compilation d'équipe : constats versés et publiés. */
    equipe: ConstatAudit[] = [];
    /** Les points de contrôle qui me sont assignés sur cet audit. */
    mesPoints: PointControle[] = [];

    private points = new Map<string, PointControle>();
    private nomsAuditeurs = new Map<string, string>();

    // ---- Saisie (C10) ----
    /** Le point actif : un point assigné, ou `null` pour un constat hors checklist. */
    pointActif: PointControle | null = null;
    horsChecklist = false;
    /** Le constat en cours de saisie sur le point actif (existant ou à créer). */
    constatSaisi: ConstatAudit | null = null;
    saisie: Retouche = {};

    // ---- Relecture (C10M, C10P) ----
    ouvert: string | null = null;
    retouche: Retouche = {};
    /** Le constat dont on écrit le motif de renvoi, sur place. */
    renvoiDe: string | null = null;
    motifRenvoi = '';

    private destroy$ = new Subject<void>();

    constructor(
        private auditService: AuditGestionService,
        private referentiel: AuditReferentielService,
        private route: ActivatedRoute,
        private router: Router,
        private messageService: MessageService,
        private confirmationService: ConfirmationService
    ) {}

    ngOnInit(): void {
        const q = this.route.snapshot.queryParamMap;
        this.auditId = q.get('auditId');
        const vue = q.get('vue') as Vue | null;
        if (vue && ['saisie', 'mes-constats', 'compilation'].includes(vue)) {
            this.vue = vue;
        }
        // Chaque liste de son côté : un refus sur l'une (un valideur qui ne lit pas le vivier, par
        // exemple) faisait tomber les trois, et l'écran perdait natures, auteurs et points ensemble.
        this.referentiel.typesConstat().pipe(takeUntil(this.destroy$)).subscribe({
            next: types => (this.typesConstat = types),
            error: err => this.erreur(err, 'Les natures de constat n\'ont pas pu être chargées.')
        });
        this.referentiel.auditeurs().pipe(takeUntil(this.destroy$)).subscribe({
            next: auditeurs => (this.nomsAuditeurs = new Map(auditeurs.map(a => [a.id!, a.nomComplet ?? '—']))),
            error: err => this.erreur(err, 'Le vivier d\'auditeurs n\'a pas pu être chargé : les auteurs ne s\'affichent pas.')
        });
        this.auditService.getChecklists().pipe(takeUntil(this.destroy$)).subscribe({
            // Les points de toutes les checklists : la compilation montre aussi ceux des collègues.
            next: checklists => contenu<ChecklistAudit>(checklists).forEach(c => (c.points ?? []).forEach(p => p.id && this.points.set(p.id, p))),
            error: err => this.erreur(err, 'Les checklists n\'ont pas pu être chargées.')
        });
        this.chargerAudits();
    }

    /**
     * Les onglets se recalculent à chaque cycle (compteurs) : sans cette clé, `*ngFor` les
     * recréerait à chaque fois et l'onglet cliqué disparaîtrait sous le clic.
     */
    parValeur(_i: number, o: { value: string }): string {
        return o.value;
    }

    get vues() {
        return [
            { label: 'Saisie', value: 'saisie', icone: 'pi pi-pencil', compte: 0 },
            { label: 'Mes constats du jour', value: 'mes-constats', icone: 'pi pi-user', compte: this.brouillonsARelire.length },
            { label: 'Compilation d\'équipe', value: 'compilation', icone: 'pi pi-users', compte: this.equipe.length }
        ];
    }

    /** Les audits où l'on saisit des constats : démarrés, ou clôturés pour relecture. */
    chargerAudits(): void {
        this.loadingAudits = true;
        this.auditService.findAll(0, 100, { statuts: [StatutAudit.EN_COURS, StatutAudit.CLOTURE] })
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (res: any) => {
                    this.auditsDisponibles = res?.data?.content ?? [];
                    this.loadingAudits = false;
                    // On ne choisit l'audit à la place de l'utilisateur que s'il n'y en a qu'un : sinon le
                    // premier de la liste s'imposait, et l'on saisissait sans voir dans quel audit.
                    if (!this.auditId && this.auditsDisponibles.length === 1) {
                        this.auditId = this.auditsDisponibles[0].id ?? null;
                    }
                    this.charger();
                },
                error: err => {
                    this.loadingAudits = false;
                    this.erreur(err, 'Les audits n\'ont pas pu être chargés.');
                }
            });
    }

    /** « AUD-2026-004 · du 06/10/2026 au 10/10/2026 · En cours » : de quoi reconnaître l'audit. */
    get auditOptions(): { label: string; value: string }[] {
        const date = (d?: string) => (d ? d.substring(0, 10).split('-').reverse().join('/') : '…');
        return this.auditsDisponibles.map(a => ({
            label: `${a.reference ?? '—'} · du ${date(a.dateDebutPrevue)} au ${date(a.dateFinPrevue)} · ${this.libelleStatutAudit(a)}`,
            value: a.id!
        }));
    }

    libelleStatutAudit(a: Audit): string {
        return a.statut ? STATUT_AUDIT_LABELS[a.statut] : '';
    }

    severiteStatutAudit(a: Audit): any {
        return a.statut ? STATUT_AUDIT_SEVERITY[a.statut] : 'secondary';
    }

    get auditCourant(): Audit | undefined {
        return this.auditsDisponibles.find(a => a.id === this.auditId);
    }

    /** On saisit et on compile pendant l'audit ; clôturé, il ne se lit plus qu'en lecture. */
    get saisieOuverte(): boolean {
        return this.auditCourant?.statut === StatutAudit.EN_COURS;
    }

    /**
     * Retoucher ou retirer un constat compilé : geste de l'équipe, que le serveur réserve à ses
     * membres qui conduisent l'audit. Les boutons s'offraient à tout lecteur, qui prenait un 403.
     */
    get peutRetoucher(): boolean {
        return this.saisieOuverte && !!this.auditCourant?.jeSuisDeLEquipe && hasAnyPermission(['audit-conduct']);
    }

    /** Publier (valider) un constat compilé : l'équipe, ou qui détient la validation sans en être. */
    get peutValider(): boolean {
        return this.saisieOuverte
            && (hasAnyPermission(['audit-validate'])
                || (!!this.auditCourant?.jeSuisDeLEquipe && hasAnyPermission(['audit-conduct'])));
    }

    charger(garderSaisie = false): void {
        if (!this.auditId) {
            this.brouillons = [];
            this.equipe = [];
            this.mesPoints = [];
            return;
        }
        this.loading = true;
        // La compilation d'équipe se lit avec audit-read ; mes brouillons et mes points exigent
        // audit-conduct. Un valideur qui n'est pas auditeur en est refusé (403) : il n'a rien à
        // saisir mais doit voir la compilation — ces deux listes restent alors vides, sans erreur.
        const sansDroit = (err: any) => (err?.status === 403 ? of(null) : throwError(() => err));
        forkJoin({
            equipe: this.auditService.getConstats(this.auditId),
            brouillons: this.auditService.getMesBrouillons(this.auditId).pipe(catchError(sansDroit)),
            points: this.auditService.getMesPoints(this.auditId).pipe(catchError(sansDroit))
        }).pipe(takeUntil(this.destroy$)).subscribe({
            next: ({ equipe, brouillons, points }) => {
                this.equipe = contenu<ConstatAudit>(equipe);
                this.brouillons = contenu<ConstatAudit>(brouillons);
                this.mesPoints = contenu<PointControle>(points);
                this.mesPoints.forEach(p => p.id && this.points.set(p.id, p));
                this.loading = false;
                if (brouillons === null && points === null && this.vue === 'saisie') {
                    // Rien à saisir pour lui : la compilation est ce qui lui est ouvert.
                    this.changerVue('compilation');
                } else if (garderSaisie && (this.pointActif || this.horsChecklist)) {
                    this.rattacherSaisie();
                } else if (!this.pointActif && !this.horsChecklist && this.mesPoints.length) {
                    this.choisirPoint(this.mesPoints[0]);
                }
            },
            error: err => {
                this.loading = false;
                this.erreur(err, 'Impossible de charger les constats.');
            }
        });
    }

    changerAudit(): void {
        this.pointActif = null;
        this.horsChecklist = false;
        this.constatSaisi = null;
        this.ouvert = null;
        this.majUrl();
        this.charger();
    }

    changerVue(v: Vue): void {
        this.vue = v;
        this.ouvert = null;
        this.renvoiDe = null;
        this.majUrl();
    }

    private majUrl(): void {
        this.router.navigate([], { queryParams: { auditId: this.auditId, vue: this.vue }, replaceUrl: true });
    }

    // ================================================================ Saisie (C10)

    choisirPoint(p: PointControle): void {
        this.pointActif = p;
        this.horsChecklist = false;
        this.rattacherSaisie();
    }

    nouveauHorsChecklist(): void {
        this.pointActif = null;
        this.horsChecklist = true;
        this.constatSaisi = null;
        this.saisie = {};
    }

    /** Retrouve le constat du point actif (le mien, le plus récent) et prépare sa saisie. */
    private rattacherSaisie(): void {
        if (this.horsChecklist) {
            this.constatSaisi = this.constatSaisi?.id ? this.trouver(this.constatSaisi.id) ?? null : null;
        } else {
            const id = this.pointActif?.id
                ? this.mesPoints.find(p => p.id === this.pointActif!.id)?.constatId
                : undefined;
            this.constatSaisi = id ? this.trouver(id) ?? null : null;
        }
        const c = this.constatSaisi;
        this.saisie = c
            ? { natureId: c.natureId, critereAudit: c.critereAudit, observation: c.observation }
            : { critereAudit: this.pointActif?.chapitreISO ? `§${this.pointActif.chapitreISO}` : undefined };
    }

    private trouver(id: string): ConstatAudit | undefined {
        return this.brouillons.find(c => c.id === id) ?? this.equipe.find(c => c.id === id);
    }

    get saisieModifiable(): boolean {
        return this.saisieOuverte && (!this.constatSaisi || this.constatSaisi.statut === StatutConstat.BROUILLON);
    }

    get saisieComplete(): boolean {
        return !!this.saisie.natureId && !!this.saisie.observation?.trim();
    }

    /** Le point suivant parmi les miens, en boucle. */
    private get pointSuivant(): PointControle | undefined {
        if (!this.pointActif || this.mesPoints.length < 2) {
            return undefined;
        }
        const i = this.mesPoints.findIndex(p => p.id === this.pointActif!.id);
        return this.mesPoints[(i + 1) % this.mesPoints.length];
    }

    enregistrerSaisie(continuer = false): void {
        if (!this.auditId || !this.saisieComplete) {
            return;
        }
        this.saving = true;
        const corps: Partial<ConstatAudit> = {
            ...this.saisie,
            checklistId: this.pointActif?.checklistId,
            pointControleId: this.pointActif?.id
        };
        const requete$ = this.constatSaisi?.id
            ? this.auditService.mettreAJourConstat(this.constatSaisi.id, { ...this.constatSaisi, ...corps })
            : this.auditService.creerConstat({ ...corps, auditId: this.auditId });
        requete$.pipe(takeUntil(this.destroy$)).subscribe({
            next: (res: any) => {
                const c: ConstatAudit = res?.data ?? res;
                this.saving = false;
                this.messageService.add({ severity: 'success', summary: 'Enregistré', detail: 'Constat enregistré dans vos brouillons.' });
                if (continuer && this.pointSuivant) {
                    this.pointActif = this.pointSuivant;
                    this.horsChecklist = false;
                } else {
                    this.constatSaisi = c;
                }
                this.charger(true);
            },
            error: err => {
                this.saving = false;
                this.erreur(err, 'La sauvegarde a échoué.');
            }
        });
    }

    // ================================================================ Mes constats (C10M)

    get brouillonsARelire(): ConstatAudit[] {
        return this.brouillons.filter(c => c.statut === StatutConstat.BROUILLON);
    }

    /** Mon identifiant d'auditeur : celui de mes points ou de mes brouillons. */
    /** Ce que j'ai versé à l'équipe : les constats dont je suis le rédacteur, reconnu par mon compte. */
    get dejaTransmis(): ConstatAudit[] {
        const moi = currentUserState.value?.user?.userId;
        return moi ? this.equipe.filter(c => c.redacteurUtilisateurId === moi) : [];
    }

    publierTousMesConstats(): void {
        if (!this.auditId) return;
        this.geste(this.auditService.publierMesConstats(this.auditId), 'Vos constats rejoignent la compilation d\'équipe.');
    }

    verser(c: ConstatAudit): void {
        // On enregistre d'abord ce qui a été retouché, puis on verse.
        this.enregistrerRetouche(c, () => this.geste(this.auditService.publierConstat(c.id!), 'Constat publié vers la compilation d\'équipe.'));
    }

    supprimer(event: Event, c: ConstatAudit): void {
        this.confirmationService.confirm({
            target: event.currentTarget as EventTarget,
            message: 'Ce brouillon sera définitivement supprimé. Continuer ?',
            icon: 'pi pi-trash',
            acceptLabel: 'Supprimer',
            rejectLabel: 'Retour',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => {
                this.ouvert = null;
                this.geste(this.auditService.supprimerConstat(c.id!), 'Constat supprimé.');
            }
        });
    }

    // ================================================================ Compilation (C10P)

    /** Les groupes de la compilation, par nature, dans l'ordre du paramétrage. */
    /**
     * Les groupes se recalculent à chaque cycle : sans cette clé, `*ngFor` recréait chacun d'eux à
     * chaque fois, et avec eux le constat déplié — dont les preuves se rechargeaient, ce qui
     * relançait un cycle. L'écran tournait en boucle et ne répondait plus.
     */
    parNature(_i: number, g: { type: TypeConstatRef }): string | undefined {
        return g.type.id;
    }

    get groupes(): { type: TypeConstatRef; constats: ConstatAudit[]; compiles: number }[] {
        const connus = new Set(this.typesConstat.map(t => t.id));
        const types: TypeConstatRef[] = [...this.typesConstat];
        // Une nature retirée du paramétrage depuis reste lisible sur ses constats.
        this.equipe.filter(c => !connus.has(c.natureId)).forEach(c => {
            if (!types.some(t => t.id === c.natureId)) {
                types.push({ id: c.natureId, libelle: c.natureLibelle, couleur: c.natureCouleur, genereNonConformite: c.nonConformite });
            }
        });
        return types
            .map(type => {
                const constats = this.equipe.filter(c => c.natureId === type.id);
                return { type, constats, compiles: constats.filter(c => c.statut === StatutConstat.COMPILE).length };
            })
            .filter(g => g.constats.length);
    }

    combien(statut: StatutConstat): number {
        return this.equipe.filter(c => c.statut === statut).length;
    }

    validerGroupe(event: Event, type: TypeConstatRef, n: number): void {
        if (!this.auditId) return;
        this.confirmationService.confirm({
            target: event.currentTarget as EventTarget,
            message: `Valider les ${n} constat(s) « ${type.libelle} » en compilation ? Publiés, ils ne se modifieront plus${type.genereNonConformite ? ' et ouvriront leur non-conformité' : ''}.`,
            icon: 'pi pi-check-circle',
            acceptLabel: 'Valider',
            rejectLabel: 'Retour',
            accept: () => this.geste(this.auditService.validerCompilation(this.auditId!, type.id), 'Groupe validé : constats publiés.')
        });
    }

    validerTout(event: Event): void {
        if (!this.auditId) return;
        this.confirmationService.confirm({
            target: event.currentTarget as EventTarget,
            message: `L'équipe est d'accord : les ${this.combien(StatutConstat.COMPILE)} constat(s) en compilation seront publiés et ne se modifieront plus. Les écarts ouvriront leur non-conformité.`,
            icon: 'pi pi-check-circle',
            acceptLabel: 'Valider tout',
            rejectLabel: 'Retour',
            accept: () => this.geste(this.auditService.validerCompilation(this.auditId!), 'Compilation validée : constats publiés.',
                () => this.router.navigate(['/gestion-audit/programme', this.auditId, 'rapport']))
        });
    }

    valider(c: ConstatAudit): void {
        this.enregistrerRetouche(c, () => this.geste(this.auditService.validerConstat(c.id!), 'Constat validé et publié.'));
    }

    demanderRenvoi(c: ConstatAudit): void {
        this.renvoiDe = c.id ?? null;
        this.motifRenvoi = '';
        this.ouvert = c.id ?? null;
        this.preparerRetouche(c);
    }

    renvoyer(c: ConstatAudit): void {
        this.renvoiDe = null;
        this.ouvert = null;
        this.geste(this.auditService.retirerConstat(c.id!, this.motifRenvoi.trim() || undefined), 'Constat renvoyé à son auteur.');
    }

    // ================================================================ Retouche sur place

    basculer(c: ConstatAudit): void {
        if (this.ouvert === c.id) {
            this.ouvert = null;
            return;
        }
        this.ouvert = c.id ?? null;
        this.renvoiDe = null;
        this.preparerRetouche(c);
    }

    private preparerRetouche(c: ConstatAudit): void {
        this.retouche = { natureId: c.natureId, critereAudit: c.critereAudit, observation: c.observation, commentaireEquipe: c.commentaireEquipe };
    }

    retoucheModifiee(c: ConstatAudit): boolean {
        return this.retouche.natureId !== c.natureId
            || (this.retouche.critereAudit ?? '') !== (c.critereAudit ?? '')
            || (this.retouche.observation ?? '') !== (c.observation ?? '')
            || (this.retouche.commentaireEquipe ?? '') !== (c.commentaireEquipe ?? '');
    }

    /** Enregistre la retouche du constat ouvert s'il y en a une, puis enchaîne. */
    enregistrerRetouche(c: ConstatAudit, ensuite?: () => void): void {
        if (this.ouvert !== c.id || !this.retoucheModifiee(c)) {
            ensuite ? ensuite() : undefined;
            return;
        }
        if (!this.retouche.natureId || !this.retouche.observation?.trim()) {
            this.messageService.add({ severity: 'warn', summary: 'Incomplet', detail: 'La nature et l\'observation sont requises.' });
            return;
        }
        this.saving = true;
        this.auditService.mettreAJourConstat(c.id!, { ...c, ...this.retouche }).pipe(takeUntil(this.destroy$)).subscribe({
            next: () => {
                this.saving = false;
                if (ensuite) {
                    ensuite();
                } else {
                    this.messageService.add({ severity: 'success', summary: 'Enregistré', detail: 'Constat mis à jour.' });
                    this.charger();
                }
            },
            error: err => {
                this.saving = false;
                this.erreur(err, 'La sauvegarde a échoué.');
            }
        });
    }

    // ================================================================ Affichage

    libellePoint(c: ConstatAudit): string {
        const p = c.pointControleId ? this.points.get(c.pointControleId) : undefined;
        return p?.libelle ?? (c.critereAudit ? `Hors checklist — ${c.critereAudit}` : 'Constat hors checklist');
    }

    questionPoint(c: ConstatAudit): string | undefined {
        const p = c.pointControleId ? this.points.get(c.pointControleId) : undefined;
        return p?.question || p?.libelle;
    }

    auteur(c: ConstatAudit): string {
        return c.redacteurId ? this.nomsAuditeurs.get(c.redacteurId) ?? '—' : '—';
    }

    extrait(texte?: string): string {
        if (!texte) return 'Aucune observation saisie';
        return texte.length > 90 ? texte.slice(0, 90) + '…' : texte;
    }

    libelleStatut(statut?: string): string {
        return STATUT_CONSTAT_LABELS[statut as StatutConstat] ?? statut ?? '';
    }

    severiteStatut(statut?: string): any {
        return STATUT_CONSTAT_SEVERITY[statut as StatutConstat] ?? 'secondary';
    }

    trackById(_i: number, x: { id?: string }): string {
        return x.id ?? String(_i);
    }

    private geste(appel$: Observable<unknown>, succes: string, ensuite?: () => void): void {
        // Les compteurs des onglets et du menu suivent le geste.
        appel$ = appel$.pipe(tap(() => this.auditService.rafraichirNotifications()));
        this.enCours = true;
        appel$.pipe(takeUntil(this.destroy$)).subscribe({
            next: () => {
                this.enCours = false;
                this.messageService.add({ severity: 'success', summary: 'Succès', detail: succes });
                this.charger(true);
                ensuite?.();
            },
            error: err => {
                this.enCours = false;
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
