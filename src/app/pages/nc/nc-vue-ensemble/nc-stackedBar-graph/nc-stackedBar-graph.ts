import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartModule } from 'primeng/chart';
import { SkeletonModule } from 'primeng/skeleton';
import { isUserInRoles } from '../../../../utils';

@Component({
    selector: 'app-nc-stacked-bar-graph',
    standalone: true,
    imports: [CommonModule, ChartModule, SkeletonModule],
    template: `
    <div class="card h-full p-6">
            <div *ngIf="loading">
            <p-skeleton width="60%" height="1.5rem" styleClass="mb-4"></p-skeleton>
            <p-skeleton width="100%" height="12rem"></p-skeleton>
        </div>
        <ng-container *ngIf="!loading">
            <!-- Header harmonisé avec le Donut -->
            <div class="flex justify-between items-start mb-6">
                <div>
                    <div class="text-xl font-bold text-slate-800">
                        <span *ngIf="isUserInRoles(['SUPER_ADMIN'])">Non conformité par processus</span>
                        <span *ngIf="!isUserInRoles(['SUPER_ADMIN'])">Analyse par Gravité</span>
                    </div>
                    <div class="text-sm text-slate-400">
                        <span *ngIf="isUserInRoles(['SUPER_ADMIN'])">Répartition par entité</span>
                        <span *ngIf="!isUserInRoles(['SUPER_ADMIN'])">Répartition par niveau de risque</span>
                    </div>
                </div>
            </div>
            <!-- Le graphique -->
            <div class="w-full h-[250px]">
                <p-chart type="bar" [data]="chartData" [options]="chartOptions" class="w-full h-full block"></p-chart>
            </div>
        </ng-container>
    </div>
    `
})
export class NcStackedBarGraphComponent implements OnChanges {
    @Input() title: string = 'Analyse par Gravité';
    @Input() loading: boolean = false; 
    @Input() dashboardData: any;

    chartData: any;
    chartOptions: any;

    protected readonly isUserInRoles = isUserInRoles;

    ngOnChanges(changes: SimpleChanges) {
        if (changes['dashboardData'] && this.dashboardData) {
            this.updateChart();
        }
    }

    updateChart() {
        if (!this.dashboardData || !this.dashboardData.statsByStatusAndGravity) return;

        const documentStyle = getComputedStyle(document.documentElement);
        const textColor = documentStyle.getPropertyValue('--p-text-color');
        const surfaceBorder = documentStyle.getPropertyValue('--p-content-border-color');

        const gravityData = this.dashboardData.statsByStatusAndGravity;
        
        // Traduction des statuts pour l'affichage
        const statusMap: { [key: string]: string } = {
            'DRAFT': 'Brouillon',
            'PUBLISHED': 'Publiées',
            'PENDING_PILOT': 'Attente Pilote',
            'IN_PROGRESS': 'À traiter',
            'REJECTED_BY_PILOT': 'Rejet Pilote',
            'REJECTED_BY_RQ': 'Rejet RQ',
            'CLOSED': 'Clôturées',
            'ARCHIVED': 'Archivées'
        };

        const rawLabels = Object.keys(gravityData);
        const labels = rawLabels.map(k => statusMap[k] || k);
        
        const countsCritique: number[] = [];
        const countsMajeure: number[] = [];
        const countsMineure: number[] = [];

        rawLabels.forEach(status => {
            const gravities = gravityData[status];
            let crit = 0, maj = 0, min = 0;
            
            for (const [g, count] of Object.entries(gravities)) {
                const lowerG = g.toLowerCase();
                if (lowerG.includes('critique')) crit += (count as number);
                else if (lowerG.includes('majeur')) maj += (count as number);
                else if (lowerG.includes('mineur')) min += (count as number);
            }
            
            countsCritique.push(crit);
            countsMajeure.push(maj);
            countsMineure.push(min);
        });

        this.chartData = {
            labels: labels,
            datasets: [
                {
                    label: 'Critique',
                    backgroundColor: 'rgba(197, 100, 100, 0.85)',
                    data: countsCritique,
                    borderRadius: 4,
                    maxBarThickness: 32
                },
                {
                    label: 'Majeure',
                    backgroundColor: 'rgba(197, 168, 100, 0.85)',
                    data: countsMajeure,
                    borderRadius: 4,
                    maxBarThickness: 32
                },
                {
                    label: 'Mineure',
                    backgroundColor: 'rgba(100, 149, 197, 0.85)',
                    data: countsMineure,
                    borderRadius: 4,
                    maxBarThickness: 32
                }
            ]
        };

        this.chartOptions = {
            indexAxis: 'y',
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: textColor, usePointStyle: true }
                }
            },
            scales: {
                x: {
                    stacked: true,
                    grid: { color: surfaceBorder, drawBorder: false },
                    ticks: { color: textColor }
                },
                y: {
                    stacked: true,
                    grid: { display: false },
                    ticks: { color: textColor }
                }
            }
        };
    }
}
