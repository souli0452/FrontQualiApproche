import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgPrimeModule } from '@prime-ng';
import { ChartFilterEvent, BreakdownItem } from './chart-evolution.model';
import {
    NgApexchartsModule,
    ApexAxisChartSeries,
    ApexChart,
    ApexXAxis,
    ApexYAxis,
    ApexPlotOptions,
    ApexTooltip,
    ApexGrid,
    ApexLegend,
    ApexResponsive,
    ApexDataLabels
} from 'ng-apexcharts';

@Component({
    selector: 'app-chart-evolution',
    standalone: true,
    imports: [CommonModule, FormsModule, NgPrimeModule, NgApexchartsModule],
    templateUrl: './chart-evolution.component.html',
    styleUrl: './chart-evolution.component.scss'
})
export class ChartEvolutionComponent implements OnChanges {

    // Inputs de données & configuration
    @Input() title: string = 'Évolution';
    @Input() total: number = 0;
    @Input() pourcentage?: string;
    
    @Input() chartData: any; // { labels: string[], datasets: any[] }
    @Input() chartOptions?: any; // Rétro-compatibilité avec les composants parents
    @Input() structuresList: Array<{ id: string | number; nom: string }> = [];
    @Input() showStructureFilter: boolean = true;
    @Input() bgClass: string = '';
    @Input() breakdownItems: BreakdownItem[] = [];

    // Filtres internes & synchronisés
    @Input() selectedYear: Date = new Date();
    @Input() selectedMonth: Date | null = null;
    @Input() selectedStructure: string | number | null = null;

    // Gestion du sélecteur de période avec Popover
    activePreset: string = 'thisYear';
    tempYear: Date = new Date();
    tempMonth: Date | null = null;

    // Événement émis lors du changement de filtre
    @Output() filterChange = new EventEmitter<ChartFilterEvent>();

    get periodPresets(): Array<{ id: string; label: string; annee: number; mois: number | null }> {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;

        const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonth = lastMonthDate.getMonth() + 1;
        const lastMonthYear = lastMonthDate.getFullYear();

        const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

        return [
            { id: 'thisYear', label: `Cette année (${currentYear})`, annee: currentYear, mois: null },
            { id: 'lastYear', label: `Année ${currentYear - 1}`, annee: currentYear - 1, mois: null },
            { id: 'thisMonth', label: `Ce mois (${monthNames[currentMonth - 1]})`, annee: currentYear, mois: currentMonth },
            { id: 'lastMonth', label: `Mois dernier (${monthNames[lastMonth - 1]})`, annee: lastMonthYear, mois: lastMonth },
        ];
    }

    getFormattedPeriodLabel(): string {
        const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
        const annee = this.selectedYear ? (this.selectedYear instanceof Date ? this.selectedYear.getFullYear() : new Date(this.selectedYear).getFullYear()) : new Date().getFullYear();

        if (this.selectedMonth) {
            const d = this.selectedMonth instanceof Date ? this.selectedMonth : new Date(this.selectedMonth);
            const moisIndex = d.getMonth();
            return `${monthNames[moisIndex]} ${annee}`;
        }
        return `Année ${annee}`;
    }

    openPeriodPanel(panel: any, event: Event): void {
        this.tempYear = this.selectedYear ? (this.selectedYear instanceof Date ? this.selectedYear : new Date(this.selectedYear)) : new Date();
        this.tempMonth = this.selectedMonth ? (this.selectedMonth instanceof Date ? this.selectedMonth : new Date(this.selectedMonth)) : null;
        panel.toggle(event);
    }

    applyPreset(preset: any, panel: any): void {
        this.activePreset = preset.id;
        this.selectedYear = new Date(preset.annee, 0, 1);
        this.selectedMonth = preset.mois ? new Date(preset.annee, preset.mois - 1, 1) : null;
        this.onFilterChange();
        panel.hide();
    }

    applyCustomPeriod(panel: any): void {
        this.activePreset = 'custom';
        if (this.tempYear) {
            this.selectedYear = this.tempYear instanceof Date ? this.tempYear : new Date(this.tempYear);
        }
        this.selectedMonth = this.tempMonth ? (this.tempMonth instanceof Date ? this.tempMonth : new Date(this.tempMonth)) : null;
        this.onFilterChange();
        panel.hide();
    }

