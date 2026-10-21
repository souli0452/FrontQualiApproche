import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { NgPrimeModule } from '@prime-ng';
import { Subject, tap } from 'rxjs';
import { takeUntil, catchError, of } from 'rxjs';
import { MessageService, ConfirmationService } from 'primeng/api';
import { SelectInputComponent } from '@shared/ui/select-input/select-input.component';
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
    imports: [CommonModule, FormsModule, RouterModule, NgPrimeModule, SelectInputComponent],
    providers: [MessageService, ConfirmationService],
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

    valider(event: Event): void {
        if (!this.auditId) return;
        const cible = event.currentTarget as EventTarget;
        // Qui sera prévenu se dit avant le geste (observation 14).
        this.auditService.destinataires(this.auditId, 'VALIDATION').pipe(takeUntil(this.destroy$)).subscribe(destinataires =>
            this.confirmerValidation(cible, destinataires));
    }

    private confirmerValidation(cible: EventTarget, destinataires: { nom: string; titre: string }[]): void {
        const qui = destinataires.length
            ? ' Un courriel préviendra : ' + destinataires.map(d => `${d.nom} (${d.titre.toLowerCase()})`).join(', ') + '.'
            : ' Personne ne sera prévenu par courriel : ni l\'équipe ni le pilote n\'ont d\'adresse connue.';
        this.confirmationService.confirm({
            rejectButtonProps: { severity: 'secondary', outlined: true },
            target: cible,
            message: 'Valider cet audit et le passer en préparation ?' + qui,
            icon: 'pi pi-check-circle',
            acceptLabel: 'Valider et notifier',
            rejectLabel: 'Retour',
            accept: () => this.executerTransition(() =>
                this.auditService.validerAudit(this.auditId!),
                'Audit validé — préparation en cours.'
            )
        });
    }

    demarrer(event: Event): void {
        if (!this.auditId) return;
        this.confirmationService.confirm({
            rejectButtonProps: { severity: 'secondary', outlined: true },
            target: event.currentTarget as EventTarget,
            message: this.demarrageAnticipe
                ? `Cet audit est prévu le ${this.formatJour(this.audit!.dateDebutPrevue!)}. Le démarrer dès aujourd'hui ? La date réelle de début sera retenue.`
                : "Démarrer l'exécution de cet audit ?",
            icon: this.demarrageAnticipe ? 'pi pi-exclamation-triangle' : 'pi pi-play',
            acceptLabel: 'Démarrer',
            rejectLabel: 'Retour',
            accept: () => this.executerTransition(() =>
                this.auditService.demarrerAudit(this.auditId!),
                "L'audit est en cours."
            )
        });
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

    annuler(event: Event): void {
        if (!this.auditId) return;
        this.confirmationService.confirm({
            rejectButtonProps: { severity: 'secondary', outlined: true },
            target: event.currentTarget as EventTarget,
            message: "Un audit annulé sort du programme et ne se reprend pas. Confirmer l'annulation ?",
            icon: 'pi pi-times-circle',
            acceptLabel: "Annuler l'audit",
            rejectLabel: 'Retour',
            acceptButtonStyleClass: 'p-button-danger',
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

    cloturer(event: Event): void {
        if (!this.auditId) return;
        this.confirmationService.confirm({
            rejectButtonProps: { severity: 'secondary', outlined: true },
            target: event.currentTarget as EventTarget,
            message: "Clôturer définitivement cet audit ?",
            icon: 'pi pi-lock',
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

    /** Le circuit de l'audit, du point de vue de son statut. */
    get frise(): { libelle: string; etat: 'fait' | 'courant' | 'a-venir' }[] {
        const ordre = ['PLANIFIE', 'EN_PREPARATION', 'EN_COURS', 'CLOTURE'];
        const libelles = ['Planifié', 'Validé · en préparation', 'En cours', 'Clôturé'];
        const statut = this.audit?.statut === StatutAudit.EN_RETARD ? 'EN_PREPARATION' : this.audit?.statut ?? '';
        const i = ordre.indexOf(statut);
        return libelles.map((libelle, k) => ({ libelle, etat: k < i ? 'fait' : k === i ? 'courant' : 'a-venir' }));
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

    trackByConstatId(_index: number, c: ConstatAudit): string {
        return c.id ?? '';
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }
}
