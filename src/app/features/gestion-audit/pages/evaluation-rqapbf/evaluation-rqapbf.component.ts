import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { NgPrimeModule } from '@prime-ng';
import { Subject } from 'rxjs';
import { takeUntil, catchError, of } from 'rxjs';
import { MessageService } from 'primeng/api';
import { AuditGestionService } from '../../services/audit.service';
import { EvaluationRQAPBF, NoeudReferentiel, NotationCritere } from '../../models/audit.model';
import {
    NiveauNotationRQAPBF,
    NIVEAU_NOTATION_RQAPBF_LABELS,
    NIVEAU_NOTATION_RQAPBF_SEVERITY
} from '../../models/audit-enums';

@Component({
    selector: 'app-evaluation-rqapbf',
    standalone: true,
    imports: [CommonModule, FormsModule, NgPrimeModule],
    providers: [MessageService],
    templateUrl: './evaluation-rqapbf.component.html'
})
export class EvaluationRQAPBFComponent implements OnInit, OnDestroy {

    evaluation: EvaluationRQAPBF | null = null;
    referentiel: NoeudReferentiel[] = [];
    loading = true;
    loadingRef = true;
    saving = false;
    auditId: string | null = null;

    readonly NiveauNotationRQAPBF = NiveauNotationRQAPBF;
    readonly NIVEAU_NOTATION_RQAPBF_LABELS = NIVEAU_NOTATION_RQAPBF_LABELS;
    readonly NIVEAU_NOTATION_RQAPBF_SEVERITY = NIVEAU_NOTATION_RQAPBF_SEVERITY;

    niveauOptions = Object.entries(NIVEAU_NOTATION_RQAPBF_LABELS).map(([value, label]) => ({ value, label }));

    private destroy$ = new Subject<void>();

    constructor(
        private auditService: AuditGestionService,
        private route: ActivatedRoute,
        private messageService: MessageService
    ) {}

    ngOnInit(): void {
        this.auditId = this.route.snapshot.paramMap.get('id');
        this.chargerReferentiel();
        if (this.auditId) this.chargerEvaluation(this.auditId);
    }

    chargerReferentiel(): void {
        this.loadingRef = true;
        this.auditService.getReferentielRQAPBF()
            .pipe(
                takeUntil(this.destroy$),
                catchError(() => of({ data: [] }))
            )
            .subscribe((res: any) => {
                this.referentiel = res?.data ?? [];
                this.loadingRef = false;
            });
    }

    chargerEvaluation(auditId: string): void {
        this.loading = true;
        this.auditService.getEvaluationRQAPBF(auditId)
            .pipe(
                takeUntil(this.destroy$),
                catchError(() => of({ data: null }))
            )
            .subscribe((res: any) => {
                this.evaluation = res?.data ?? null;
                this.loading = false;
            });
    }

    sauvegarderNotations(): void {
        if (!this.evaluation?.id) return;
        this.saving = true;
        const notations: Partial<NotationCritere>[] = this.evaluation.notations ?? [];
        this.auditService.sauvegarderNotations(this.evaluation.id, notations)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (res: any) => {
                    this.evaluation = res?.data ?? this.evaluation;
                    this.messageService.add({ severity: 'success', summary: 'Sauvegardé', detail: 'Notations enregistrées.' });
                    this.saving = false;
                },
                error: () => {
                    this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'La sauvegarde a échoué.' });
                    this.saving = false;
                }
            });
    }

    publier(): void {
        if (!this.evaluation?.id) return;
        this.auditService.publierEvaluationRQAPBF(this.evaluation.id)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (res: any) => {
                    this.evaluation = res?.data ?? this.evaluation;
                    this.messageService.add({ severity: 'success', summary: 'Publiée', detail: 'Évaluation RQAP-BF publiée.' });
                },
                error: () => this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'La publication a échoué.' })
            });
    }

    getNiveauLabel(niveau: string): string {
        return NIVEAU_NOTATION_RQAPBF_LABELS[niveau as NiveauNotationRQAPBF] ?? niveau;
    }

    getNiveauSeverity(niveau: string): string {
        return NIVEAU_NOTATION_RQAPBF_SEVERITY[niveau as NiveauNotationRQAPBF] ?? 'secondary';
    }

    trackByNoeud(_index: number, n: NoeudReferentiel): string {
        return n.id ?? String(_index);
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }
}
