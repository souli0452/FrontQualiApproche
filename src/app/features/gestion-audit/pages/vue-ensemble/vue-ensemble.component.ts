import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NgPrimeModule } from '@prime-ng';
import { Subject } from 'rxjs';
import { takeUntil, catchError, of } from 'rxjs';
import { KpiCardComponent } from '@shared/kpi-card/kpi-card.component';
import { AuditGestionService } from '../../services/audit.service';
import { AuditStats, Audit } from '../../models/audit.model';
import {
    StatutAudit,
    STATUT_AUDIT_LABELS,
    STATUT_AUDIT_SEVERITY,
    TYPE_AUDIT_LABELS,
    TypeAudit
} from '../../models/audit-enums';

interface AuditKpiCard {
    label: string;
    value: number;
    icon: string;
    color: string;
    description: string;
}

@Component({
    selector: 'app-audit-vue-ensemble',
    standalone: true,
    imports: [CommonModule, RouterModule, NgPrimeModule, KpiCardComponent],
    templateUrl: './vue-ensemble.component.html'
})
export class AuditVueEnsembleComponent implements OnInit, OnDestroy {

    loading = true;
    stats: AuditStats = {};
    auditsRecents: Audit[] = [];
    loadingAudits = true;

    kpiCards: AuditKpiCard[] = [];

    readonly StatutAudit = StatutAudit;
    readonly STATUT_AUDIT_LABELS = STATUT_AUDIT_LABELS;
    readonly STATUT_AUDIT_SEVERITY = STATUT_AUDIT_SEVERITY;
    readonly TYPE_AUDIT_LABELS = TYPE_AUDIT_LABELS;
    readonly TypeAudit = TypeAudit;

    private destroy$ = new Subject<void>();

    constructor(private auditService: AuditGestionService) {}

    ngOnInit(): void {
        this.chargerStats();
        this.chargerAuditsRecents();
    }

    chargerStats(): void {
        this.loading = true;
        this.auditService.getDashboardStats()
            .pipe(
                takeUntil(this.destroy$),
                catchError(() => of({ data: {} as AuditStats }))
            )
            .subscribe((res: any) => {
                this.stats = res?.data ?? {};
                this.construireKpis();
                this.loading = false;
            });
    }

    chargerAuditsRecents(): void {
        this.loadingAudits = true;
        this.auditService.findAll(0, 5)
            .pipe(
                takeUntil(this.destroy$),
                catchError(() => of({ data: { content: [] } }))
            )
            .subscribe((res: any) => {
                this.auditsRecents = res?.data?.content ?? [];
                this.loadingAudits = false;
            });
    }

    construireKpis(): void {
        this.kpiCards = [
            {
                label: 'Total',
                value: this.stats.total ?? 0,
                icon: 'pi pi-clipboard',
                color: 'blue',
                description: 'Tous les audits'
            },
            {
                label: 'Planifiés',
                value: (this.stats.planifies ?? 0) + (this.stats.enPreparation ?? 0),
                icon: 'pi pi-calendar',
                color: 'purple',
                description: 'À venir ou en préparation'
            },
            {
                label: 'En cours',
                value: this.stats.enCours ?? 0,
                icon: 'pi pi-spinner',
                color: 'orange',
                description: 'Déroulement actif'
            },
            {
                label: 'Clôturés',
                value: this.stats.clotures ?? 0,
                icon: 'pi pi-check-circle',
                color: 'green',
                description: `Taux : ${this.stats.tauxCloture ?? 0}%`
            },
            {
                label: 'En retard',
                value: this.stats.enRetard ?? 0,
                icon: 'pi pi-exclamation-circle',
                color: 'red',
                description: 'Dépassement de délai'
            }
        ];
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

    trackByAuditId(_index: number, audit: Audit): string {
        return audit.id ?? '';
    }

    trackByKpi(_index: number, kpi: AuditKpiCard): string {
        return kpi.label;
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }
}
