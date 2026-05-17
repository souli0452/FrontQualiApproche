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
                    <p-chart type="doughnut" [data]="chartData" [options]="chartOptions" class="w-full"></p-chart>
                    <div class="absolute text-center">
                            <div class="text-[10px] text-slate-400 font-bold uppercase">Total</div>
                            <div class="text-2xl font-bold text-slate-800">{{ total }}</div>
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
    @Input() loading: boolean = false; 

    chartData: any;
    chartOptions: any;
    total: number = 0;
    resolutionRate: number = 0;

    ngOnChanges(changes: SimpleChanges) {
        if (changes['ncs'] && this.ncs) {
            this.updateChart();
        }
    }

    updateChart() {
        this.total = this.ncs.length;
        const approved = this.ncs.filter(nc => nc.status === 'APPROVED').length;
        const rejected = this.ncs.filter(nc => nc.status === 'REJECTED').length;
        const inProgress = this.total - approved - rejected;
        
        this.resolutionRate = this.total > 0 ? Math.round((approved / this.total) * 100) : 0;

        this.chartData = {
            labels: ['En cours', 'Traités', 'Rejetés'],
            datasets: [{
                data: [inProgress, approved, rejected],
                backgroundColor: ['rgba(100, 149, 197, 0.80)', 'rgba(197, 168, 100, 0.80)', 'rgba(197, 100, 100, 0.80)'],
                borderWidth: 0
            }]
        };

        this.chartOptions = {
            cutout: '60%',
            maintainAspectRatio: false,
            plugins: { legend: { display: false } } // On cache la légende car on l'a faite en HTML
        };
    }
}
