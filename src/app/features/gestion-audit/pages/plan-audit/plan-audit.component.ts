import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { NgPrimeModule } from '@prime-ng';
import { Subject } from 'rxjs';
import { takeUntil, catchError, of } from 'rxjs';
import { MessageService } from 'primeng/api';
import { AuditGestionService } from '../../services/audit.service';
import { PlanAudit, ActivitePlan } from '../../models/audit.model';

@Component({
    selector: 'app-plan-audit',
    standalone: true,
    imports: [CommonModule, FormsModule, NgPrimeModule],
    providers: [MessageService],
    templateUrl: './plan-audit.component.html'
})
export class PlanAuditComponent implements OnInit, OnDestroy {

    plan: PlanAudit | null = null;
    loading = true;
    saving = false;
    auditId: string | null = null;

    private destroy$ = new Subject<void>();

    constructor(
        private auditService: AuditGestionService,
        private route: ActivatedRoute,
        private messageService: MessageService
    ) {}

    ngOnInit(): void {
        this.auditId = this.route.snapshot.paramMap.get('id');
        if (this.auditId) this.chargerPlan(this.auditId);
    }

    chargerPlan(auditId: string): void {
        this.loading = true;
        this.auditService.getPlanAudit(auditId)
            .pipe(
                takeUntil(this.destroy$),
                catchError(() => of({ data: null }))
            )
            .subscribe((res: any) => {
                this.plan = res?.data ?? null;
                this.loading = false;
            });
    }

    sauvegarder(): void {
        if (!this.auditId || !this.plan) return;
        this.saving = true;
        this.auditService.sauvegarderPlanAudit(this.auditId, this.plan)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (res: any) => {
                    this.plan = res?.data ?? this.plan;
                    this.messageService.add({ severity: 'success', summary: 'Sauvegardé', detail: 'Le plan a été mis à jour.' });
                    this.saving = false;
                },
                error: () => {
                    this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'La sauvegarde a échoué.' });
                    this.saving = false;
                }
            });
    }

    partager(): void {
        if (!this.auditId) return;
        this.auditService.partagerPlan(this.auditId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: () => this.messageService.add({ severity: 'success', summary: 'Plan partagé', detail: 'Les auditeurs ont été notifiés.' }),
                error: () => this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Le partage a échoué.' })
            });
    }

    telecharger(): void {
        if (!this.auditId) return;
        this.auditService.telechargerPlan(this.auditId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (blob) => {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `plan-audit-${this.auditId}.pdf`;
                    a.click();
                    URL.revokeObjectURL(url);
                },
                error: () => this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Le téléchargement a échoué.' })
            });
    }

    ajouterActivite(): void {
        if (!this.plan) this.plan = {};
        if (!this.plan.activites) this.plan.activites = [];
        this.plan.activites.push({ libelleActivite: '', auditeur: '' } as ActivitePlan);
    }

    retirerActivite(index: number): void {
        this.plan?.activites?.splice(index, 1);
    }

    trackByIndex(index: number): number {
        return index;
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }
}
