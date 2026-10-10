import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { NgPrimeModule } from '@prime-ng';
import { Observable, Subject, forkJoin, takeUntil } from 'rxjs';
import { MessageService } from 'primeng/api';
import { AuditGestionService, messageErreur } from '../../services/audit.service';
import { AuditReferentielService, LIBELLES_VIDES, LibellesAudit } from '../../services/audit-referentiel.service';
import { RapportAudit } from '../../models/audit.model';

/**
 * Le rapport d'audit (D14), ou son dépôt pour un audit externe (D14X).
 *
 * <p>Rapport interne : le serveur le compose des constats publiés, de la dernière évaluation
 * RQAP-BF validée et du circuit de signature ; seules les conclusions et recommandations se
 * rédigent ici, pendant l'audit et tant qu'aucun visa n'est donné. Audit externe : le rapport
 * est rédigé par l'organisme, on le charge, et il ne passe pas par le circuit interne.</p>
 */
@Component({
    selector: 'app-rapport-audit',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule, NgPrimeModule],
    providers: [MessageService],
    templateUrl: './rapport-audit.component.html'
})
export class RapportAuditComponent implements OnInit, OnDestroy {

    rapport: RapportAudit | null = null;
    libelles: LibellesAudit = LIBELLES_VIDES;
    loading = true;
    saving = false;
    chargement = false;
    auditId: string | null = null;

    /** Pour un audit externe : le plan reçu est-il déjà chargé ? (D14X le rappelle sinon.) */
    planCharge = true;

    conclusions = '';
    recommandations = '';
    modifie = false;

    private destroy$ = new Subject<void>();

    constructor(
        private auditService: AuditGestionService,
        private referentiel: AuditReferentielService,
        private route: ActivatedRoute,
        private messageService: MessageService
    ) {}

    ngOnInit(): void {
        this.auditId = this.route.snapshot.paramMap.get('id');
        this.referentiel.libelles().pipe(takeUntil(this.destroy$)).subscribe({ next: l => (this.libelles = l), error: () => undefined });
        if (this.auditId) this.charger(this.auditId);
    }

    charger(auditId: string): void {
        this.loading = true;
        this.auditService.getRapport(auditId).pipe(takeUntil(this.destroy$)).subscribe({
            next: res => {
                this.rapport = (res as any)?.data ?? res;
                this.conclusions = this.rapport?.audit?.conclusionsRapport ?? '';
                this.recommandations = this.rapport?.audit?.recommandationsRapport ?? '';
                this.modifie = false;
                this.loading = false;
                if (this.externe && !this.audit?.rapportCharge) {
                    this.verifierPlan(auditId);
                }
            },
            error: err => {
                this.loading = false;
                this.erreur(err, 'Le rapport n\'a pas pu être chargé.');
            }
        });
    }

    private verifierPlan(auditId: string): void {
        this.auditService.getPlanAudit(auditId).pipe(takeUntil(this.destroy$)).subscribe({
            next: res => (this.planCharge = !!(res as any)?.data?.fichierCharge),
            // Pas de plan (404) : il n'a pas été chargé.
            error: () => (this.planCharge = false)
        });
    }

    get audit() {
        return this.rapport?.audit;
    }

    get externe(): boolean {
        return !!this.audit?.circuitExterne;
    }

    get visaDonne(): boolean {
        return (this.rapport?.signatures ?? []).some(s => s.statut === 'SIGNEE');
    }

    /** Conclusions et recommandations se rédigent pendant l'audit, avant le premier visa. */
    get redactionOuverte(): boolean {
        return this.audit?.statut === 'EN_COURS' && !this.visaDonne;
    }

    get nomsEquipe(): string {
        return (this.audit?.membreEquipeIds ?? []).map(id => this.libelles.auditeur(id)).join(', ') || '—';
    }

    maxSynthese(): number {
        return Math.max(1, ...(this.rapport?.syntheseParNature ?? []).map(g => g.nombre ?? 0));
    }

    domaines(): { domaine: string; score: number }[] {
        return Object.entries(this.rapport?.resultatsRqapbfParDomaine ?? {}).map(([domaine, score]) => ({ domaine, score }));
    }

    enregistrer(): void {
        if (!this.auditId) return;
        this.saving = true;
        this.auditService.sauvegarderConclusions(this.auditId, { conclusions: this.conclusions, recommandations: this.recommandations })
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: () => {
                    this.saving = false;
                    this.modifie = false;
                    this.messageService.add({ severity: 'success', summary: 'Enregistré', detail: 'Conclusions et recommandations enregistrées.' });
                },
                error: err => {
                    this.saving = false;
                    this.erreur(err, 'L\'enregistrement a échoué.');
                }
            });
    }

    exporter(format: 'PDF' | 'WORD'): void {
        if (!this.auditId) return;
        if (this.modifie) {
            this.messageService.add({ severity: 'warn', summary: 'Rédaction non enregistrée', detail: 'Enregistrez d\'abord vos conclusions : l\'export reprend la version enregistrée.' });
            return;
        }
        this.telecharger(this.auditService.exporterRapport(this.auditId, format),
            `rapport-${this.audit?.reference ?? this.auditId}.${format === 'PDF' ? 'pdf' : 'docx'}`);
    }

    telechargerFichier(): void {
        if (!this.auditId) return;
        this.telecharger(this.auditService.telechargerRapportFichier(this.auditId), `rapport-${this.audit?.reference ?? this.auditId}`);
    }

    deposer(evenement: Event): void {
        const fichier = (evenement.target as HTMLInputElement).files?.[0];
        (evenement.target as HTMLInputElement).value = '';
        if (!fichier || !this.auditId) return;
        this.chargement = true;
        this.auditService.uploadRapport(this.auditId, fichier).pipe(takeUntil(this.destroy$)).subscribe({
            next: () => {
                this.chargement = false;
                this.messageService.add({ severity: 'success', summary: 'Rapport chargé', detail: `« ${fichier.name} » est le rapport de l'audit.` });
                this.charger(this.auditId!);
            },
            error: err => {
                this.chargement = false;
                this.erreur(err, 'Le chargement a échoué.');
            }
        });
    }

    private telecharger(appel$: Observable<Blob>, nom: string): void {
        appel$.pipe(takeUntil(this.destroy$)).subscribe({
            next: blob => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = nom;
                a.click();
                URL.revokeObjectURL(url);
            },
            error: async err => {
                let detail = 'Le téléchargement a échoué.';
                try {
                    detail = JSON.parse(await (err?.error as Blob).text())?.message ?? detail;
                } catch {
                    /* corps illisible */
                }
                this.messageService.add({ severity: 'error', summary: 'Erreur', detail, life: 8000 });
            }
        });
    }

    libelleSignature(statut?: string): string {
        return ({ EN_ATTENTE: 'En attente', SIGNEE: 'Signé', REFUSEE: 'Refusé' } as Record<string, string>)[statut ?? ''] ?? '—';
    }

    severiteSignature(statut?: string): any {
        return ({ EN_ATTENTE: 'warn', SIGNEE: 'success', REFUSEE: 'danger' } as Record<string, string>)[statut ?? ''] ?? 'secondary';
    }

    private erreur(err: unknown, defaut: string): void {
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: messageErreur(err, defaut), life: 8000 });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }
}
