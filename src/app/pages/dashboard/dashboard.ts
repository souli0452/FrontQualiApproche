import { AfterViewInit, ChangeDetectorRef, Component, inject, PLATFORM_ID } from '@angular/core';
import { NotificationsWidget } from './components/notificationswidget';
import { StatsWidget } from './components/statswidget';
import { RecentSalesWidget } from './components/recentsaleswidget';
import { BestSellingWidget } from './components/bestsellingwidget';
import { RevenueStreamWidget } from './components/revenuestreamwidget';
import { AuthService } from '../../services/auth-services/auth.service';
import { StructureService } from '../structure/structure-service';
import { ProcNonConformiteService } from '../proc-non-conformite/proc-non-conformite.service';
import { isPlatformBrowser, Location } from '@angular/common';
import { SelectModule } from 'primeng/select';
import { NgPrimeModule } from '../../../prime-ng.module';
import { generateColor, getCurrentUserStructure, isUserInRoles } from '../../utils';
import { Router } from '@angular/router';



@Component({
    selector: 'app-dashboard',
    imports: [StatsWidget, RecentSalesWidget, BestSellingWidget, RevenueStreamWidget, NotificationsWidget, SelectModule, NgPrimeModule],
    template: `
        <div class="grid grid-cols-12 gap-8">
            <app-stats-widget class="contents" />
            <div class="col-span-12 xl:col-span-6">
                <app-recent-sales-widget [data]="data" [options]="options" />
            </div>
            <div class="col-span-12 xl:col-span-6">
                <app-revenue-stream-widget [chartDataTaux]="dataTaux" [chartOptionsTaux]="optionsTaux" [chartData]="chartData" [chartOptions]="chartOptions" (changeYear)="changeForProcessus($event)" />
            </div>
            <div class="col-span-12 xl:col-span-12" *ngIf="!isUserInRoles(['SUPER_ADMIN'])">
                <div class="card">
                <h6>Non conformité par niveau</h6>
                    <p-chart type="line" [data]="dataNiveau" [options]="optionsNiveau" class="h-[30rem]" /></div>
            </div>
            <div class="col-span-12 xl:col-span-12">

                <app-best-selling-widget [data]="dataAll" [options]="optionsAll" (changeYear)="change($event)" />
            </div>
            <div class="col-span-12 xl:col-span-12">
                <app-notifications-widget [data]="dataChartStructLast" [options]="optionsChartStructLast" (changeYear)="changeAll($event)" />
            </div>
        </div>
    `
})
export class Dashboard implements AfterViewInit {
    data: any;
    options: any;
    dataNiveau: any;
    optionsNiveau: any;
    dataTaux: any;
    optionsTaux: any;
    dataChartStructLast: any;
    optionsChartStructLast: any;
    dataAll: any;
    optionsAll: any;
    chartData: any;
    chartOptions: any;
    nonConformites: Array<any> | null = [];
    nonConformiteTraites: any[] = [];
    nonConformiteRejetes: any[] = [];

    platformId = inject(PLATFORM_ID);
    annees: number[] = [];
    anneeSelectionnee!: number;
    userStructure:any={};
    constructor(
        private cd: ChangeDetectorRef,
        public authService: AuthService,
        public stuctureService: StructureService,
        public service: ProcNonConformiteService,
        private router: Router,

    ) {
        this.userStructure = getCurrentUserStructure();
    }
    ngOnInit() {
        if(isUserInRoles(['SUPER_ADMIN'])){
            this.fecthNonConformite();
            this.fetchStatsMensuelStatus();
            this.fetchStatsMensuel();
            this.fetchStats();
        }
        else {
            this.fecthNonConformiteConnect();
            this.fetchStatsMensuelStatusService();
            this.fecthStatMensuelStatusConnect();
            this.fetchStatsPlanAction();
            this.fetchStatsMensuelStatusNiveau();

        }


    }

