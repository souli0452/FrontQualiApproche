import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartModule } from 'primeng/chart';
import { isUserInRoles } from '../../../../utils';
import { SkeletonModule } from 'primeng/skeleton';

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
            <div>
                <p-chart type="bar" [data]="chartData" [options]="chartOptions" class="w-full"></p-chart>
            </div>
        </ng-container>
    </div>
    `
})
export class NcStackedBarGraphComponent implements OnChanges {
    @Input() title: string = 'Analyse par Gravité';
    @Input() loading: boolean = false; 
    @Input() ncs: any[] = [];

    chartData: any;
    chartOptions: any;

    protected readonly isUserInRoles = isUserInRoles;

    ngOnChanges(changes: SimpleChanges) {
        if (changes['ncs'] && this.ncs) {
            this.updateChart();
        }
    }

    updateChart() {
        const documentStyle = getComputedStyle(document.documentElement);
        const textColor = documentStyle.getPropertyValue('--p-text-color');
        const surfaceBorder = documentStyle.getPropertyValue('--p-content-border-color');

        const labels = ['En attente', 'En cours', 'Clôturées'];
        const countsCritique = [0, 0, 0];
        const countsMajeure = [0, 0, 0];
        const countsMineure = [0, 0, 0];

        this.ncs.forEach(nc => {
            // 1. On détermine l'index (En attente, En cours, Clôturé)
            let idx = nc.status === 'VALIDATION_RS' ? 0 : (nc.status === 'APPROVED' ? 2 : 1);
            
            // 2. On utilise le bon champ et on passe en minuscule pour éviter les surprises
            const g = nc.niveauNonConformiteLibelle?.toLowerCase(); 
            if (g === 'critique') {
                countsCritique[idx]++;
            } else if (g === 'majeur' || g === 'majeure') {
                countsMajeure[idx]++;
            } else if (g === 'mineur' || g === 'mineure') {
                countsMineure[idx]++;
            }
        });

        this.chartData = {
            labels: labels,
            datasets: [
                {
                    label: 'Critique',
                    backgroundColor: 'rgba(197, 100, 100, 0.85)',
                    data: countsCritique,
                    borderRadius: 4
                },
                {
                    label: 'Majeure',
                    backgroundColor: 'rgba(197, 168, 100, 0.85)',
                    data: countsMajeure,
                    borderRadius: 4
                },
                {
                    label: 'Mineure',
                    backgroundColor: 'rgba(100, 149, 197, 0.85)',
                    data: countsMineure,
                    borderRadius: 4
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
