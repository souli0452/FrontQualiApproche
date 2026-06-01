import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartModule } from 'primeng/chart';
import { ProgressBarModule } from 'primeng/progressbar';
import { SkeletonModule } from 'primeng/skeleton';

@Component({
    selector: 'app-nc-doughnut-graph',
    standalone: true,
    imports: [CommonModule, ChartModule, ProgressBarModule, SkeletonModule],
    template: `
    <div class="card h-full p-6">

        <div *ngIf="loading">
            <p-skeleton width="60%" height="1.5rem" styleClass="mb-4"></p-skeleton>
            <div class="grid grid-cols-12 gap-4 items-center">
                <div class="col-span-5 flex justify-center">
                    <p-skeleton shape="circle" size="150px"></p-skeleton>
                </div>
                <div class="col-span-7 pl-4">
                    <p-skeleton width="100%" height="1rem" styleClass="mb-3"></p-skeleton>
                    <p-skeleton width="100%" height="1rem" styleClass="mb-3"></p-skeleton>
                    <p-skeleton width="100%" height="1rem"></p-skeleton>
                </div>
            </div>
        </div>
        <div *ngIf="!loading">
            <div class="flex justify-between items-start mb-6">
                <div>
                    <div class="text-xl font-bold text-slate-800">{{ title }}</div>
                    <div class="text-sm text-slate-400">Statuts des non-conformités</div>
                </div>
            </div>

            <div class="grid grid-cols-12 gap-4 items-center">
                <div class="col-span-12 md:col-span-5 relative flex justify-center items-center">
                    <div class="w-full max-w-[200px] relative aspect-square">
                        <p-chart type="doughnut" [data]="chartData" [options]="chartOptions" class="w-full h-full block"></p-chart>
                        <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center pointer-events-none w-full text-center">
                            <div class="text-[10px] text-slate-400 font-bold uppercase mb-0.5">Total</div>
                            <div class="text-3xl font-bold text-slate-800 leading-none" style="margin-top: -2px;">{{ total }}</div>
                        </div>
                    </div>
                </div>

                    <div class="col-span-12 md:col-span-7 pl-4">
                        <div class="flex flex-col gap-4">
                            <div *ngFor="let label of chartData?.labels; let i = index" class="flex justify-between items-center">
                                <div class="flex items-center gap-3">
                                    <span class="w-3 h-3 rounded-full" [style.background-color]="chartData.datasets[0].backgroundColor[i]"></span>
                                    <span class="text-sm font-medium text-slate-600">{{ label }}</span>
                                </div>
                                <span class="text-sm font-bold text-slate-800">{{ chartData.datasets[0].data[i] }}</span>
                            </div>
                            <div class="mt-2 pt-4 border-t border-slate-100">
                                <div class="flex justify-between items-center mb-1">
                                    <span class="text-[10px] font-bold text-slate-400 uppercase">Taux de résolution</span>
                                    <span class="text-xs font-bold text-green-600">{{ resolutionRate }}%</span>
                                </div>
                                <p-progressBar [value]="resolutionRate" [showValue]="false" styleClass="h-1.5"></p-progressBar>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `
})
export class NcDoughnutGraphComponent implements OnChanges {
    @Input() title: string = 'Répartition des NC';
    @Input() ncs: any[] = [];
    @Input() stats: any;
    @Input() loading: boolean = false; 

    chartData: any;
    chartOptions: any;
    total: number = 0;
    resolutionRate: number = 0;

    ngOnChanges(changes: SimpleChanges) {
        if ((changes['ncs'] && this.ncs) || (changes['stats'] && this.stats)) {
            this.updateChart();
        }
    }

    updateChart() {
        let published = 0, inProgress = 0, rejected = 0, closed = 0;

        if (this.stats) {
            published = this.stats.published || 0;
            inProgress = this.stats.inProgress || 0;
            rejected = (this.stats.rejectedByPilot || 0) + (this.stats.rejectedByRq || 0);
            closed = (this.stats.closed || 0) + (this.stats.archived || 0);
            this.total = this.stats.total || (published + inProgress + rejected + closed);
        } else {
            this.total = this.ncs.length;
            published = this.ncs.filter(nc => nc.status === 'PUBLISHED').length;
            inProgress = this.ncs.filter(nc => nc.status === 'IN_PROGRESS').length;
            rejected = this.ncs.filter(nc => ['REJECTED_BY_PILOT', 'REJECTED_BY_RQ'].includes(nc.status)).length;
            closed = this.ncs.filter(nc => ['CLOSED', 'ARCHIVED'].includes(nc.status)).length;
        }
        
        this.resolutionRate = this.total > 0 ? Math.round((closed / this.total) * 100) : 0;

        this.chartData = {
            labels: ['Publiées', 'À traiter', 'Rejetées', 'Clôturées'],
            datasets: [{
                data: [published, inProgress, rejected, closed],
                backgroundColor: [
                    'rgba(212, 175, 55, 0.8)',   // Doré pour Publiées
                    'rgba(100, 149, 197, 0.80)', // Bleu pour À traiter (Imputées)
                    'rgba(239, 68, 68, 0.8)',    // Rouge pour Rejetées
                    'rgba(34, 197, 94, 0.8)'     // Vert pour Clôturées
                ],
                borderWidth: 0
            }]
        };

        this.chartOptions = {
            cutout: '75%',
            maintainAspectRatio: true,
            aspectRatio: 1,
            layout: { padding: 0 },
            plugins: { legend: { display: false } } // On cache la légende car on l'a faite en HTML
        };
    }
}
