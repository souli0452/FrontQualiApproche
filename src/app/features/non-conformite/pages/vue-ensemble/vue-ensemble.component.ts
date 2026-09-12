import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgPrimeModule } from '@prime-ng';
import { Subject, takeUntil, debounceTime } from 'rxjs';

import { AuthData } from '../../../../models/auth.model';

import { 
    DASHBOARD_CARDS_AGENT, 
    DASHBOARD_CARDS_CHEF, 
    DASHBOARD_CARDS_RQ, 
    StatsCardConfig
} from '../../components/dashboard-card/dashboard-card';
import { TraitementTableComponent } from '../../components/table-traitement/traitement-table';
import { KpiCardComponent } from '../../../../shared/kpi-card/kpi-card.component';
import { NcVueEnsembleFacade } from './vue-ensemble.facade';
import { SmartAlertBannerComponent } from '../../../../shared/smart-alert-banner/smart-alert-banner.component';
import { SmartAlertItem } from '../../../../shared/smart-alert-banner/smart-alert-banner.model';
import { ChartEvolutionComponent } from '../../../../shared/chart-evolution/chart-evolution.component';
import { BreakdownItem, ChartFilterEvent } from '../../../../shared/chart-evolution/chart-evolution.model';
import { FeaturesService } from '@core/services/feature-service';
import { getCurrentUserStructure } from '@core/auth/auth-utils';
import { currentUserState } from '@core/auth/auth.state';
import { NiveauNonConformite } from '@features/non-conformite/models/referentiel.model';
import { EtapeTraitement } from '@features/non-conformite/models/nc-status.model';
import { NonConformiteService } from '@features/non-conformite/services/non-conformite.service';
import { NiveauNonConformiteService } from '@features/non-conformite/services/niveau-non-conformite.service';
import { RoleService } from '@features/non-conformite/services/role.service';
import { buildDashboardStats } from '@features/non-conformite/utils/nc-utils';
import { StructureService } from '@features/organigramme/services/structure.service';
import { CategorieProcessusService } from '@features/organigramme/services/categorie-processus.service';
import { PlanActionDialogComponent } from '@features/non-conformite/components/plan-action-dialog/plan-action-dialog.component';

@Component({
    selector: 'app-vue-ensemble',
    standalone: true,
    imports: [
        CommonModule, 
        NgPrimeModule,
        KpiCardComponent,
        SmartAlertBannerComponent,
        ChartEvolutionComponent,
        TraitementTableComponent,
        PlanActionDialogComponent
    ],
    templateUrl: './vue-ensemble.component.html',
    styleUrl: './vue-ensemble.component.scss'
})
export class NcVueEnsembleComponent implements OnInit, OnDestroy {

    // =========================================================================
    // 1. ÉTATS & PROPRIÉTÉS GÉNÉRALES
    // =========================================================================
    loading: boolean = false;
    dashboardData: any;
    userStructure: any = {};
    private destroy$ = new Subject<void>();

    // Statistiques consolidées issues du backend
    stats: any = {
        total: 0,
        enCours: 0,
        retard: 0,
        cloturees: 0,
        imputees: 0,
        draft: 0,
        published: 0,
        inProgress: 0
    };

    // Sous-métriques de validation (pour Chef et RQ)
    countValidationRQ: number = 0;
    countValidationPilote: number = 0;
    countPlansActionEnCours: number = 0;
    countNonConformiteCloturee: number = 0;

    // Compteurs pour la Smart Inbox d'alertes
    countNcATraiter: number = 0;
    countPlansATraiter: number = 0;

    // =========================================================================
    // 2. CONFIGURATION DES KPI CARDS
    // =========================================================================
    dashboardCardsAgent = DASHBOARD_CARDS_AGENT;
    dashboardCardsChef  = DASHBOARD_CARDS_CHEF;
    dashboardCardsRQ    = DASHBOARD_CARDS_RQ;

    get managerCards(): StatsCardConfig[] {
        if (this.roleService.isAgent) return this.dashboardCardsAgent;
        if (this.roleService.isChef)  return this.dashboardCardsChef;
        return this.dashboardCardsRQ;
    }

