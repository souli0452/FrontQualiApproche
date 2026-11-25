import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { NgPrimeModule } from '@prime-ng';
import { Subject, tap } from 'rxjs';
import { takeUntil, catchError, of } from 'rxjs';
import { MessageService, ConfirmationService } from 'primeng/api';
import { SelectInputComponent } from '@shared/ui/select-input/select-input.component';
import { SmartAlertBannerComponent } from '@shared/smart-alert-banner/smart-alert-banner.component';
import { SmartAlertItem } from '@shared/smart-alert-banner/smart-alert-banner.model';
import { AuditGestionService, contenu, messageErreur } from '../../services/audit.service';
import { AuditReferentielService, LIBELLES_VIDES, LibellesAudit } from '../../services/audit-referentiel.service';
import { ActionMaitriseRisque, Audit, AvancementAudit, ChecklistAudit, ConstatAudit, NoeudReferentiel, SiteAudit } from '../../models/audit.model';
import {
    StatutAudit,
    NiveauRisqueAudit,
    StatutConstat,
    STATUT_AUDIT_LABELS,
    STATUT_AUDIT_SEVERITY,
    NIVEAU_RISQUE_LABELS,
    NIVEAU_RISQUE_SEVERITY,
    NiveauEfficacite,
    NIVEAU_EFFICACITE_LABELS
} from '../../models/audit-enums';

/**
 * La fiche d'un audit : en-tête et trois blocs de réalisation (écran C9 de la maquette), puis la
 * fiche de planification en consultation (A3), l'équipe, le risque et ses actions — dont
 * l'efficacité s'évalue ici — et les constats. La planification se corrige sur sa propre page.
 */
@Component({
    selector: 'app-audit-detail',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule, NgPrimeModule, SelectInputComponent, SmartAlertBannerComponent],
    providers: [ConfirmationService],
    templateUrl: './audit-detail.component.html'
})
export class AuditDetailComponent implements OnInit, OnDestroy {

    audit: Audit | null = null;
    constats: ConstatAudit[] = [];
    loading = true;
    loadingConstats = true;
    actionEnCours = false;
    auditId: string | null = null;
    libelles: LibellesAudit = LIBELLES_VIDES;

    avancement: AvancementAudit | null = null;
    private sites: SiteAudit[] = [];
    private checklists: ChecklistAudit[] = [];
    private domaines = new Map<string, string>();

    readonly efficaciteOptions = Object.values(NiveauEfficacite).map(n => ({ label: NIVEAU_EFFICACITE_LABELS[n], value: n }));