    fecthNonConformite() {
        this.service.getNonConformiteAll().subscribe({
            next: (data) => {
                this.nonConformites = data.body;
                // @ts-ignore
                this.nonConformiteTraites = this.nonConformites.filter((nc) => nc.status === 'APPROVED');
                // @ts-ignore
                this.nonConformiteRejetes = this.nonConformites.filter((nc) => nc.status === 'REJECTED');
                this.initChart();
            },
            error: (error) => {
                //showToastDm(handleHttpErrors(error, 'error', 'Récupération', 'demandeKey'), this.messageService)
            }
        });
    }
    fecthNonConformiteConnect() {
        this.service.getNonConformiteByStrcuture(this.userStructure.id).subscribe({
            next: (data) => {
                this.nonConformites = data.body;
                // @ts-ignore
                this.nonConformiteTraites = this.nonConformites.filter((nc) => nc.status === 'APPROVED');
                // @ts-ignore
                this.nonConformiteRejetes = this.nonConformites.filter((nc) => nc.status === 'REJECTED');
                this.initChart();
            },
            error: (error) => {
                //showToastDm(handleHttpErrors(error, 'error', 'Récupération', 'demandeKey'), this.messageService)
            }
        });
    }

    fetchStats() {
        const currentYear = new Date().getFullYear();
        this.service.getStatsNfStruct(currentYear).subscribe({
            next: (data) => {
                this.initChartBystuct(data.body);
            },
            error: (error) => {
                //showToastDm(handleHttpErrors(error, 'error', 'Récupération', 'demandeKey'), this.messageService)
            }
        });
    }
    fetchStatsPlanAction() {
        const currentYear = new Date().getFullYear();
        this.service.getStatsPlanAction(currentYear).subscribe({
            next: (data) => {

                this.initChartTaux(data.body);
            },
            error: (error) => {
                //showToastDm(handleHttpErrors(error, 'error', 'Récupération', 'demandeKey'), this.messageService)
            }
        });
    }
    fetchStatsMensuel() {
        const currentYear = new Date().getFullYear();
        this.service.getStatsMensuel(currentYear).subscribe({
            next: (data) => {
                this.initChartAll(data.body);
            },
            error: (error) => {
                //showToastDm(handleHttpErrors(error, 'error', 'Récupération', 'demandeKey'), this.messageService)
            }
        });
    }
    fecthStatMensuelStatusConnect() {
        const currentYear = new Date().getFullYear();
        this.service.getStatsMensuelService(currentYear,this.userStructure.id).subscribe({
            next: (data) => {
                this.initChartAll(data.body);
            },
            error: (error) => {
                //showToastDm(handleHttpErrors(error, 'error', 'Récupération', 'demandeKey'), this.messageService)
            }
        });
    }
    fetchStatsMensuelStatus() {
        const currentYear = new Date().getFullYear();
        this.service.getStatsMensuelStatus(currentYear).subscribe({
            next: (data) => {
                this.initChartStructMonthLast(data.body);
            },
            error: (error) => {
                //showToastDm(handleHttpErrors(error, 'error', 'Récupération', 'demandeKey'), this.messageService)
            }
        });
    }
    fetchStatsMensuelStatusService() {
        const currentYear = new Date().getFullYear();
        this.service.getStatsMensuelStatusService(currentYear,this.userStructure.id).subscribe({
            next: (data) => {

                this.initChartStructMonthLast(data.body);
            },
            error: (error) => {
                //showToastDm(handleHttpErrors(error, 'error', 'Récupération', 'demandeKey'), this.messageService)
            }
        });
    }
    fetchStatsMensuelStatusNiveau() {
        const currentYear = new Date().getFullYear();
        this.service.getStatsByNiveau(currentYear,this.userStructure.id).subscribe({
            next: (data) => {
               this.initChartNiveau(data.body)

            },
            error: (error) => {
                //showToastDm(handleHttpErrors(error, 'error', 'Récupération', 'demandeKey'), this.messageService)
            }
        });
    }
    initChart() {
        const documentStyle = getComputedStyle(document.documentElement);
        const textColor = documentStyle.getPropertyValue('--p-text-color');

        this.data = {
            labels: ['En cours', 'Traités', 'Réjétés'],
            datasets: [
                {
                    data: [this.nonConformites?.length, this.nonConformiteTraites.length, this.nonConformiteRejetes.length],
                    backgroundColor: [documentStyle.getPropertyValue('--p-cyan-500'), documentStyle.getPropertyValue('--p-orange-500'), documentStyle.getPropertyValue('--p-gray-500')],
                    hoverBackgroundColor: [documentStyle.getPropertyValue('--p-cyan-400'), documentStyle.getPropertyValue('--p-orange-400'), documentStyle.getPropertyValue('--p-gray-400')]
                }
            ]
        };

        this.options = {
            maintainAspectRatio: false,
            cutout: '60%',
            plugins: {
                legend: {
                    labels: {
                        color: textColor
                    }
                }
            }
        };
        this.cd.markForCheck();
    }