    get countTotal(): number {
        return this.stats?.total || 0;
    }

    get totalSubText(): string {
        const enCours = this.stats?.enCours || 0;
        const retard  = this.stats?.retard || 0;
        return `• ${enCours} Active${enCours > 1 ? 's' : ''} • ${retard} Retard`;
    }

    get meterMax(): number {
        const total = this.stats?.total || 0;
        return total > 0 ? total : 100;
    }

    getCardSubText(i: number): string | undefined {
        if (i === 0) return this.totalSubText;
        if (i === 1) {
            const enCours = this.stats?.enCours || 0;
            const total = this.stats?.total || 0;
            const pct = total > 0 ? Math.round((enCours / total) * 100) : 0;
            return `• ${pct}% des dossiers actifs`;
        }
        if (i === 2) {
            const tauxSla = this.dashboardData?.tauxSla ?? 100;
            return `• Respect SLA : ${tauxSla}%`;
        }
        if (i === 3) {
            const cloturees = this.stats?.cloturees ?? 0;
            const total = this.stats?.total || 0;
            const tauxResolV = total > 0 ? Math.round((cloturees / total) * 100) : (cloturees > 0 ? 100 : 0);
            return `• Taux résol. : ${tauxResolV}%`;
        }
        return undefined;
    }

    getCardMeterData(i: number): any[] | undefined {
        if (i === 0) return this.niveauxMeterData;
        if (i === 1) return this.enCoursMeterData;
        if (i === 2) return this.retardMeterData;
        if (i === 3) return this.clotureMeterData;
        return undefined;
    }

    trackByCard(index: number, card: any): any {
        return card.label || index;
    }

    getCardMeterMax(i: number): number {
        if (i === 0) return this.meterMax;
        if (i === 1) return this.meterMax;
        if (i === 2) return 100;
        if (i === 3) return this.meterMax;
        return 100;
    }

    // =========================================================================
    // 3. SMART ALERTS (Bandeau de notification d'action requise)
    // =========================================================================
    get smartAlerts(): SmartAlertItem[] {
        const list: SmartAlertItem[] = [];
        if (this.countNcATraiter > 0) {
            list.push({
                id: 'nc-a-traiter',
                count: this.countNcATraiter,
                badgeText: 'Action requise',
                message: `Non-conformité${this.countNcATraiter > 1 ? 's' : ''} en attente de traitement`,
                icon: 'pi pi-exclamation-circle',
                color: 'amber',
                routerLink: '/non-conformite/traitement',
                actionLabel: 'Traiter'
            });
        }
        if (this.countPlansATraiter > 0) {
            list.push({
                id: 'plans-a-traiter',
                count: this.countPlansATraiter,
                badgeText: "Plan d'action",
                message: `Plan${this.countPlansATraiter > 1 ? 's' : ''} d'action à réaliser`,
                icon: 'pi pi-file-edit',
                color: 'sky',
                routerLink: '/non-conformite/plan-action',
                actionLabel: 'Consulter'
            });
        }
        return list;
    }

    // =========================================================================
    // 4. RÉFÉRENTIELS & GAUGES (MeterGroup, Gravités & Processus)
    // =========================================================================
    niveauxReferentiel: NiveauNonConformite[] = [];
    rawEvolutionData: any = null;
    niveauxMeterData: any[] = [];
    totalNcNiveaux: number = 0;
    scoreSeveriteMoyen: number = 0;
    appreciationRisque: string = 'Aucun incident';
    couleurRisque: string = 'text-surface-500';

    enCoursMeterData: any[] = [];
    retardMeterData: any[] = [];
    retardProgressionItems: any[] = [];
    clotureMeterData: any[] = [];
    clotureProgressionItems: any[] = [];

    processusReferentiel: any[] = [];
    processusItems: any[] = [];

    // =========================================================================
    // 5. GRAPHIQUE D'ÉVOLUTION & PERFORMANCE DES DÉLAIS
    // =========================================================================
    chartData: any;
    chartOptions: any;
    selectedYear: Date = new Date();
    selectedMonth: Date | null = null;
    selectedStructure: string | null = null;
    structuresList: any[] = [];
    evolutionTotal: number = 0;
    evolutionPourcentage: string = '';
    evolutionBreakdownItems: BreakdownItem[] = [];