    resetToCurrentYear(panel: any): void {
        const now = new Date();
        this.selectedYear = new Date(now.getFullYear(), 0, 1);
        this.selectedMonth = null;
        this.activePreset = 'thisYear';
        this.onFilterChange();
        panel.hide();
    }

    // =========================================================================
    // DIAGNOSTIC QUALITÉ & AIDE À LA DÉCISION (4 PALIERS DYNAMIQUES DE SÉVÉRITÉ)
    // =========================================================================
    /**
     * Calcule automatiquement le statut de risque et les recommandations décisionnelles
     * en fonction de l'indice de sévérité globale (pondération des gravités) :
     * 
     * - Palier 0%      : Aucun incident (Situation vierge / sans NC)
     * - Palier 1-25%   : Faible impact (Vert) -> Traitement de routine au fil de l'eau
     * - Palier 26-50%  : Risque Modéré (Bleu) -> Surveillance des délais de clôture
     * - Palier 51-75%  : Risque Élevé (Orange) -> Actions correctives prioritaires sur les NC critiques
     * - Palier 76-100% : Risque Critique (Rouge) -> Mesures d'endiguement d'urgence & arbitrage requis
     */
    get severiteInfo(): { score: number; label: string; conseil: string; badgeClass: string; dotClass: string } | null {
        if (!this.pourcentage && this.total === 0) {
            return null;
        }

        // 1. Extraction de la valeur numérique (ex: "Sévérité : 58%" -> 58)
        let score = 0;
        if (this.pourcentage) {
            const match = this.pourcentage.match(/\d+/);
            score = match ? parseInt(match[0], 10) : 0;
        }

        // 2. Attribution selon les 4 paliers décisionnels
        if (this.total === 0 || score === 0) {
            return {
                score: 0,
                label: 'Aucun incident • 0%',
                conseil: 'Aucune non-conformité enregistrée sur cette période',
                badgeClass: 'bg-slate-50 dark:bg-surface-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-surface-700',
                dotClass: 'bg-slate-400'
            };
        } else if (score <= 25) {
            // Palier 1 : Faible (0-25%)
            return {
                score,
                label: `Faible impact • ${score}%`,
                conseil: 'Traitement de routine • Aucun risque bloquant',
                badgeClass: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60',
                dotClass: 'bg-emerald-500'
            };
        } else if (score <= 50) {
            // Palier 2 : Modéré (26-50%)
            return {
                score,
                label: `Risque Modéré • ${score}%`,
                conseil: 'Surveillance des délais • Veiller au respect des échéances',
                badgeClass: 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800/60',
                dotClass: 'bg-sky-500'
            };
        } else if (score <= 75) {
            // Palier 3 : Élevé (51-75%)
            return {
                score,
                label: `Risque Élevé • ${score}%`,
                conseil: 'Actions correctives prioritaires sur les NC critiques',
                badgeClass: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60',
                dotClass: 'bg-amber-500'
            };
        } else {
            // Palier 4 : Critique (76-100%)
            return {
                score,
                label: `Risque Critique • ${score}%`,
                conseil: "Mesures d'endiguement d'urgence & arbitrage requis",
                badgeClass: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60',
                dotClass: 'bg-rose-500'
            };
        }
    }

    // Configuration ApexCharts Stacked Column
    public series: ApexAxisChartSeries = [];
    public chart: ApexChart = {
        type: 'bar',
        height: 200,
        stacked: true,
        toolbar: {
            show: true,
            tools: {
                download: true, // Export SVG, PNG, CSV
                selection: false,
                zoom: false,
                zoomin: false,
                zoomout: false,
                pan: false,
                reset: false
            }
        },
        animations: {
            enabled: true,
            speed: 500
        }
    };
    public xaxis: ApexXAxis = { categories: [] };
    public yaxis: ApexYAxis = {
        labels: {
            style: { colors: '#64748b', fontSize: '11px' }
        }
    };
    public colors: string[] = [];
    public plotOptions: ApexPlotOptions = {
        bar: {
            horizontal: false,
            borderRadius: 4,
            borderRadiusApplication: 'end',
            borderRadiusWhenStacked: 'last',
            columnWidth: '40%',
            dataLabels: {
                total: {
                    enabled: true,
                    style: {
                        fontSize: '12px',
                        fontWeight: 700,
                        color: '#475569' // Couleur du chiffre total au-dessus
                    },
                    formatter: (val: string) => {
                        const num = Number(val);
                        return num > 0 ? num.toString() : '';
                    }
                }
            }
        }
    };

