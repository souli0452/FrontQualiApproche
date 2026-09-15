import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
    NgApexchartsModule,
    ApexNonAxisChartSeries,
    ApexChart,
    ApexPlotOptions,
    ApexStroke,
    ApexLegend,
    ApexTitleSubtitle,
    ApexDataLabels,
    ApexTooltip,
    ApexResponsive
} from 'ng-apexcharts';

export interface ChartDonutStatItem {
    label: string;
    value: string | number;
    color?: string;
}

export interface ChartDonutOptions {
    series?: ApexNonAxisChartSeries;
    chart?: ApexChart;
    labels?: string[];
    colors?: string[];
    plotOptions?: ApexPlotOptions;
    stroke?: ApexStroke;
    legend?: ApexLegend;
    title?: ApexTitleSubtitle;
    dataLabels?: ApexDataLabels;
    tooltip?: ApexTooltip;
    responsive?: ApexResponsive[];
}

@Component({
    selector: 'app-chart-donut',
    standalone: true,
    imports: [CommonModule, NgApexchartsModule],
    templateUrl: './chart-donut.component.html',
    styleUrl: './chart-donut.component.scss'
})
export class ChartDonutComponent implements OnInit, OnChanges {
    // Inputs directs
    @Input() title: string = '';
    @Input() subTitle?: string;
    @Input() total?: number;
    @Input() totalLabel: string = 'Total';
    @Input() series: ApexNonAxisChartSeries = [];
    @Input() labels: string[] = [];
    @Input() colors: string[] = [];
    @Input() height: number = 230;
    @Input() chartType: 'donut' | 'pie' | 'radialBar' = 'donut';
    @Input() legendPosition: 'bottom' | 'right' | 'top' | 'left' = 'bottom';
    @Input() showLegend: boolean = true;
    @Input() showCenterTotal: boolean = true;
    @Input() customStats: ChartDonutStatItem[] = [];
    @Input() statsPosition: 'right' | 'bottom' = 'right';

    // Configuration ApexCharts globale (si fournie, prend le pas)
    @Input() chartOptions?: ChartDonutOptions;

    // Options effectives injectées dans <apx-chart>
    effectiveChartOptions: ChartDonutOptions = {};

    ngOnInit(): void {
        this.updateEffectiveOptions();
    }

    ngOnChanges(changes: SimpleChanges): void {
        this.updateEffectiveOptions();
    }

    private updateEffectiveOptions(): void {
        if (this.chartOptions && this.chartOptions.series && this.chartOptions.chart) {
            this.effectiveChartOptions = this.chartOptions;
            return;
        }

        const defaultColors = [
            '#0084ca', // Bleu QualiSira
            '#10b981', // Vert émeraude
            '#bc9551', // Or / Ocre
            '#a855f7', // Violet
            '#06b6d4', // Cyan
            '#f59e0b'  // Ambre
        ];

        const palette = (this.colors && this.colors.length > 0) ? this.colors : defaultColors;
        const currentSeries = this.series || [];
        const currentLabels = this.labels || [];

        this.effectiveChartOptions = {
            series: currentSeries,
            chart: {
                type: this.chartType,
                height: this.height,
                fontFamily: 'inherit',
                animations: {
                    enabled: true,
                    speed: 400
                }
            },
            labels: currentLabels,
            colors: palette,
            plotOptions: {
                pie: {
                    donut: {
                        size: '72%',
                        labels: {
                            show: this.showCenterTotal,
                            name: {
                                show: true,
                                fontSize: '11px',
                                fontWeight: 600,
                                color: '#64748b',
                                offsetY: -5
                            },
                            value: {
                                show: true,
                                fontSize: '20px',
                                fontWeight: 700,
                                color: '#1e293b',
                                offsetY: 5,
                                formatter: (val: string) => val
                            },
                            total: {
                                show: true,
                                label: this.totalLabel,
                                fontSize: '10px',
                                fontWeight: 600,
                                color: '#64748b',
                                formatter: (w: any) => {
                                    if (this.total !== undefined) return this.total.toString();
                                    const sum = w.globals.seriesTotals?.reduce((a: number, b: number) => a + b, 0) || 0;
                                    return sum.toString();
                                }
                            }
                        }
                    }
                }
            },
            stroke: {
                show: true,
                width: 2,
                colors: ['transparent']
            },
            legend: {
                show: this.showLegend,
                position: this.legendPosition,
                horizontalAlign: 'center',
                fontSize: '11px',
                fontWeight: 500,
                labels: {
                    colors: '#64748b'
                },
                itemMargin: {
                    horizontal: 8,
                    vertical: 2
                }
            },
            dataLabels: {
                enabled: false
            },
            tooltip: {
                theme: 'dark',
                y: {
                    formatter: (val: number) => `${val} document(s)`
                }
            },
            responsive: [
                {
                    breakpoint: 640,
                    options: {
                        chart: { height: 200 },
                        legend: { position: 'bottom' }
                    }
                }
            ]
        };
    }
}
