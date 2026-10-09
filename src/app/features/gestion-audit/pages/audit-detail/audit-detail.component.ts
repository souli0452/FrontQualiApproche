import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { NgPrimeModule } from '@prime-ng';
import { Subject } from 'rxjs';
import { takeUntil, catchError, of } from 'rxjs';
import { MessageService } from 'primeng/api';
import { AuditGestionService } from '../../services/audit.service';
import { Audit, ConstatAudit } from '../../models/audit.model';
import {
    StatutAudit,
    TypeAudit,
    NiveauRisqueAudit,
    StatutConstat,
    STATUT_AUDIT_LABELS,
    STATUT_AUDIT_SEVERITY,
    TYPE_AUDIT_LABELS,
    NIVEAU_RISQUE_LABELS,
    NIVEAU_RISQUE_SEVERITY
} from '../../models/audit-enums';

@Component({
    selector: 'app-audit-detail',
    standalone: true,
    imports: [CommonModule, RouterModule, NgPrimeModule],
    providers: [MessageService],
    templateUrl: './audit-detail.component.html'
})
export class AuditDetailComponent implements OnInit, OnDestroy {

    audit: Audit | null = null;
    constats: ConstatAudit[] = [];
    loading = true;
    loadingConstats = true;
    auditId: string | null = null;

    readonly StatutAudit = StatutAudit;
    readonly TypeAudit = TypeAudit;
    readonly NiveauRisqueAudit = NiveauRisqueAudit;
    readonly StatutConstat = StatutConstat;
    readonly STATUT_AUDIT_LABELS = STATUT_AUDIT_LABELS;
    readonly STATUT_AUDIT_SEVERITY = STATUT_AUDIT_SEVERITY;
    readonly TYPE_AUDIT_LABELS = TYPE_AUDIT_LABELS;
    readonly NIVEAU_RISQUE_LABELS = NIVEAU_RISQUE_LABELS;
    readonly NIVEAU_RISQUE_SEVERITY = NIVEAU_RISQUE_SEVERITY;

    private destroy$ = new Subject<void>();

    constructor(
        private auditService: AuditGestionService,
        private route: ActivatedRoute,
        private router: Router,
        private messageService: MessageService
    ) {}

    ngOnInit(): void {
        this.auditId = this.route.snapshot.paramMap.get('id');
        if (this.auditId) {
            this.chargerAudit(this.auditId);
            this.chargerConstats(this.auditId);
        }
    }

    chargerAudit(id: string): void {
        this.loading = true;
        this.auditService.findById(id)
            .pipe(
                takeUntil(this.destroy$),
                catchError(() => {
                    this.messageService.add({ severity: 'error', summary: 'Erreur', detail: "Impossible de charger l'audit." });
                    return of(null);
                })
            )
            .subscribe((res: any) => {
                this.audit = res?.data ?? null;
                this.loading = false;
            });
    }

    chargerConstats(auditId: string): void {
        this.loadingConstats = true;
        this.auditService.getConstats(auditId, undefined, 0, 100)
            .pipe(
                takeUntil(this.destroy$),
                catchError(() => of({ data: { content: [] } }))
            )
            .subscribe((res: any) => {
                this.constats = res?.data?.content ?? [];
                this.loadingConstats = false;
            });
    }

    telechargerRapport(): void {
        if (!this.auditId) return;
        this.auditService.telechargerRapportFichier(this.auditId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (blob) => {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `rapport-audit-${this.audit?.reference ?? this.auditId}.pdf`;
                    a.click();
                    URL.revokeObjectURL(url);
                },
                error: () => {
                    this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de générer le rapport.' });
                }
            });
    }

    modifierAudit(): void {
        if (this.auditId) {
            this.router.navigate(['/gestion-audit/programme/edit', this.auditId]);
        }
    }

    retourListe(): void {
        this.router.navigate(['/gestion-audit/programme']);
    }

    getStatutSeverity(statut: string): string {
        return STATUT_AUDIT_SEVERITY[statut as StatutAudit] ?? 'secondary';
    }

    getStatutLabel(statut: string): string {
        return STATUT_AUDIT_LABELS[statut as StatutAudit] ?? statut;
    }

    getTypeLabel(type: string): string {
        return TYPE_AUDIT_LABELS[type as TypeAudit] ?? type;
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