    performanceChartData: any;
    performanceChartOptions: any;
    tauxResolutionNC: number = 0;
    slaRespecte: number = 0;
    slaRetard: number = 0;
    slaRetardPct: number = 0;
    moyResolution: string = '12';

    get tauxResolution(): number {
        const total = this.stats?.total || 0;
        const cloturees = this.stats?.cloturees || 0;
        if (total === 0) return 100;
        return Math.round((cloturees / total) * 100);
    }

    // Plugin de centrage du texte dans le Doughnut Chart
    performancePlugins = [{
        id: 'centerTextPerf',
        beforeDraw: (chart: any) => {
            const ctx = chart.ctx;
            const meta = chart.getDatasetMeta(0);
            if (!meta || !meta.data || meta.data.length === 0) return;
            
            const centerX = meta.data[0].x;
            const centerY = meta.data[0].y;
            
            ctx.save();
            ctx.font = 'bold 22px sans-serif';
            ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-color') || '#0f172a';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.tauxResolution + '%', centerX, centerY - 7);
            
            ctx.font = '600 11px sans-serif';
            ctx.fillStyle = '#64748b';
            ctx.fillText('résolution', centerX, centerY + 13);
            ctx.restore();
        }
    }];

    // =========================================================================
    // 6. TABLEAUX OPÉRATIONNELS (Traitements & Plans d'action)
    // =========================================================================
    protected readonly BtnActions = EtapeTraitement;

    // Colonnes compactes optimisées pour les widgets de dashboard
    colsTraitement = [
        { field: 'numeroReference', header: 'N° Réf', type: 'string', width: '120px' },
        { field: 'niveauNonConformiteLibelle', header: 'Gravité', type: 'badge', width: '50px' }
    ];
    colsPlanAction = [
        { field: 'numeroReference', header: 'N° Réf', type: 'string', width: '120px' },
        { field: 'numeroOdre', header: 'N° Ordre', type: 'string', width: '50px' },
    ];

    traitementsList: any[] = [];
    totalTraitements: number = 0;
    loadingTraitements: boolean = false;
    pageTraitement: number = 0;

    plansActionList: any[] = [];
    totalPlansAction: number = 0;
    loadingPlans: boolean = false;
    pagePlanAction: number = 0;

    // Dialogue direct de consultation et décision du Plan d'action
    affichePlanDialog: boolean = false;
    selectedPlan: any = null;

    // =========================================================================
    // CONSTRUCTEUR
    // =========================================================================
    constructor(
        private nonConformiteService: NonConformiteService,
        private niveauService: NiveauNonConformiteService,
        private featureService: FeaturesService,
        private structureService: StructureService,
        private categorieProcessusService: CategorieProcessusService,
        public roleService: RoleService,
        private facade: NcVueEnsembleFacade
    ) {}

