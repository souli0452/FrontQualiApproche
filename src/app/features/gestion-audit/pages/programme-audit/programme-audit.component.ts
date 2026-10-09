import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgPrimeModule } from '@prime-ng';
import { Subject } from 'rxjs';
import { takeUntil, catchError, of, debounceTime, distinctUntilChanged } from 'rxjs';
import { MessageService } from 'primeng/api';
import { AuditGestionService } from '../../services/audit.service';
import { Audit, AuditFiltres } from '../../models/audit.model';
import {
    StatutAudit,
    STATUT_AUDIT_LABELS,
    STATUT_AUDIT_SEVERITY,
    TYPE_AUDIT_LABELS,
    TypeAudit,
    NiveauRisqueAudit,
    NIVEAU_RISQUE_LABELS,
    NIVEAU_RISQUE_SEVERITY
} from '../../models/audit-enums';

@Component({
    selector: 'app-programme-audit',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule, NgPrimeModule],
    providers: [MessageService],
    templateUrl: './programme-audit.component.html'
})
export class ProgrammeAuditComponent implements OnInit, OnDestroy {

    audits: Audit[] = [];
    loading = true;

    // Pagination
    totalElements = 0;
    currentPage = 0;
    pageSize = 10;

    // Filtres
    filtres: AuditFiltres = {};
    filtreStatutSelectionne: StatutAudit | null = null;
    filtreTypeSelectionne: string | null = null;
    searchText = '';
    private searchSubject = new Subject<string>();

    // Options de filtres pour les selects
    statutOptions = Object.values(StatutAudit).map(s => ({
        label: STATUT_AUDIT_LABELS[s],
        value: s
    }));

    // Phase 6 remplacera ces valeurs statiques par un appel API /types-audit
    typeAuditOptions = Object.values(TypeAudit).map(t => ({
        label: TYPE_AUDIT_LABELS[t],
        value: t as string
    }));

    readonly STATUT_AUDIT_LABELS = STATUT_AUDIT_LABELS;
    readonly STATUT_AUDIT_SEVERITY = STATUT_AUDIT_SEVERITY;
    readonly NIVEAU_RISQUE_LABELS = NIVEAU_RISQUE_LABELS;
    readonly NIVEAU_RISQUE_SEVERITY = NIVEAU_RISQUE_SEVERITY;
    readonly StatutAudit = StatutAudit;
    readonly Math = Math;

    private destroy$ = new Subject<void>();

    constructor(
        private auditService: AuditGestionService,
        private router: Router,
        private messageService: MessageService
    ) {}

    ngOnInit(): void {
        this.charger();
        this.searchSubject.pipe(
            debounceTime(350),
            distinctUntilChanged(),
            takeUntil(this.destroy$)
        ).subscribe(term => {
            this.filtres.search = term || undefined;
            this.currentPage = 0;
            this.charger();
        });
    }

    charger(): void {
        this.loading = true;
        const params: Record<string, any> = {};
        if (this.filtres.search) params['search'] = this.filtres.search;
        if (this.filtres.statuts?.length) params['statuts'] = this.filtres.statuts.join(',');
        if (this.filtres.typeAuditId) params['typeAuditId'] = this.filtres.typeAuditId;
        if (this.filtres.niveauRisque) params['niveauRisque'] = this.filtres.niveauRisque;
        if (this.filtres.responsableId) params['responsableId'] = this.filtres.responsableId;
        if (this.filtres.enRetard !== undefined) params['enRetard'] = this.filtres.enRetard;
        if (this.filtres.annee) params['annee'] = this.filtres.annee;

        this.auditService.findAll(this.currentPage, this.pageSize, params)
            .pipe(
                takeUntil(this.destroy$),
                catchError(() => {
                    this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les audits.' });
                    return of({ data: { content: [], totalElements: 0 } });
                })
            )
            .subscribe((res: any) => {
                this.audits = res?.data?.content ?? [];
                this.totalElements = res?.data?.totalElements ?? 0;
                this.loading = false;
            });
    }

    onSearch(term: string): void {
        this.searchSubject.next(term);
    }

    onFiltreStatut(statut: StatutAudit | null): void {
        this.filtres.statuts = statut ? [statut] : undefined;
        this.currentPage = 0;
        this.charger();
    }

    onFiltreType(typeId: string | null): void {
        this.filtres.typeAuditId = typeId ?? undefined;
        this.currentPage = 0;
        this.charger();
    }

    reinitialiserFiltres(): void {
        this.filtres = {};
        this.filtreStatutSelectionne = null;
        this.filtreTypeSelectionne = null;
        this.searchText = '';
        this.currentPage = 0;
        this.charger();
    }

    onPageChange(event: any): void {
        this.currentPage = event.page ?? 0;
        this.pageSize = event.rows ?? 10;
        this.charger();
    }

    ouvrirDetail(audit: Audit): void {
        if (audit.id) {
            this.router.navigate(['/gestion-audit/programme', audit.id]);
        }
    }

    creerAudit(): void {
        this.router.navigate(['/gestion-audit/programme/create']);
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

    getNiveauRisqueSeverity(niveau: string): string {
        return NIVEAU_RISQUE_SEVERITY[niveau as NiveauRisqueAudit] ?? 'secondary';
    }

    trackByAuditId(_index: number, audit: Audit): string {
        return audit.id ?? '';
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }
}