    initChartBystuct(data: { [key: string]: number }) {
        const documentStyle = getComputedStyle(document.documentElement);
        const textColor = documentStyle.getPropertyValue('--text-color');
        const borderColor = documentStyle.getPropertyValue('--surface-border');
        const barColor = documentStyle.getPropertyValue('--p-primary-400');
        const textMutedColor = documentStyle.getPropertyValue('--text-color-secondary');

        const labels = Object.keys(data);
        const values = Object.values(data);

        this.chartData = {
            labels,
            datasets: [
                {
                    type: 'bar',
                    label: 'Processus',
                    backgroundColor: barColor,
                    data: values,
                    barThickness: 36,
                    borderRadius: {
                        topLeft: 6,
                        topRight: 6,
                        bottomLeft: 0,
                        bottomRight: 0
                    },
                    borderSkipped: false
                }
            ]
        };

        this.chartOptions = {
            maintainAspectRatio: false,
            aspectRatio: 1,
            plugins: {
                legend: {
                    labels: {
                        color: textColor
                    }
                }
            },
            scales: {
                x: {
                    stacked: false,
                    ticks: {
                        color: textMutedColor
                    },
                    grid: {
                        color: 'transparent',
                        borderColor: 'transparent'
                    }
                },
                y: {
                    stacked: false,
                    beginAtZero: true,
                    ticks: {
                        color: textMutedColor,
                        stepSize: 1
                    },
                    grid: {
                        color: borderColor,
                        drawTicks: false
                    }
                }
            }
        };
        this.cd.markForCheck();
    }
    initChartAll(stats: Record<string, Record<string, number>>) {
        if (isPlatformBrowser(this.platformId)) {
            const documentStyle = getComputedStyle(document.documentElement);
            const textColor = documentStyle.getPropertyValue('--p-text-color');
            const textColorSecondary = documentStyle.getPropertyValue('--p-text-muted-color');
            const surfaceBorder = documentStyle.getPropertyValue('--p-content-border-color');
            const barColor = documentStyle.getPropertyValue('--p-cyan-500');

            const year = Object.keys(stats)[0];
            const monthlyData = stats[year];

            const monthsFr = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

            const labels = monthsFr;
            const values = monthsFr.map((mois) => monthlyData[mois] ?? 0);

            this.dataAll = {
                labels,
                datasets: [
                    {
                        label: `Non-conformités  de ${year}`,
                        backgroundColor: barColor,
                        borderColor: barColor,
                        data: values
                    }
                ]
            };

            this.optionsAll = {
                maintainAspectRatio: false,
                aspectRatio: 0.8,
                plugins: {
                    legend: {
                        labels: {
                            color: textColor
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: textColorSecondary,
                            font: { weight: 500 }
                        },
                        grid: {
                            color: surfaceBorder,
                            drawBorder: false
                        }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: textColorSecondary,
                            precision: 0
                        },
                        grid: {
                            color: surfaceBorder,
                            drawBorder: false
                        }
                    }
                }
            };

            this.cd.markForCheck();
        }
    }

    change(year: any) {
        if (isUserInRoles(['SUPER_ADMIN'])){
            this.service.getStatsMensuel(year).subscribe({
                next: (data) => {
                    this.initChartAll(data.body);
                },
                error: (error) => {
                    //showToastDm(handleHttpErrors(error, 'error', 'Récupération', 'demandeKey'), this.messageService)
                }
            });
        }else {
            this.service.getStatsMensuelService(year,this.userStructure.id).subscribe({
                next: (data) => {
                    this.initChartAll(data.body);
                },
                error: (error) => {
                    //showToastDm(handleHttpErrors(error, 'error', 'Récupération', 'demandeKey'), this.messageService)
                }
            });
        }


    }
    changeForProcessus(year: any) {
        if (isUserInRoles(['SUPER_ADMIN'])){
            this.service.getStatsNfStruct(year).subscribe({
                next: (data) => {
                    this.initChartBystuct(data.body);
                },
                error: (error) => {
                    //showToastDm(handleHttpErrors(error, 'error', 'Récupération', 'demandeKey'), this.messageService)
                }
            });
        }else {
            this.service.getStatsPlanAction(year).subscribe({
                next: (data) => {
                    this.initChartTaux(data.body);

                },
                error: (error) => {
                    //showToastDm(handleHttpErrors(error, 'error', 'Récupération', 'demandeKey'), this.messageService)
                }
            });
        }

    }
    initChartStructMonthLast(stats: any) {
        if (isPlatformBrowser(this.platformId)) {
            const documentStyle = getComputedStyle(document.documentElement);
            const textColor = documentStyle.getPropertyValue('--p-text-color');
            const textColorSecondary = documentStyle.getPropertyValue('--p-text-muted-color');
            const surfaceBorder = documentStyle.getPropertyValue('--p-content-border-color');

            // Liste des mois en français
            const monthLabels = [
                'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
                'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
            ];

            const year = Object.keys(stats)[0];
            const monthlyStats = stats[year];

            // Catégories de statut (trouvés dynamiquement)
            const categories = ['APPROVED', 'IN_PROGRESS', 'REJECTED'];
            const colorMap: Record<string, string> = {
                APPROVED: documentStyle.getPropertyValue('--p-cyan-500'),
                IN_PROGRESS: documentStyle.getPropertyValue('--p-gray-500'),
                REJECTED: documentStyle.getPropertyValue('--p-orange-500')
            };

            // Construction des datasets par statut
            const datasets = categories.map(status => ({
                type: 'bar',
                label: status === 'APPROVED' ? 'Traités' :
                    status === 'IN_PROGRESS' ? 'En cours' :
                        status === 'REJECTED' ? 'Réjétés' : status,
                backgroundColor: colorMap[status] || '#999',
                data: monthLabels.map(m => monthlyStats[m]?.[status] ?? 0)
            }));

            this.dataChartStructLast = {
                labels: monthLabels,
                datasets: datasets
            };

            this.optionsChartStructLast = {
                maintainAspectRatio: false,
                aspectRatio: 0.8,
                plugins: {
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    },
                    legend: {
                        labels: {
                            color: textColor
                        }
                    }
                },
                scales: {
                    x: {
                        stacked: true,
                        ticks: {
                            color: textColorSecondary
                        },
                        grid: {
                            color: surfaceBorder,
                            drawBorder: false
                        }
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        ticks: {
                            color: textColorSecondary
                        },
                        grid: {
                            color: surfaceBorder,
                            drawBorder: false
                        }
                    }
                }
            };

            this.cd.markForCheck();
        }
    }

    changeAll(year: any) {
        if (isUserInRoles(['SUPER_ADMIN'])) {
            this.service.getStatsMensuelStatus(year).subscribe({
                next: (data) => {
                    this.initChartStructMonthLast(data.body);
                },
                error: (error) => {
                    //showToastDm(handleHttpErrors(error, 'error', 'Récupération', 'demandeKey'), this.messageService)
                }
            });
        }else {
            this.service.getStatsMensuelStatusService(year,this.userStructure.id).subscribe({
                next: (data) => {
                    this.initChartStructMonthLast(data.body);
                },
                error: (error) => {
                    //showToastDm(handleHttpErrors(error, 'error', 'Récupération', 'demandeKey'), this.messageService)
                }
            });
        }

    }
    initChartTaux(statsData: any) {
        if (isPlatformBrowser(this.platformId)) {
            const documentStyle = getComputedStyle(document.documentElement);
            const textColor = documentStyle.getPropertyValue('--text-color');
            const textColorSecondary = documentStyle.getPropertyValue('--text-secondary-color');
            const surfaceBorder = documentStyle.getPropertyValue('--surface-border');

            // Transformation de vos données
           const  year=Object.keys(statsData)[0];
            const yearData = statsData[year]; // Adaptez selon votre structure
            const mois = Object.keys(yearData);
            const tauxTraitement = mois.map(m => yearData[m].taux_traitement);
            const totaux = mois.map(m => yearData[m].total);

            this.dataTaux = {
                labels: mois.map(m => m.charAt(0).toUpperCase() + m.slice(1)), // Capitalize month names
                datasets: [
                    {
                        label: 'Taux de traitement (%)',
                        data: tauxTraitement,
                        backgroundColor: documentStyle.getPropertyValue('--primary-500'),
                        borderColor: documentStyle.getPropertyValue('--primary-500'),
                        tension: 0.4,
                        fill: false
                    },
                    {
                        label: 'Nombre total de plans',
                        data: totaux,
                        backgroundColor: documentStyle.getPropertyValue('--cyan-500'),
                        borderColor: documentStyle.getPropertyValue('--cyan-500'),
                        tension: 0.4,
                        fill: false,
                        type: 'bar', // Mix line and bar chart
                        yAxisID: 'y1'
                    }
                ]
            };

            this.optionsTaux = {
                maintainAspectRatio: false,
                aspectRatio: 0.8,
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: textColor,
                            font: {
                                weight: '500'
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {

                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: textColorSecondary,
                            font: {
                                weight: '500'
                            }
                        },
                        grid: {
                            color: surfaceBorder,
                            drawBorder: false
                        },
                        title: {
                            display: true,
                            text: 'Mois',
                            color: textColor
                        }
                    },
                    y: {
                        beginAtZero: true,
                        max: 100,

                        grid: {
                            color: surfaceBorder,
                            drawBorder: false
                        },
                        title: {
                            display: true,
                            text: 'Taux de traitement',
                            color: textColor
                        }
                    },
                    y1: {
                        position: 'right',
                        beginAtZero: true,
                        ticks: {
                            color: textColorSecondary
                        },
                        grid: {
                            drawOnChartArea: false
                        },
                        title: {
                            display: true,
                            text: 'Nombre de plans',
                            color: textColor
                        }
                    }
                }
            };
            this.cd.markForCheck();
        }
    }

    ngAfterViewInit(): void {


    }

    initChartNiveau(stats: any) {
        if (isPlatformBrowser(this.platformId)) {
            const documentStyle = getComputedStyle(document.documentElement);
            const textColor = documentStyle.getPropertyValue('--p-text-color');
            const textColorSecondary = documentStyle.getPropertyValue('--p-text-muted-color');
            const surfaceBorder = documentStyle.getPropertyValue('--p-content-border-color');

            const year = Object.keys(stats)[0];
            const monthlyStats = stats[year];

            const monthLabels = [
                'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
                'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
            ];

            const categoriesSet = new Set<string>();
            monthLabels.forEach(month => {
                const monthData = monthlyStats[month];
                if (monthData) {
                    Object.keys(monthData).forEach(cat => categoriesSet.add(cat));
                }
            });
            const categories = Array.from(categoriesSet);
            const totalCategories = categories.length;
            const colorMap: Record<string, string> = {};
            categories.forEach((cat, index) => {
                colorMap[cat] = generateColor(index, totalCategories);
            });

            const datasets = categories.map(cat => ({
                label: cat,
                data: monthLabels.map(m => monthlyStats[m]?.[cat] ?? 0),
                fill: false,
                borderColor: colorMap[cat] || documentStyle.getPropertyValue('--p-gray-500'),
                tension: 0.4
            }));

            this.dataNiveau = {
                labels: monthLabels,
                datasets: datasets
            };

            this.optionsNiveau = {
                maintainAspectRatio: false,
                aspectRatio: 0.6,
                plugins: {
                    legend: {
                        labels: {
                            color: textColor
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: textColorSecondary
                        },
                        grid: {
                            color: surfaceBorder,
                            drawBorder: false
                        }
                    },
                    y: {
                        ticks: {
                            color: textColorSecondary
                        },
                        grid: {
                            color: surfaceBorder,
                            drawBorder: false
                        }
                    }
                }
            };

            this.cd.markForCheck();
        }
    }


    protected readonly isUserInRoles = isUserInRoles;
}