    readonly StatutAudit = StatutAudit;
    readonly NiveauRisqueAudit = NiveauRisqueAudit;
    readonly StatutConstat = StatutConstat;
    readonly STATUT_AUDIT_LABELS = STATUT_AUDIT_LABELS;
    readonly STATUT_AUDIT_SEVERITY = STATUT_AUDIT_SEVERITY;
    readonly NIVEAU_RISQUE_LABELS = NIVEAU_RISQUE_LABELS;
    readonly NIVEAU_RISQUE_SEVERITY = NIVEAU_RISQUE_SEVERITY;

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
        this.auditId = this.route.snapshot.paramMap.get('id');
        this.referentiel.libelles().pipe(takeUntil(this.destroy$)).subscribe({
            next: l => (this.libelles = l),
            error: () => undefined // des tirets suffisent : la fiche reste lisible
        });
        this.referentiel.sites().pipe(takeUntil(this.destroy$), catchError(() => of([] as SiteAudit[])))
            .subscribe(s => (this.sites = s));
        this.auditService.getChecklists().pipe(takeUntil(this.destroy$), catchError(() => of(null)))
            .subscribe(res => (this.checklists = contenu<ChecklistAudit>(res)));
        this.auditService.getReferentielRQAPBF().pipe(takeUntil(this.destroy$), catchError(() => of(null)))
            .subscribe(res => this.indexerDomaines(contenu<NoeudReferentiel>(res)));
        if (this.auditId) {
            this.chargerAudit(this.auditId);
            this.chargerConstats(this.auditId);
            this.chargerAvancement(this.auditId);
        }
    }

    chargerAudit(id: string): void {
        this.loading = true;
        this.auditService.findById(id)
            .pipe(
                takeUntil(this.destroy$),
                catchError(err => {
                    this.messageService.add({ severity: 'error', summary: 'Erreur', detail: messageErreur(err, "Impossible de charger l'audit."), life: 8000 });
                    return of(null);
                })
            )
            .subscribe((res: any) => {
                this.audit = res?.data ?? null;
                this.loading = false;
            });
    }

    chargerAvancement(auditId: string): void {
        this.auditService.getAvancement(auditId)
            .pipe(takeUntil(this.destroy$), catchError(() => of(null)))
            .subscribe((res: any) => (this.avancement = res?.data ?? null));
    }

    private indexerDomaines(noeuds: NoeudReferentiel[]): void {
        noeuds.forEach(n => {
            if (n.id) this.domaines.set(n.id, [n.code, n.libelle].filter(Boolean).join(' — '));
            this.indexerDomaines(n.enfants ?? []);
        });
    }

    chargerConstats(auditId: string): void {
        this.loadingConstats = true;
        this.auditService.constatsDeLAudit(auditId)
            .pipe(
                takeUntil(this.destroy$),
                catchError(err => {
                    this.messageService.add({ severity: 'error', summary: 'Erreur', detail: messageErreur(err, 'Les constats n\'ont pas pu être chargés.'), life: 8000 });
                    return of([] as ConstatAudit[]);
                })
            )
            .subscribe(constats => {
                this.constats = constats;
                this.loadingConstats = false;
            });
    }

        // ---- Cycle de vie ----

    confirmationMeta: {
        ton: 'info' | 'success' | 'warn' | 'danger';
        encart?: { titre: string; icone: string; lignes: string[]; ton: 'info' | 'warn' | 'danger' };
    } = { ton: 'info' };

    get confirmationBadgeClasses(): string {
        switch (this.confirmationMeta.ton) {
            case 'success': return 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 ring-emerald-50/50 dark:ring-emerald-950/20';
            case 'warn':    return 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 ring-amber-50/50 dark:ring-amber-950/20';
            case 'danger':  return 'bg-rose-50 dark:bg-rose-950/40 text-rose-500 dark:text-rose-400 ring-rose-50/50 dark:ring-rose-950/20';
            default:        return 'bg-[#0084ca]/10 dark:bg-[#0084ca]/20 text-[#0084ca] dark:text-sky-400 ring-[#0084ca]/10';
        }
    }

    get confirmationEncartClasses(): string {
        switch (this.confirmationMeta.encart?.ton) {
            case 'warn':   return 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200';
            case 'danger': return 'border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200';
            default:       return 'border-[#0084ca]/30 dark:border-sky-700/60 bg-[#0084ca]/5 dark:bg-sky-950/30 text-[var(--heading-color)]';
        }
    }

    get confirmationAcceptClasses(): string {
        switch (this.confirmationMeta.ton) {
            case 'success': return 'p-button-success p-button-sm flex-1 justify-center rounded-[6px]';
            case 'warn':    return 'p-button-warn p-button-sm flex-1 justify-center rounded-[6px]';
            case 'danger':  return 'p-button-danger p-button-sm flex-1 justify-center rounded-[6px]';
            default:        return 'p-button-info p-button-sm flex-1 justify-center rounded-[6px]';
        }
    }

    valider(_event?: Event): void {
        if (!this.auditId) return;
        // Qui sera prévenu se dit avant le geste (observation 14).
        this.auditService.destinataires(this.auditId, 'VALIDATION').pipe(takeUntil(this.destroy$)).subscribe(destinataires =>
            this.confirmerValidation(destinataires));
    }

    private confirmerValidation(destinataires: { nom: string; titre: string }[]): void {
        this.confirmationMeta = {
            ton: 'info',
            encart: destinataires.length
                ? {
                    titre: `Un courriel de notification sera envoyé à (${destinataires.length}) :`,
                    icone: 'pi-envelope',
                    lignes: destinataires.map(d => `${d.nom} — ${d.titre}`),
                    ton: 'info'
                }
                : {
                    titre: 'Aucun destinataire joignable par courriel',
                    icone: 'pi-exclamation-triangle',
                    lignes: ["Ni l'équipe d'audit ni le pilote du processus n'ont d'adresse électronique connue."],
                    ton: 'warn'
                }
        };
        this.confirmationService.confirm({
            key: 'audit-action',
            header: "Valider et notifier l'audit",
            message: `L'audit ${this.audit?.reference ?? ''} passera au statut « En préparation ».`,
            icon: 'pi-check-circle',
            acceptLabel: 'Valider et notifier',
            acceptIcon: 'pi pi-check',
            rejectLabel: 'Retour',
            accept: () => this.executerTransition(() =>
                this.auditService.validerAudit(this.auditId!),
                'Audit validé — préparation en cours.'
            )
        });
    }

    demarrer(_event?: Event): void {
        if (!this.auditId) return;
        const alertes: string[] = [];
        if (this.planNonPartage) {
            alertes.push("Le plan d'audit n'a pas encore été partagé avec l'audité.");
        }
        if (this.demarrageAnticipe) {
            alertes.push(`Date prévue : ${this.formatJour(this.audit!.dateDebutPrevue!)} — la date réelle d'aujourd'hui sera retenue.`);
        }
        this.confirmationMeta = alertes.length
            ? {
                ton: 'warn',
                encart: {
                    titre: 'Points d\'attention avant démarrage',
                    icone: 'pi-exclamation-triangle',
                    lignes: alertes,
                    ton: 'warn'
                }
            }
            : { ton: 'success' };
        this.confirmationService.confirm({
            key: 'audit-action',
            header: alertes.length ? "Démarrer l'audit avec avertissement" : "Démarrer l'audit",
            message: alertes.length
                ? `Souhaitez-vous démarrer l'exécution de l'audit ${this.audit?.reference ?? ''} malgré tout ?`
                : `Confirmer le démarrage de l'exécution de l'audit ${this.audit?.reference ?? ''} ?`,
            icon: alertes.length ? 'pi-exclamation-triangle' : 'pi-play',
            acceptLabel: alertes.length ? 'Démarrer malgré tout' : 'Démarrer',
            acceptIcon: 'pi pi-play',
            rejectLabel: 'Retour',
            accept: () => this.executerTransition(() =>
                this.auditService.demarrerAudit(this.auditId!),
                "L'audit est en cours."
            )
        });
    }

    /** Pour un audit interne, on avertit au démarrage si le plan n'est pas encore partagé (obs. 12). */
    get planNonPartage(): boolean {
        return !!this.audit && !this.audit.circuitExterne && this.avancement?.planPartage !== true;
    }

    /** Démarrer avant la date prévue reste permis, mais se dit (recette du 17 oct. 2026, observation 13). */
    get demarrageAnticipe(): boolean {
        const prevu = this.audit?.dateDebutPrevue;
        return !!prevu && new Date().toISOString().slice(0, 10) < prevu.slice(0, 10);
    }

    private formatJour(iso: string): string {
        const [a, m, j] = iso.slice(0, 10).split('-');
        return `${j}/${m}/${a}`;
    }

    annuler(_event?: Event): void {
        if (!this.auditId) return;
        this.confirmationMeta = {
            ton: 'danger',
            encart: {
                titre: 'Action irréversible',
                icone: 'pi-exclamation-triangle',
                lignes: ["Un audit annulé sort définitivement du programme annuel et ne peut plus être repris."],
                ton: 'danger'
            }
        };
        this.confirmationService.confirm({
            key: 'audit-action',
            header: "Annuler l'audit",
            message: `Confirmer l'annulation de l'audit ${this.audit?.reference ?? ''} ?`,
            icon: 'pi-times-circle',
            acceptLabel: "Annuler l'audit",
            acceptIcon: 'pi pi-times',
            rejectLabel: 'Retour',
            accept: () => this.executerTransition(() => this.auditService.annulerAudit(this.auditId!), "L'audit a été annulé.")
        });
    }

    evaluerEfficacite(action: ActionMaitriseRisque, niveau: NiveauEfficacite): void {
        if (!this.auditId || !action.id || niveau === action.efficacite) return;
        this.auditService.setEfficaciteAction(this.auditId, action.id, niveau)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: res => {
                    this.audit = res?.data ?? this.audit;
                    this.messageService.add({ severity: 'success', summary: 'Succès', detail: 'Efficacité de l\'action enregistrée.' });
                },
                error: err => this.messageService.add({ severity: 'error', summary: 'Erreur', detail: messageErreur(err, "L'efficacité n'a pas pu être enregistrée."), life: 8000 })
            });
    }

    cloturer(_event?: Event): void {
        if (!this.auditId) return;
        this.confirmationMeta = {
            ton: 'info',
            encart: {
                titre: 'Verrouillage définitif',
                icone: 'pi-lock',
                lignes: ["Une fois clôturé, l'audit passe en lecture seule (constats, rapport et signatures figés)."],
                ton: 'info'
            }
        };
        this.confirmationService.confirm({
            key: 'audit-action',
            header: "Terminer et clôturer l'audit",
            message: `Clôturer définitivement l'audit ${this.audit?.reference ?? ''} ?`,
            icon: 'pi-lock',
            acceptLabel: "Clôturer l'audit",
            acceptIcon: 'pi pi-lock',
            rejectLabel: 'Retour',
            accept: () => this.executerTransition(() =>
                this.auditService.cloturerAudit(this.auditId!),
                "L'audit est clôturé."
            )
        });
    }

    /** Pendant une transmission : combien sont partis, sur combien. */
    transmission: { faits: number; total: number } | null = null;

    /**
     * Transmet les écarts en attente, lot par lot : le serveur en traite un par appel et dit ce
     * qui reste. On relance tant qu'il en reste et que le lot précédent a avancé ; un lot qui
     * n'avance plus (module NC indisponible, audit sans processus) arrête et dit pourquoi.
     */
    transmettreEcarts(): void {
        if (!this.auditId) return;
        this.actionEnCours = true;
        this.transmission = { faits: 0, total: this.avancement?.ecartsEnAttente ?? 0 };
        const echecs: string[] = [];
        const passe = () => this.auditService.transmettreEcarts(this.auditId!)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: res => {
                    const bilan = res?.data;
                    const transmis = bilan?.transmis ?? 0;
                    echecs.push(...(bilan?.echecs ?? []));
                    this.transmission!.faits += transmis;
                    if ((bilan?.restants ?? 0) > 0 && transmis > 0) {
                        passe();
                    } else {
                        this.finirTransmission(echecs);
                    }
                },
                error: err => {
                    echecs.push(messageErreur(err, 'La transmission des écarts a échoué.'));
                    this.finirTransmission(echecs);
                }
            });
        passe();
    }

    private finirTransmission(echecs: string[]): void {
        const faits = this.transmission?.faits ?? 0;
        this.messageService.add({
            severity: echecs.length ? 'warn' : 'success',
            summary: 'Transmission des écarts',
            detail: `${faits} non-conformité(s) ouverte(s).` + (echecs.length ? ` Restent en attente : ${echecs.slice(0, 5).join(' ; ')}${echecs.length > 5 ? ` (et ${echecs.length - 5} autres)` : ''}` : ''),
            life: echecs.length ? 12000 : 4000
        });
        this.transmission = null;
        this.actionEnCours = false;
        this.auditService.rafraichirNotifications();
        if (this.auditId) {
            this.chargerConstats(this.auditId);
            this.chargerAvancement(this.auditId);
        }
    }

    private executerTransition(fn: () => any, successMsg: string): void {
        this.actionEnCours = true;
        fn().pipe(tap(() => this.auditService.rafraichirNotifications())).pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (res: any) => {
                    this.audit = res?.data ?? this.audit;
                    if (this.auditId) this.chargerAvancement(this.auditId);
                    this.messageService.add({ severity: 'success', summary: 'Succès', detail: successMsg });
                    this.actionEnCours = false;
                },
                error: (err: unknown) => {
                    // Le serveur dit pourquoi (équipe incomplète, rapport non signé…) : on le montre.
                    this.messageService.add({ severity: 'error', summary: 'Opération refusée', detail: messageErreur(err, "L'opération a échoué."), life: 10000 });
                    this.actionEnCours = false;
                }
            });
    }

    // ---- Rapport ----

    telechargerRapport(): void {
        if (!this.auditId) return;
        this.auditService.telechargerRapportFichier(this.auditId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (blob) => this.sauvegarderBlob(blob, `rapport-audit-${this.audit?.reference ?? this.auditId}.pdf`),
                error: err => this.erreurBlob(err, 'Impossible de télécharger le rapport.')
            });
    }

    exporterPdf(): void {
        if (!this.auditId) return;
        this.auditService.exporterRapport(this.auditId, 'PDF')
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (blob) => this.sauvegarderBlob(blob, `rapport-audit-${this.audit?.reference ?? this.auditId}.pdf`),
                error: err => this.erreurBlob(err, "L'export PDF a échoué.")
            });
    }

    exporterWord(): void {
        if (!this.auditId) return;
        this.auditService.exporterRapport(this.auditId, 'WORD')
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (blob) => this.sauvegarderBlob(blob, `rapport-audit-${this.audit?.reference ?? this.auditId}.docx`),
                error: err => this.erreurBlob(err, "L'export Word a échoué.")
            });
    }

    private sauvegarderBlob(blob: Blob, nom: string): void {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = nom;
        a.click();
        URL.revokeObjectURL(url);
    }

    // ---- Navigation ----

    modifierAudit(): void {
        if (this.auditId) {
            this.router.navigate(['/gestion-audit/programme/edit', this.auditId]);
        }
    }

    retourListe(): void {
        this.router.navigate(['/gestion-audit/programme']);
    }

    // ---- Helpers ----

    /** La planification se corrige tant que l'audit n'a pas démarré. */
    get peutModifier(): boolean {
        return [StatutAudit.PLANIFIE, StatutAudit.EN_PREPARATION, StatutAudit.EN_RETARD].includes(this.audit?.statut as StatutAudit);
    }

    get raisonsCloture(): string {
        return this.avancement?.cloturable === false ? (this.avancement.raisonsDeNePasCloturer ?? []).join(' · ') : '';
    }

    /**
     * Un audit RQAP-BF : il désigne des domaines du référentiel, son type ou ses référentiels le
     * nomment, ou une évaluation y est commencée. La carte « 0/307 critères » s'affichait sur un
     * audit ISO 9001 (observation 12).
     */
    get estRqapbf(): boolean {
        const a = this.audit;
        if (!a) return false;
        const texte = [a.typeAuditLibelle, ...(a.referentiels ?? [])].join(' ');
        return !!a.domaineRqapbfIds?.length || /rqap/i.test(texte) || (this.avancement?.criteresNotes ?? 0) > 0;
    }

    /** Le circuit de l'audit (obs. 12) : Planifié → En préparation → En cours → Rapport → Signé → Clôturé. */
    get frise(): { libelle: string; etat: 'fait' | 'courant' | 'a-venir' }[] {
        const statut = this.audit?.statut === StatutAudit.EN_RETARD ? StatutAudit.EN_PREPARATION : this.audit?.statut ?? '';
        const cloture = statut === StatutAudit.CLOTURE;
        const enCours = statut === StatutAudit.EN_COURS || cloture;
        const rapportRedige = cloture || (enCours && (this.avancement?.cloturable === true || (this.avancement?.constatsPublies ?? 0) > 0));
        const signe = cloture;

        const etapes: { libelle: string; actif: boolean; terminal: boolean }[] = [
            { libelle: 'Planifié',              actif: true,         terminal: false },
            { libelle: 'En préparation',         actif: statut !== StatutAudit.PLANIFIE, terminal: false },
            { libelle: 'En cours',               actif: enCours,      terminal: false },
            { libelle: 'Rapport',                actif: rapportRedige, terminal: false },
            { libelle: 'Signé',                  actif: signe,        terminal: false },
            { libelle: 'Clôturé',               actif: cloture,      terminal: true  }
        ];

        const dernierActif = etapes.reduce((acc, e, i) => e.actif ? i : acc, -1);
        return etapes.map((e, i) => ({
            libelle: e.libelle,
            etat: i < dernierActif ? 'fait' : i === dernierActif ? 'courant' : 'a-venir'
        }));
    }

    get etapeCouranteIndex(): number {
        const idx = this.frise.findIndex(e => e.etat === 'courant');
        return idx >= 0 ? idx + 1 : this.frise.length;
    }

    get etapeCouranteLibelle(): string {
        return this.frise.find(e => e.etat === 'courant')?.libelle ?? this.getStatutLabel(this.audit?.statut ?? '');
    }

    get progressionStrokeOffset(): number {
        const circonference = 144.51;
        const total = this.frise.length || 6;
        return circonference * (1 - this.etapeCouranteIndex / total);
    }

    get friseTooltip(): string {
        return this.frise
            .map(e => `${e.etat === 'fait' ? '✓' : e.etat === 'courant' ? '●' : '○'} ${e.libelle}`)
            .join('  →  ');
    }

    /** Ce qui reste à faire pour avancer, dit en clair plutôt que par des boutons grisés. */
    get etapeSuivante(): string {
        switch (this.audit?.statut) {
            case StatutAudit.PLANIFIE: return 'valider l\'audit et notifier l\'équipe.';
            case StatutAudit.EN_PREPARATION:
            case StatutAudit.EN_RETARD: return 'élaborer et partager le plan d\'audit, puis démarrer l\'audit.';
            case StatutAudit.EN_COURS:
                return this.avancement?.cloturable === false
                    ? 'saisir et publier les constats, rédiger le rapport, le faire signer, puis terminer l\'audit.'
                    : 'terminer l\'audit, puis évaluer l\'équipe.';
            default: return '';
        }
    }

    get libellePlan(): string {
        return ({ BROUILLON: 'Brouillon', VALIDE: 'Validé', PARTAGE: 'Diffusé' } as Record<string, string>)[this.avancement?.statutPlan ?? ''] ?? 'Pas encore élaboré';
    }

    get progressionPlan(): number {
        switch (this.avancement?.statutPlan) {
            case 'PARTAGE': return 100;
            case 'VALIDE': return 67;
            case 'BROUILLON': return 33;
            default: return 0;
        }
    }

    get totalConstatsAvancement(): number {
        return (this.avancement?.constatsPublies ?? 0)
            + (this.avancement?.constatsCompiles ?? 0)
            + (this.avancement?.constatsBrouillon ?? 0);
    }

    get pctConstatsPublies(): number {
        const total = this.totalConstatsAvancement;
        return total > 0 ? Math.round(((this.avancement?.constatsPublies ?? 0) / total) * 100) : 0;
    }

    get pctConstatsCompiles(): number {
        const total = this.totalConstatsAvancement;
        return total > 0 ? Math.round(((this.avancement?.constatsCompiles ?? 0) / total) * 100) : 0;
    }

    get pctConstatsBrouillon(): number {
        const total = this.totalConstatsAvancement;
        return total > 0 ? Math.round(((this.avancement?.constatsBrouillon ?? 0) / total) * 100) : 0;
    }

    get sitesDeLAudit(): string[] {
        return (this.audit?.siteIds ?? []).map(id => this.sites.find(s => s.id === id)?.nom ?? '—');
    }

    get domainesDeLAudit(): string {
        const ids = this.audit?.domaineRqapbfIds ?? [];
        return ids.length ? ids.map(id => this.domaines.get(id) ?? '—').join(', ') : 'Tous les domaines';
    }

    get checklistsDeLAudit(): string {
        return (this.audit?.checklistIds ?? []).map(id => this.checklists.find(c => c.id === id)?.nom ?? '—').join(', ') || '—';
    }

    libelleEfficacite(n?: string): string {
        return NIVEAU_EFFICACITE_LABELS[(n ?? NiveauEfficacite.NON_EVALUEE) as NiveauEfficacite] ?? n ?? '—';
    }

    get peutValider(): boolean {
        return this.audit?.statut === StatutAudit.PLANIFIE;
    }

    get peutDemarrer(): boolean {
        return this.audit?.statut === StatutAudit.EN_PREPARATION;
    }

    /** Seul un audit en cours se clôture : en retard, il n'a jamais démarré, le serveur refuserait. */
    get peutCloturer(): boolean {
        return this.audit?.statut === StatutAudit.EN_COURS;
    }

    get peutAnnuler(): boolean {
        return this.audit?.statut !== StatutAudit.CLOTURE && this.audit?.statut !== StatutAudit.ANNULE;
    }

    /** Dès qu'un écart publié attend son dossier, quel que soit le palier de l'audit. */
    get peutTransmettreEcarts(): boolean {
        return this.audit?.statut !== StatutAudit.ANNULE && (this.avancement?.ecartsEnAttente ?? 0) > 0;
    }

    get libelleTransmission(): string {
        if (this.transmission) {
            return `Transmission… ${this.transmission.faits} / ${this.transmission.total}`;
        }
        return `Transmettre les écarts en attente (${this.avancement?.ecartsEnAttente ?? 0})`;
    }

    getStatutSeverity(statut: string): string {
        return STATUT_AUDIT_SEVERITY[statut as StatutAudit] ?? 'secondary';
    }

    getStatutLabel(statut: string): string {
        return STATUT_AUDIT_LABELS[statut as StatutAudit] ?? statut;
    }

    /** Le corps d'une erreur demandée en blob est un Blob : le relire pour en tirer le message du serveur. */
    private async erreurBlob(err: any, defaut: string): Promise<void> {
        let detail = defaut;
        try {
            detail = JSON.parse(await (err?.error as Blob).text())?.message ?? defaut;
        } catch {
            /* corps illisible : message par défaut */
        }
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail, life: 8000 });
    }

    get nomsEquipe(): string {
        return (this.audit?.membreEquipeIds ?? []).map(id => this.libelles.auditeur(id)).join(', ') || '—';
    }

    getNiveauRisqueLabel(niveau: string): string {
        return NIVEAU_RISQUE_LABELS[niveau as NiveauRisqueAudit] ?? niveau;
    }

    getNiveauRisqueSeverity(niveau: string): string {
        return NIVEAU_RISQUE_SEVERITY[niveau as NiveauRisqueAudit] ?? 'secondary';
    }

    get constatsPublies(): ConstatAudit[] {
        return this.constats.filter(c => c.statut === StatutConstat.PUBLIE);
    }

    get constatsCompiles(): ConstatAudit[] {
        return this.constats.filter(c => c.statut === StatutConstat.COMPILE);
    }

    get constatsBrouillon(): ConstatAudit[] {
        return this.constats.filter(c => c.statut === StatutConstat.BROUILLON);
    }

    get constatsNc(): ConstatAudit[] {
        return this.constats.filter(c => c.nonConformite && c.statut === StatutConstat.PUBLIE);
    }

    get smartAlerts(): SmartAlertItem[] {
        const list: SmartAlertItem[] = [];
        if (this.constatsNc.length > 0) {
            const n = this.constatsNc.length;
            list.push({
                id: 'constats-nc',
                count: n,
                badgeText: 'Non-conformité générée',
                message: `${n} constat${n > 1 ? 's' : ''} publié${n > 1 ? 's' : ''} transmis automatiquement au module Non-conformités (aucune ressaisie requise)`,
                icon: 'pi pi-exclamation-triangle',
                color: 'rose',
                routerLink: '/non-conformite',
                actionLabel: 'Ouvrir NC'
            });
        }
        return list;
    }

    trackByConstatId(_index: number, c: ConstatAudit): string {
        return c.id ?? '';
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }
}
