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
        this.confirmationService.confirm({
            target: event.currentTarget as EventTarget,
            message: "Valider cet audit et le passer en préparation ?",
            icon: 'pi pi-check-circle',
            accept: () => this.executerTransition(() =>
                this.auditService.validerAudit(this.auditId!),
                'Audit validé — préparation en cours.'
            )
        });
    }

    demarrer(event: Event): void {
        if (!this.auditId) return;
        this.confirmationService.confirm({
            target: event.currentTarget as EventTarget,
            message: "Démarrer l'exécution de cet audit ?",
            icon: 'pi pi-play',
            accept: () => this.executerTransition(() =>
                this.auditService.demarrerAudit(this.auditId!),
                "L'audit est en cours."
            )
        });
    }

    annuler(event: Event): void {
        if (!this.auditId) return;
        this.confirmationService.confirm({
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
            target: event.currentTarget as EventTarget,
            message: "Clôturer définitivement cet audit ?",
            icon: 'pi pi-lock',
            accept: () => this.executerTransition(() =>
                this.auditService.cloturerAudit(this.auditId!),
                "L'audit est clôturé."
            )
        });
    }

    transmettreEcarts(): void {
        if (!this.auditId) return;
        this.actionEnCours = true;
        this.auditService.transmettreEcarts(this.auditId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: res => {
                    const bilan = res?.data;
                    const echecs = bilan?.echecs ?? [];
                    this.messageService.add({
                        severity: echecs.length ? 'warn' : 'success',
                        summary: 'Transmission des écarts',
                        detail: `${bilan?.transmis ?? 0} non-conformité(s) ouverte(s).` + (echecs.length ? ` Échecs : ${echecs.join(' ; ')}` : ''),
                        life: echecs.length ? 10000 : 4000
                    });
                    this.actionEnCours = false;
                    if (this.auditId) this.chargerConstats(this.auditId);
                },
                error: err => {
                    this.messageService.add({ severity: 'error', summary: 'Erreur', detail: messageErreur(err, 'La transmission des écarts a échoué.'), life: 8000 });
                    this.actionEnCours = false;
                }
            });
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

    get peutTransmettreEcarts(): boolean {
        return (this.audit?.statut === StatutAudit.CLOTURE) && this.constatsPublies.length > 0;
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
