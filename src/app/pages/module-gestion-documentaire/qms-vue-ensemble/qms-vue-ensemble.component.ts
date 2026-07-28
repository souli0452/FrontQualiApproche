import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, forkJoin, takeUntil } from 'rxjs';
import { NgPrimeModule } from '../../../../prime-ng.module';
import { DocStatsCardComponent } from '../../../components/gestion-documentaire/doc-stats-card/doc-stats-card.component';
import { QmsDocumentService } from '../../../services/module-gestion-documentaire/qms-document.service';
import { DocumentStatsDto } from '../../../models/gestion-documentaire.model';

interface DimensionEntry {
    label: string;
    count: number;
}

@Component({
    selector: 'app-qms-vue-ensemble',
    standalone: true,
    imports: [CommonModule, NgPrimeModule, DocStatsCardComponent],
    templateUrl: './qms-vue-ensemble.component.html',
    styleUrl: './qms-vue-ensemble.component.scss'
})
export class QmsVueEnsembleComponent implements OnInit, OnDestroy {
    loading = true;
    stats: DocumentStatsDto | null = null;

    countByStatus: DimensionEntry[] = [];
    countByDocumentType: DimensionEntry[] = [];

    private destroy$ = new Subject<void>();

    constructor(private qmsService: QmsDocumentService) {}

    ngOnInit(): void {
        this.loadStats();
    }

    loadStats(): void {
        this.loading = true;
        forkJoin({
            stats: this.qmsService.getDocumentStats(),
            byStatus: this.qmsService.getDocumentStatsByDimension('STATUT'),
            byType: this.qmsService.getDocumentStatsByDimension('DOCUMENT_TYPE')
        })
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: ({ stats, byStatus, byType }) => {
                    this.stats = (stats as any)?.data ?? stats;
                    this.countByStatus = this.toEntries(byStatus);
                    this.countByDocumentType = this.toEntries(byType);
                    this.loading = false;
                },
                error: () => {
                    this.loading = false;
                }
            });
    }

    private toEntries(input: any): DimensionEntry[] {
        const map = input?.data ?? input;
        if (!map || typeof map !== 'object') return [];
        return Object.entries(map)
            .map(([label, count]) => ({ label, count: Number(count) || 0 }))
            .sort((a, b) => b.count - a.count);
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }
}
