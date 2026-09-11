import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgPrimeModule } from '@prime-ng';
import { ChartFilterEvent, BreakdownItem } from './chart-evolution.model';

@Component({
    selector: 'app-chart-evolution',
    standalone: true,
    imports: [CommonModule, FormsModule, NgPrimeModule],
    templateUrl: './chart-evolution.component.html',
    styleUrl: './chart-evolution.component.scss'
})
export class ChartEvolutionComponent implements OnInit {

    // Inputs de données & configuration
    @Input() title: string = 'Évolution';
    @Input() total: number = 0;
    @Input() pourcentage?: string;
    
    @Input() chartData: any;
    @Input() chartOptions: any;

    @Input() structuresList: Array<{ id: string | number; nom: string }> = [];
    @Input() showStructureFilter: boolean = true;
    @Input() bgClass: string = ''; // Classe de fond supplémentaire si besoin

    @Input() breakdownItems: BreakdownItem[] = [];

    // Filtres internes & synchronisés
    @Input() selectedYear: Date = new Date();
    @Input() selectedMonth: Date | null = null;
    @Input() selectedStructure: string | number | null = null;

    // Événement émis lors du changement de filtre
    @Output() filterChange = new EventEmitter<ChartFilterEvent>();

    ngOnInit(): void {
        this.initDefaultChartOptions();
    }

    onFilterChange(): void {
        let annee = new Date().getFullYear();
        if (this.selectedYear) {
            const d = this.selectedYear instanceof Date ? this.selectedYear : new Date(this.selectedYear);
            if (!isNaN(d.getTime())) {
                annee = d.getFullYear();
            }
        }

        let mois: number | undefined = undefined;
        if (this.selectedMonth) {
            const d = this.selectedMonth instanceof Date ? this.selectedMonth : new Date(this.selectedMonth);
            if (!isNaN(d.getTime())) {
                mois = d.getMonth() + 1;
            }
        }

        const structureId = this.selectedStructure ? String(this.selectedStructure) : undefined;

        this.filterChange.emit({ annee, mois, structureId });
    }

    private initDefaultChartOptions(): void {
        if (!this.chartOptions) {
            this.chartOptions = {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#1e293b',
                        titleColor: '#f8fafc',
                        bodyColor: '#f8fafc',
                        padding: 10,
                        cornerRadius: 8,
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: {
                    x: {
                        stacked: true,
                        grid: { display: true, color: 'rgba(226, 232, 240, 0.7)', borderDash: [4, 4], drawBorder: false },
                        ticks: { color: '#64748b', font: { size: 11, weight: '500' } }
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        grid: { color: 'rgba(226, 232, 240, 0.7)', drawBorder: false, borderDash: [4, 4] },
                        ticks: { color: '#64748b', font: { size: 11 } }
                    }
                }
            };
        }
    }
}