    // =========================================================================
    // CYCLE DE VIE DU COMPOSANT
    // =========================================================================
    ngOnInit(): void {
        this.userStructure = getCurrentUserStructure();

        // 1. Chargement des données métier de base
        this.loadDashboardData();
        this.loadNiveauxReferentiel();
        this.loadCategoriesProcessus();
        this.loadEvolutionStats();

        // 2. Chargement des deux tables opérationnelles
        this.loadTraitements();
        this.loadPlansAction();

        // 3. Écoute réactive des notifications pour la Smart Inbox
        this.nonConformiteService.notificationsNC$
            .pipe(takeUntil(this.destroy$))
            .subscribe(notifs => {
                this.countNcATraiter    = notifs?.aTraiter || 0;
                this.countPlansATraiter = notifs?.planAction || 0;
            });

        // 4. Ventilation par étape pour les managers
        this.chargerVentilationEtapes();

        // 5. Rechargement global réactif lors d'actions workflow
        this.featureService.reaload$
            .pipe(debounceTime(300), takeUntil(this.destroy$))
            .subscribe(() => {
                this.loadDashboardData();
                this.loadTraitements();
                this.loadPlansAction();
                this.nonConformiteService.rafraichirNotifications();
                this.chargerVentilationEtapes();
            });

        // 6. Charger les structures pour le filtre si profil habilité
        if (this.roleService.isAdmin || this.roleService.isRQ || this.roleService.isChef) {
            this.loadStructures();
        }
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    // =========================================================================
    // CHARGEMENT DES DONNÉES (API)
    // =========================================================================
    loadDashboardData(): void {
        this.loading = true;
        const authData = currentUserState.value as AuthData | any;
        if (!authData || !authData.permissions) {
            this.loading = false;
            return;
        }

        const currentUserId = authData.userId;
        const role = this.getUserRole();

        // Aiguillage API selon le profil connecté
        switch (role) {
            case 'AGENT':
                this.nonConformiteService.nonConformiteDashboardAgent(currentUserId!)
                    .pipe(takeUntil(this.destroy$))
                    .subscribe({
                        next: (response: any) => {
                            this.dashboardData = response.body.data;
                            this.updateKpis();
                            this.loading = false;
                        },
                        error: () => this.loading = false
                    });
                break;

            case 'CHEF':
                this.nonConformiteService.nonConformiteDashboardPilot(this.userStructure?.id)
                    .pipe(takeUntil(this.destroy$))
                    .subscribe({
                        next: (response: any) => {
                            this.dashboardData = response.body.data;
                            this.updateKpis();
                            this.loading = false;
                        },
                        error: () => this.loading = false
                    });
                break;

            case 'RQ':
                this.nonConformiteService.nonConformiteDashboardRq()
                    .pipe(takeUntil(this.destroy$))
                    .subscribe({
                        next: (response: any) => {
                            this.dashboardData = response.body.data;
                            this.updateKpis();
                            this.loading = false;
                        },
                        error: () => this.loading = false
                    });
                break;
        }
    }

    loadTraitements(): void {
        this.loadingTraitements = true;
        this.nonConformiteService.nonConformiteATraiterPage(this.pageTraitement, 5)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (res: any) => {
                    this.traitementsList = res?.data?.content ?? res?.content ?? [];
                    this.totalTraitements = res?.data?.totalElements ?? res?.totalElements ?? 0;
                    this.loadingTraitements = false;
                },
                error: () => this.loadingTraitements = false
            });
    }

    loadPlansAction(): void {
        this.loadingPlans = true;
        this.nonConformiteService.planActionsATraiterPage(this.pagePlanAction, 5)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (res: any) => {
                    this.plansActionList = res?.data?.content ?? res?.content ?? [];
                    this.totalPlansAction = res?.data?.totalElements ?? res?.totalElements ?? 0;
                    this.loadingPlans = false;
                },
                error: () => this.loadingPlans = false
            });
    }

    onPageChangeTraitement(event: { page: number, size: number }): void {
        this.pageTraitement = event.page;
        this.loadTraitements();
    }

    onPageChangePlanAction(event: { page: number, size: number }): void {
        this.pagePlanAction = event.page;
        this.loadPlansAction();
    }

    loadStructures(): void {
        this.structureService.getAllStructures()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (res: any) => {
                    const list = res?.data?.content || (Array.isArray(res?.data) ? res.data : []);
                    this.structuresList = list.map((s: any) => ({
                        nom: s.libelleCourt || s.libelle || s.nom,
                        id: s.id
                    }));
                },
                error: (err) => console.error("Erreur chargement des structures", err)
            });
    }

    loadNiveauxReferentiel(): void {
        this.niveauService.findAllAsList(0, 50, undefined, { 'X-Skip-Loader': 'true' })
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (res: any) => {
                    const list = Array.isArray(res) ? res : (res?.data || res?.content || []);
                    this.niveauxReferentiel = (list && list.length > 0)
                        ? [...list].sort((a, b) => (a.score || 0) - (b.score || 0))
                        : [];
                    this.calculerMeterGroupData();

                    // Synchronisation : si les stats d'évolution sont déjà arrivées, recalculer la sévérité avec les coefficients réels
                    if (this.rawEvolutionData) {
                        this.processEvolutionStats(this.rawEvolutionData);
                    }
                },
                error: () => {
                    this.niveauxReferentiel = [];
                    this.calculerMeterGroupData();
                    if (this.rawEvolutionData) {
                        this.processEvolutionStats(this.rawEvolutionData);
                    }
                }
            });
    }

    loadCategoriesProcessus(): void {
        this.categorieProcessusService.findAll(0, 100)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (res: any) => {
                    this.processusReferentiel = res?.data?.content || res?.content || (Array.isArray(res) ? res : []);
                    this.calculerProcessusData();
                },
                error: (err) => console.error('Erreur chargement processus', err)
            });
    }

    loadEvolutionStats(): void {
        const annee = this.selectedYear ? this.selectedYear.getFullYear() : new Date().getFullYear();
        const mois  = this.selectedMonth ? this.selectedMonth.getMonth() + 1 : undefined;
        const structureId = this.roleService.isChef ? this.userStructure?.id : (this.selectedStructure || undefined);

        this.facade.loadEvolutionStats(annee, mois, structureId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (data: any) => {
                    this.rawEvolutionData = data;
                    this.processEvolutionStats(data);
                },
                error: (err: any) => console.error("Erreur stats d'évolution", err)
            });
    }

    private processEvolutionStats(data: any): void {
        if (!data) return;
        this.chartData = data.chartData;
        this.evolutionTotal = data.totalEvolution;
        
        // Détermination du score maximum (100% dynamique) :
        // Le référentiel de l'entreprise en base est la source de vérité absolue.
        // Si la réponse du référentiel est en transit, on prend le score max retourné directement par l'API dans gravites.
        let maxScore = 0;
        if (this.niveauxReferentiel.length > 0) {
            maxScore = Math.max(...this.niveauxReferentiel.map(n => n.score || 1));
        } else if (data.gravites && Array.isArray(data.gravites) && data.gravites.length > 0) {
            maxScore = Math.max(...data.gravites.map((g: any) => g.score || 1));
        }

        let scoreTotalPondere = 0;

        if (data.gravites && Array.isArray(data.gravites)) {
            const fallbackColors = ['#ef4444', '#f97316', '#22c55e', '#3b82f6', '#a855f7'];

            this.evolutionBreakdownItems = data.gravites.map((g: any, idx: number) => {
                const libelle = g.nom || g.libelle || g.label || 'Niveau';
                const count = g.count ?? g.nombre ?? 0;
                
                const matchRef = this.niveauxReferentiel.find(r => 
                    (r.id && g.id && r.id === g.id) || 
                    (r.libelle && libelle && r.libelle.trim().toLowerCase() === libelle.trim().toLowerCase())
                );

                const scoreUnit = g.score ?? matchRef?.score ?? 1;
                const colorHex = g.couleur || matchRef?.couleur || fallbackColors[idx % fallbackColors.length];
                scoreTotalPondere += count * scoreUnit;

                return { label: libelle, count: count, customColor: colorHex };
            });

            if (this.chartData && Array.isArray(this.chartData.datasets)) {
                this.chartData.datasets = this.chartData.datasets.map((ds: any, idx: number) => {
                    const itemColor = this.evolutionBreakdownItems[idx]?.customColor || ds.backgroundColor || '#ef4444';
                    return {
                        ...ds,
                        type: 'bar',
                        backgroundColor: this.hexToRgba(itemColor, 0.85),
                        borderColor: itemColor,
                        borderWidth: 1,
                        borderRadius: 0,
                        borderSkipped: false,
                        maxBarThickness: 24
                    };
                });
            }

            if (this.evolutionTotal > 0 && maxScore > 0) {
                const maxPossibleScore = this.evolutionTotal * maxScore;
                const indiceSeveritePct = Math.round((scoreTotalPondere / maxPossibleScore) * 100);
                this.evolutionPourcentage = `Sévérité : ${indiceSeveritePct}%`;
            } else {
                this.evolutionPourcentage = data.pourcentageEvolution || '0%';
            }
        } else {
            this.evolutionBreakdownItems = [];
            this.evolutionPourcentage = '0%';
        }
    }

    onChartFilterChange(event: ChartFilterEvent): void {
        this.selectedYear      = new Date(event.annee, 0, 1);
        this.selectedMonth     = event.mois ? new Date(event.annee, event.mois - 1, 1) : null;
        this.selectedStructure = event.structureId || null;
        this.loadEvolutionStats();
    }

    private chargerVentilationEtapes(): void {
        this.nonConformiteService.getNonConformitesParEtape()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (res: any) => {
                    const parEtape = res?.data ?? res ?? {};
                    this.countValidationPilote = parEtape['EN_ATTENTE_VALIDATION_PILOTE'] ?? 0;
                    this.countValidationRQ     = parEtape['EN_ATTENTE_VALIDATION_RQ']     ?? 0;
                },
                error: () => {
                    this.countValidationPilote = 0;
                    this.countValidationRQ     = 0;
                }
            });
    }

    // =========================================================================
    // CALCULS MÉTIER & RÉPARTITIONS
    // =========================================================================
    private updateKpis(): void {
        if (!this.dashboardData) return;

        this.stats = buildDashboardStats(this.dashboardData);

        this.calculerMeterGroupData();
        this.calculerProcessusData();

        // ─── Carte Rouge : métriques SLA ────────────────────────────────────
        const tauxSla        = this.dashboardData?.tauxSla        ?? 100;
        const tauxResolution = this.dashboardData?.tauxResolution ?? 0;
        const tauxDepassement = Math.max(0, Math.round((100 - tauxSla) * 10) / 10);

        this.retardProgressionItems = [
            { label: 'Taux SLA',   value: `${tauxSla}%` },
            { label: 'Résolution', value: `${tauxResolution}%` }
        ];

        this.retardMeterData = [
            { label: 'Dans les délais', value: tauxSla,         color: '#22c55e' },
            { label: 'Hors délais',     value: tauxDepassement, color: '#ef4444' }
        ].filter(item => item.value > 0);

        // ─── Carte Verte : Performance SMQ (résolution) ─────────────────────
        const cloturees  = this.stats?.cloturees ?? 0;
        const totalNc    = this.stats?.total     ?? 0;
        const enCours    = this.stats?.enCours   ?? 0;
        const tauxResolV = totalNc > 0 ? Math.round((cloturees / totalNc) * 100) : (cloturees > 0 ? 100 : 0);
        
        const performanceSmq = tauxResolV >= 80 ? 'Optimale' : tauxResolV >= 50 ? 'Satisfaisante' : 'En progression';

        this.clotureProgressionItems = [
            { label: 'Taux résol.',  value: `${tauxResolV}%` },
            { label: 'Performance',  value: performanceSmq }
        ];

        this.clotureMeterData = [
            { label: 'Clôturées', value: cloturees, color: '#22c55e' },
            { label: 'En cours',  value: enCours,   color: '#3b82f6' }
        ].filter(item => item.value > 0);

        // ─── Carte Bleue : En cours vs Clôturées ────────────────────────────
        this.enCoursMeterData = [
            { label: 'En cours',   value: enCours,   color: '#38bdf8' },
            { label: 'Clôturées', value: cloturees, color: '#94a3b8' }
        ].filter(item => item.value > 0);
    }

    calculerMeterGroupData(): void {
        if (!this.niveauxReferentiel || this.niveauxReferentiel.length === 0) return;

        let totalPoints = 0;
        let totalNcComptees = 0;

        const counts = this.niveauxReferentiel.map(niveau => {
            const count = this.compterNcPourNiveau(niveau);
            const score = Number(niveau.score) || 1;
            totalNcComptees += count;
            totalPoints += count * score;
            return { niveau, count, score };
        });

        const statsTotal = this.stats?.total || 0;

        if (totalNcComptees === 0 && statsTotal > 0) {
            const enCours   = this.stats?.enCours   || 0;
            const cloturees = this.stats?.cloturees || 0;
            const retard    = this.stats?.retard    || 0;
            const autres    = Math.max(0, statsTotal - enCours - cloturees - retard);

            const fallback: any[] = [];
            if (enCours > 0)   fallback.push({ label: 'En cours',   value: enCours,   color: '#3b82f6' });
            if (cloturees > 0) fallback.push({ label: 'Clôturées', value: cloturees, color: '#22c55e' });
            if (retard > 0)    fallback.push({ label: 'En retard',  value: retard,    color: '#ef4444' });
            if (autres > 0)    fallback.push({ label: 'Autres',     value: autres,    color: '#f59e0b' });

            this.niveauxMeterData   = fallback;
            this.totalNcNiveaux     = 0;
            this.scoreSeveriteMoyen = 0;
            this.appreciationRisque = retard > 0 ? 'Retards détectés' : 'En cours de traitement';
            this.couleurRisque      = retard > 0 ? 'text-amber-600' : 'text-sky-600';
            return;
        }

        if (statsTotal === 0) {
            this.niveauxMeterData   = [];
            this.totalNcNiveaux     = 0;
            this.scoreSeveriteMoyen = 0;
            this.appreciationRisque = 'Aucun incident';
            this.couleurRisque      = 'text-surface-500';
            return;
        }

        const meterItems = counts.map(({ niveau, count, score }) => ({
            label: niveau.libelle,
            value: count,
            color: (niveau.couleur && niveau.couleur.trim()) ? niveau.couleur.trim() : this.getDefaultColorForScore(score),
            score: score,
            icon: score >= 3 ? 'pi pi-exclamation-triangle' : 'pi pi-circle-fill'
        }));

        this.niveauxMeterData = meterItems.some(i => i.value > 0) ? meterItems.filter(i => i.value > 0) : [];
        this.totalNcNiveaux   = totalNcComptees;
        this.scoreSeveriteMoyen = totalNcComptees > 0 ? Math.round((totalPoints / totalNcComptees) * 10) / 10 : 0;

        if (totalNcComptees === 0) {
            this.appreciationRisque = 'Aucun incident';
            this.couleurRisque      = 'text-surface-500';
        } else if (this.scoreSeveriteMoyen <= 1.5) {
            this.appreciationRisque = 'Risque Faible';
            this.couleurRisque      = 'text-green-600';
        } else if (this.scoreSeveriteMoyen <= 2.5) {
            this.appreciationRisque = 'Risque Modéré';
            this.couleurRisque      = 'text-amber-600';
        } else {
            this.appreciationRisque = 'Risque Critique';
            this.couleurRisque      = 'text-red-600';
        }

        // ─── PERFORMANCE DÉLAIS (Doughnut Chart) ────────────────────────────
        const total = this.stats.total;
        this.slaRespecte      = this.stats.cloturees || 0;
        this.tauxResolutionNC = Math.round((this.slaRespecte / total) * 100);
        this.slaRetard        = this.stats.enRetard || 0;
        this.slaRetardPct     = Math.round((this.slaRetard / total) * 100);

        this.performanceChartOptions = {
            cutout: '74%',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false }
            }
        };

        const surface200 = getComputedStyle(document.documentElement).getPropertyValue('--surface-200') || '#e2e8f0';

        this.performanceChartData = {
            labels: ['SLA respecté', 'Non résolu'],
            datasets: [{
                data: [this.slaRespecte, Math.max(0, total - this.slaRespecte)],
                backgroundColor: ['#0084ca', surface200],
                hoverBackgroundColor: ['#0084ca', surface200],
                borderWidth: 0
            }]
        };
    }

    private compterNcPourNiveau(niveau: NiveauNonConformite): number {
        if (!niveau) return 0;
        const targetLibelle = (niveau.libelle || '').trim().toLowerCase();
        const targetId = niveau.id ? String(niveau.id).trim().toLowerCase() : '';
        let total = 0;

        const statsGravity = this.dashboardData?.statsByStatusAndGravity || this.dashboardData?.statsByGravity;
        if (statsGravity && typeof statsGravity === 'object') {
            Object.values(statsGravity).forEach((gravMap: any) => {
                if (gravMap && typeof gravMap === 'object') {
                    const key = Object.keys(gravMap).find(k => {
                        const cleanK = k.trim().toLowerCase();
                        return cleanK === targetLibelle || (targetId && cleanK === targetId);
                    });
                    if (key && typeof gravMap[key] === 'number') total += gravMap[key];
                }
            });
        }
        return total;
    }

    private calculerProcessusData(): void {
        if (!this.stats || this.stats.total === 0 || !this.processusReferentiel.length) {
            this.processusItems = [];
            return;
        }

        const statsProc = this.dashboardData?.repartitionParProcessus || this.dashboardData?.statsByProcess;
        const totalProc = this.stats.total;
        const results: any[] = [];
        const couleursPalette = ['#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e'];
        let indexCouleur = 0;

        if (statsProc && typeof statsProc === 'object') {
            Object.keys(statsProc).forEach(key => {
                const count = statsProc[key] || 0;
                if (count > 0) {
                    const ref = this.processusReferentiel.find(p => p.id === key || p.libelle?.toLowerCase() === key.toLowerCase());
                    results.push({
                        label: ref ? ref.libelle : key,
                        value: count,
                        percentage: Math.round((count / totalProc) * 100),
                        color: couleursPalette[indexCouleur % couleursPalette.length]
                    });
                    indexCouleur++;
                }
            });
        }
        this.processusItems = results.sort((a, b) => b.value - a.value);
    }

    // =========================================================================
    // HELPERS POUR LES KPI CARDS
    // =========================================================================
    getCardValue(card: StatsCardConfig): number | string {
        if (card.isCustomValue) {
            return this.countNonConformiteCloturee || 0;
        }
        return this.stats?.[card.valueKey] || 0;
    }

    getCardPercentage(card: StatsCardConfig): number | undefined {
        const total = this.stats?.total || 0;
        if (total === 0 && card.valueKey !== 'total') return 0;

        switch (card.valueKey) {
            case 'total':     return 15;
            case 'enCours':   return Math.round(((this.stats?.enCours || 0) / total) * 100);
            case 'cloturees': return Math.round(((this.stats?.cloturees || 0) / total) * 100);
            case 'retard':    return Math.round(((this.stats?.retard || 0) / total) * 100);
            default:          return undefined;
        }
    }

    getCardProgressionItems(card: StatsCardConfig): any[] {
        if (!card.hasExtra) return [];
        if (card.valueKey === 'retard')    return this.retardProgressionItems;
        if (card.valueKey === 'cloturees') return this.clotureProgressionItems;

        return [
            { label: 'Validation Pilote', value: this.countValidationPilote || 0 },
            { label: 'Validation RQ',     value: this.countValidationRQ     || 0 },
            { label: "Plans d'action",    value: this.countPlansATraiter    || 0 }
        ];
    }

    // =========================================================================
    // UTILITAIRES INTERNES
    // =========================================================================
    private getUserRole(): 'AGENT' | 'CHEF' | 'RQ' {
        if (this.roleService.isAgent) return 'AGENT';
        if (this.roleService.isChef)  return 'CHEF';
        return 'RQ';
    }


    private getDefaultColorForScore(score: number): string {
        switch (score) {
            case 1: return '#22c55e';
            case 2: return '#3b82f6';
            case 3: return '#f59e0b';
            case 4: return '#ef4444';
            default: return '#64748b';
        }
    }

    hexToRgba(hex: string, alpha: number = 0.15): string {
        if (!hex) return `rgba(148, 163, 184, ${alpha})`;
        let cleanHex = hex.replace('#', '').trim();
        if (cleanHex.length === 3) {
            cleanHex = cleanHex.split('').map(char => char + char).join('');
        }
        if (cleanHex.length === 6 || cleanHex.length === 8) {
            const r = parseInt(cleanHex.substring(0, 2), 16);
            const g = parseInt(cleanHex.substring(2, 4), 16);
            const b = parseInt(cleanHex.substring(4, 6), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }
        return hex;
    }

    // =========================================================================
    // GESTION DU DIALOGUE DU PLAN D'ACTION (Consultation & Décision directe)
    // =========================================================================
    ouvrirPlanAction(plan: any): void {
        if (!plan) return;
        this.selectedPlan = plan;
        this.affichePlanDialog = true;
    }

    apresDecisionSurLePlan(plan: any): void {
        this.affichePlanDialog = false;
        this.loadPlansAction();
        this.loadTraitements();
        this.nonConformiteService.rafraichirNotifications();
        this.loadDashboardData();
    }
}