    public dataLabels: ApexDataLabels = {
    enabled: true,
    style: {
        fontSize: '11px',
        fontWeight: 600,
        colors: ['#ffffff'] // Chiffres en blanc pour contraster avec la couleur des barres
    },
    // Le formatter permet de masquer les zéros (pour ne pas polluer les mois vides)
    formatter: (val: string | number) => {
        const num = Number(val);
        return num > 0 ? num.toString() : '';
    }
};

    public legend: ApexLegend = { show: false }; // On utilise vos badges de ventilation
    public tooltip: ApexTooltip = {
        shared: true,
        intersect: false,
        theme: 'dark'
    };
    public grid: ApexGrid = {
        borderColor: '#e2e8f0',
        strokeDashArray: 4
    };
    public responsive: ApexResponsive[] = [
        {
            breakpoint: 768,
            options: {
                plotOptions: {
                    bar: { columnWidth: '60%' }
                }
            }
        }
    ];

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['chartData'] && this.chartData) {
            this.updateApexChart();
        }
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

    // Écoute du redimensionnement de l'écran en temps réel
    private lastMonthsCount: number = -1;

    @HostListener('window:resize')
    onResize(): void {
        if (!this.chartData) return;
        const count = this.getMonthsCountForScreen();
        if (count !== this.lastMonthsCount) {
            this.updateApexChart();
        }
    }

    private getMonthsCountForScreen(): number {
        const width = window.innerWidth;
        if (width >= 1300) {
            return 12; // Grand écran Desktop : année complète
        } else if (width >= 640) {
            return 6;  // PC portable & Tablette : 6 mois récents
        } else {
            return 4;  // Mobile : 4 mois récents
        }
    }

    private updateApexChart(): void {
        const datasets = this.chartData?.datasets || [];
        const labels: string[] = this.chartData?.labels || [];
        this.lastMonthsCount = this.getMonthsCountForScreen();

        // Si nous avons la vue annuelle (12 mois)
        if (labels.length === 12) {
            const monthsCount = this.getMonthsCountForScreen();

            if (monthsCount < 12) {
                // Mois cible (mois sélectionné dans le filtre ou mois courant)
                const currentMonthIdx = this.selectedMonth
                    ? (this.selectedMonth instanceof Date ? this.selectedMonth.getMonth() : new Date(this.selectedMonth).getMonth())
                    : new Date().getMonth();

                // Calcul d'une fenêtre de taille monthsCount garantie
                let startIdx = currentMonthIdx - monthsCount + 1;
                let endIdx = currentMonthIdx + 1;

                if (startIdx < 0) {
                    startIdx = 0;
                    endIdx = Math.min(labels.length, monthsCount);
                } else if (endIdx > labels.length) {
                    endIdx = labels.length;
                    startIdx = Math.max(0, labels.length - monthsCount);
                }

                const filteredLabels = labels.slice(startIdx, endIdx);

                this.series = datasets.map((ds: any) => ({
                    name: ds.label || 'Série',
                    data: (ds.data || []).slice(startIdx, endIdx)
                }));

                this.xaxis = {
                    ...this.xaxis,
                    categories: filteredLabels,
                    axisBorder: { show: false },
                    axisTicks: { show: false },
                    labels: {
                        style: { colors: '#64748b', fontSize: '11px', fontWeight: 500 }
                    }
                };
            } else {
                // Vue 12 mois complète (>= 1300px)
                this.series = datasets.map((ds: any) => ({
                    name: ds.label || 'Série',
                    data: ds.data || []
                }));

                this.xaxis = {
                    ...this.xaxis,
                    categories: labels,
                    axisBorder: { show: false },
                    axisTicks: { show: false },
                    labels: {
                        style: { colors: '#64748b', fontSize: '11px', fontWeight: 500 }
                    }
                };
            }
        } else {
            // Autre granularité (ex: jours ou semaines)
            this.series = datasets.map((ds: any) => ({
                name: ds.label || 'Série',
                data: ds.data || []
            }));

            this.xaxis = {
                ...this.xaxis,
                categories: labels,
                axisBorder: { show: false },
                axisTicks: { show: false },
                labels: {
                    style: { colors: '#64748b', fontSize: '11px', fontWeight: 500 }
                }
            };
        }

        // Couleurs des barres
        this.colors = datasets.map((ds: any) => ds.borderColor || ds.backgroundColor || '#3b82f6');
    }
}
