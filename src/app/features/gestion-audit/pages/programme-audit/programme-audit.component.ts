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
    TypeAudit,
    STATUT_AUDIT_LABELS,
    STATUT_AUDIT_SEVERITY,
    TYPE_AUDIT_LABELS
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
    searchText = '';
    private searchSubject = new Subject<string>();

    // Options de filtres pour les selects
    statutOptions = Object.values(StatutAudit).map(s => ({
        label: STATUT_AUDIT_LABELS[s],
        value: s
    }));

    typeAuditOptions = Object.values(TypeAudit).map(t => ({
        label: TYPE_AUDIT_LABELS[t],
        value: t
    }));

    readonly STATUT_AUDIT_LABELS = STATUT_AUDIT_LABELS;
    readonly STATUT_AUDIT_SEVERITY = STATUT_AUDIT_SEVERITY;
    readonly TYPE_AUDIT_LABELS = TYPE_AUDIT_LABELS;
    readonly StatutAudit = StatutAudit;
    readonly TypeAudit = TypeAudit;
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
        if (this.filtres.statut) params['statut'] = this.filtres.statut;
        if (this.filtres.typeAudit) params['typeAudit'] = this.filtres.typeAudit;
        if (this.filtres.dateDebut) params['dateDebut'] = this.filtres.dateDebut;
        if (this.filtres.dateFin) params['dateFin'] = this.filtres.dateFin;

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
        this.filtres.statut = statut ?? undefined;
        this.currentPage = 0;
        this.charger();
    }

    onFiltreType(type: TypeAudit | null): void {
        this.filtres.typeAudit = type ?? undefined;
        this.currentPage = 0;
        this.charger();
    }

    reinitialiserFiltres(): void {
        this.filtres = {};
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

    trackByAuditId(_index: number, audit: Audit): string {
        return audit.id ?? '';
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }
}
