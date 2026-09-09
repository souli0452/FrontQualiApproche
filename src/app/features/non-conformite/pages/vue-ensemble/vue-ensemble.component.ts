import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

import { NgPrimeModule } from '@prime-ng';
import { 
    // A SUPPRIMER
    // NcStatsCardComponent, 
    AlerteTraitement, 
    DASHBOARD_CARDS_AGENT, 
    DASHBOARD_CARDS_CHEF, 
    DASHBOARD_CARDS_RQ, 
    TraitementTableComponent, 
    // A SUPPRIMER
    // NcFilter, 
    NcFilterBarComponent 
} from '../../components';
import { AuthService, /* A SUPPRIMER : isUserInRoles, */ currentUserState, getCurrentUserStructure } from '@core/auth';
import { Subject, takeUntil, /* A SUPPRIMER : forkJoin, of, */ debounceTime } from 'rxjs';
import { FeaturesService } from '@core';
import { RoleService, NonConformiteService } from '../../services';
import { buildDashboardStats } from '../../utils';
import { NcVueEnsembleFacade } from './vue-ensemble.facade';
import { AuthData } from '../../../../models/auth.model';
import { EtapeTraitement } from '../../models';
import { StructureService } from '@features/organigramme/services';

import { CardStatsAdminComponent } from '@shared';

@Component({
    selector: 'app-vue-ensemble',
    standalone: true,
    imports: [
        CommonModule, 
        NgPrimeModule,
        // A SUPPRIMER
        // NcStatsCardComponent,
        CardStatsAdminComponent,
        // AlerteTraitement,
        // NcFilterBarComponent,
        // TraitementTableComponent
    ],
    templateUrl: './vue-ensemble.component.html',
    styleUrl: './vue-ensemble.component.scss'
})
export class NcVueEnsembleComponent implements OnInit, OnDestroy {

    loading: boolean = false;
    dashboardData: any;

    // A SUPPRIMER : Variable jamais utilisée dans le template ni dans les calculs
    // filteredNc: any[] = [];

    countBrouillon: number = 0;
    countImputees: number = 0;
    countReception: number = 0;
    countValidationRQ: number = 0;
    /** Dossiers en attente de validation et d'affectation par le responsable qualité. */
    countValidationRqAffectation: number = 0;
    countAffectation: number = 0;
    countValidationPilote: number = 0;
    countCloture: number = 0;
    countNonTraiter: number = 0;
    countNonConformiteCloturee: number = 0;

    // A SUPPRIMER : Variables du graphique d'évolution (commenté dans le HTML)
    /*
    evolutionTotal: number = 0;
    evolutionPourcentage: string = '';
    countCritique: number = 0;
    countMajeure: number = 0;
    countMineure: number = 0;
    */

    // Calcul automatique du total global basé sur la liste unique de toutes les NC actives
    get countTotal(): number {
        return this.allActiveNCs.length;
    }

    brouillonData: any[] = [];
    allActiveNCs: any[] = [];

    // A SUPPRIMER : Pagination et filtres du tableau (commenté dans le HTML)
    /*
    filteredActiveNCs: any[] = [];
    paginatedNCs: any[] = [];
    currentPage: number = 0;
    pageSize: number = 10;
    currentFilters: any = {};
    colsDashboard: any[] = [];
    */

    imputationsData: any[] = [];
    receptionData: any[] = [];
    validationRqData: any[] = [];
    validationRqAffectationData: any[] = [];
    affectationData: any[] = [];

    // A SUPPRIMER : currentUser n'est pas lu, le composant utilise directement currentUserState.value
    // currentUser: AuthData | null = null;

    userStructure: any = {};
    validationPiloteData: any[] = [];
    clotureData: any[] = [];
    nonTraiterData: any[] = [];
    nonConformiteClotureeData: any[] = [];
    soumissionData: any[] = [];
    countSoumission: number = 0;

    // 🛡️ GARDE DE CHARGEMENT — empêche les appels concurrents à loadUserNcData().
    private ncDataLoading = false;

    stats: any = {
        total: 0,
        enCours: 0,
        retard: 0,
        imputees: 0,
        cloturees: 0,
        draft: 0,
        published: 0,
        pendingPilot: 0,
        rejectedByPilot: 0,
        pendingRq: 0,
        rejectedByRq: 0,
        pendingAssignment: 0,
        inProgress: 0,
        pendingPilotReview: 0,
        pendingClosure: 0,
        closed: 0,
        archived: 0
    };

    // A SUPPRIMER : Variables du graphique d'évolution (commenté dans le HTML)
    /*
    chartData: any;
    chartOptions: any;
    selectedYear: Date = new Date();
    selectedMonth: Date | null = null;
    selectedStructure: string | null = null;
    structuresList: any[] = [];
    */


    private destroy$ = new Subject<void>();

    private resetUserDataState(): void {
        this.countBrouillon = 0;
        this.brouillonData = [];
        this.allActiveNCs = [];

        this.countImputees = 0;
        this.imputationsData = [];

        this.countReception = 0;
        this.receptionData = [];

        this.countAffectation = 0;
        this.affectationData = [];

        this.countValidationPilote = 0;
        this.validationPiloteData = [];

        this.countValidationRQ = 0;
        this.validationRqData = [];
        this.countValidationRqAffectation = 0;
        this.validationRqAffectationData = [];

        this.countCloture = 0;
        this.clotureData = [];

        this.countNonTraiter = 0;
        this.nonTraiterData = [];

        this.countNonConformiteCloturee = 0;
        this.nonConformiteClotureeData = [];

        this.countSoumission = 0;
        this.soumissionData = [];
    }
    
    constructor(
        private nonConformiteService: NonConformiteService,
        private authService: AuthService,
        private featureService: FeaturesService,
        private structureService: StructureService,
        public roleService: RoleService,
        private facade: NcVueEnsembleFacade,
    ) {} 

    // A SUPPRIMER : Méthodes de filtrage du tableau (commenté dans le HTML)
    /*
    handleFilter(event: NcFilter) {
        this.currentFilters = event;
        this.currentPage = 0; // Reset pagination when filtering
        this.applyLocalFilters();
    }

    applyLocalFilters() {
        const filters = this.currentFilters || {} as any;
        const { dateDebut, dateFin, process, gravite, origine } = filters;

        const filterFn = (item: any) => {
            if (!item) return false;
            let isValid = true;

            if (dateDebut || dateFin) {
                const itemDateStr = item.dateCreation || item.createdAt || item.date || item.dateVisaEmetteur;
                if (itemDateStr) {
                    const itemDate = new Date(itemDateStr);
                    itemDate.setHours(0,0,0,0);
                    
                    if (dateDebut) {
                        const start = new Date(dateDebut);
                        start.setHours(0,0,0,0);
                        if (itemDate < start) isValid = false;
                    }
                    if (dateFin) {
                        const end = new Date(dateFin);
                        end.setHours(23,59,59,999);
                        if (itemDate > end) isValid = false;
                    }
                }
            }
            
            if (process && process.length > 0) {
                const selectedIds = process.map((p: any) => p.id);
                // process emetteur can be typeProcessusId or process.id etc.
                if (!selectedIds.includes(item.categorieProcessusId) && !selectedIds.includes(item.nonConformite?.categorieProcessusId)) {
                    isValid = false;
                }
            }

            if (gravite && gravite.length > 0) {
                const selectedIds = gravite.map((g: any) => g.id);
                if (!selectedIds.includes(item.niveauNonConformiteId) && !selectedIds.includes(item.nonConformite?.niveauNonConformiteId)) {
                    isValid = false;
                }
            }

            if (origine && origine.length > 0) {
                const selectedIds = origine.map((o: any) => o.id);
                if (!selectedIds.includes(item.sourceDeNonConformiteId) && !selectedIds.includes(item.nonConformite?.sourceDeNonConformiteId)) {
                    isValid = false;
                }
            }

            return isValid;
        };

        this.filteredActiveNCs = this.allActiveNCs.filter(filterFn);
        this.updatePaginatedNCs();
    }
    */

    ngOnInit(): void {
        // A SUPPRIMER : souscription à currentUser non exploitée
        /*
        this.authService.currentUser$
            .pipe(takeUntil(this.destroy$))
            .subscribe(user => {
                this.currentUser = user;
        });
        */
        this.userStructure = getCurrentUserStructure();
        
        // A SUPPRIMER : colonnes du tableau (commenté dans le HTML)
        /*
        this.colsDashboard = [
            { field: 'numeroReference', header: 'N° Ref', type: 'string', width: '150px' },
            { 
                field: 'structureSoumissionLibelle', 
                header: 'Processus Emetteur', 
                type: 'string', 
                width: 'fit-content'
            },
            { field: 'dateVisaEmetteur', header: 'Date soumission', type: 'string', width: '200px' },
            { field: 'workflowStatus', header: 'Étape du circuit', type: 'enum', width: '220px' },
            { field: 'niveauNonConformiteLibelle', header: 'Gravité', type: 'badge', width: '150px' }
        ];
        */

        // ─── RESPONSABILITÉ 1 : KPIs / Stats (agrégés depuis la base, par rôle) ───────────
        this.loadDashboardData();

        // ─── RESPONSABILITÉ 2 : Tableau des NC à traiter (piloté par le workflow) ─────────
        this.loadUserNcData();

        // A SUPPRIMER : Chargement structures et initialisation du graphique (commenté dans le HTML)
        /*
        if (this.roleService.isAdmin || this.roleService.isRQ) {
            this.loadStructures();
        }
        */

        // ─── RAFRAÎCHISSEMENT après action workflow ──────────────────────────────────────
        this.featureService.reaload$
            .pipe(
                debounceTime(300),
                takeUntil(this.destroy$)
            )
            .subscribe(() => {
                this.loadDashboardData();
                this.loadUserNcData();
            });
            
        // A SUPPRIMER : Stats et options du graphique d'évolution (commenté dans le HTML)
        /*
        this.loadEvolutionStats();
        this.initChart();
        */

        // A SUPPRIMER : Logs de debug
        /*
        console.log("Rôles de l'utilisateur connecté :", this.roleService);
        console.log("Permissions de l'utilisateur connecté :", this.currentUser?.permissions);
        console.log("STRUCTURE DE L'UTILISATEUR CONNECTE (vue-ensemble) :", this.userStructure);
        console.log("ETAT DE L'UTILISATEUR COURANT (vue-ensemble) :", currentUserState.value);
        */
    }

    // A SUPPRIMER : Méthodes liées au graphique d'évolution et aux structures (commenté dans le HTML)
    /*
    loadStructures() {
        this.structureService.getAllStructures().subscribe({
        next: (res) => {
            if (res.data) {
                this.structuresList = res.data.content.map((s: any) => ({
                    nom: s.libelleCourt, 
                    id: s.id
                }));
            }
        },
        error: (err) => {
            console.error("Erreur lors du chargement des structures", err);
        }
        });
    }

    loadEvolutionStats() {
        const annee = this.selectedYear
            ? this.selectedYear.getFullYear()
            : new Date().getFullYear();

        const mois = this.selectedMonth
            ? this.selectedMonth.getMonth() + 1
            : undefined;

        const structureId =
            this.roleService.isChef
            ? this.userStructure?.id
            : (this.selectedStructure || undefined);

        this.facade.loadEvolutionStats(annee, mois, structureId)
            .subscribe({
            next: (data: any) => {
                this.chartData = data.chartData;
                this.evolutionTotal = data.evolutionTotal;
                this.evolutionPourcentage = data.evolutionPourcentage;
                this.countCritique = data.countCritique;
                this.countMajeure = data.countMajeure;
                this.countMineure = data.countMineure;
            },
            error: (err) => {
                console.error("Erreur lors de la récupération des stats d'évolution", err);
            }
            });
    }

    initChart() {
        this.chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false 
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    padding: 10,
                    cornerRadius: 8,
                    mode: 'index', 
                    intersect: false
                }
            },
            scales: {
                x: {
                    stacked: true,
                    grid: {
                        display: false,
                        drawBorder: false
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.7)',
                        font: {
                            size: 11
                        }
                    }
                },
                y: {
                    stacked: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)',
                        drawBorder: false,
                        borderDash: [5, 5]
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.7)',
                        font: {
                            size: 11
                        },
                        stepSize: 5
                    }
                }
            }
        };
    }
    */

    loadDashboardData() {
        this.loading = true;

        const authData = currentUserState.value as AuthData | any;

        if (!authData || !authData.permissions) {
            this.loading = false;
            return;
        }

        const currentUserId = authData.userId;
        const role = this.getUserRole();

        // ✅ ROUTAGE PAR RÔLE
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
                error: (error: any) => {
                    this.loading = false;
                }
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
                error: (error: any) => {
                    this.loading = false;
                }
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
                error: (error: any) => {
                    this.loading = false;
                }
                });
            break;
                }
    }

    private loadUserNcData() {
    // 🛡️ GARDE : si un chargement est déjà en cours, on ignore cet appel.
    // Raison : reaload$ peut émettre plusieurs fois à des intervalles supérieurs
    // au debounceTime (ex: émission immédiate après HTTP + émission différée après
    // animation de fermeture du dialog). Sans ce garde, chaque émission aboutirait
    // à un rechargement complet indépendant, provoquant N affichages du tableau NC.
    if (this.ncDataLoading) {
        console.log('[VueEnsemble] loadUserNcData() ignoré — chargement déjà en cours');
        return;
    }

    const user = currentUserState.value as AuthData | any;

    if (!user || !user?.userId) {
        this.resetUserDataState();
        return;
    }

    this.ncDataLoading = true; // 🔒 Verrouillage

    this.facade.loadUserNcData(user, this.roleService, this.userStructure)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
        next: (data: any) => {
            console.log("loadUserNcData", data);
            console.log("TOUTES LES NC DE L'UTILISATEUR (allUserNcs) :", data.allUserNcs);
            
            this.brouillonData = data.brouillonData;
            this.imputationsData = data.imputationsData;
            this.receptionData = data.receptionData;
            this.affectationData = data.affectationData;
            this.validationPiloteData = data.validationPiloteData;
            this.validationRqData = data.validationRqData;
            this.validationRqAffectationData = data.validationRqAffectationData;
            this.clotureData = data.clotureData;
            this.nonConformiteClotureeData = data.nonConformiteClotureeData;
            this.nonTraiterData = data.nonTraiterData;
            this.soumissionData = data.soumissionData || [];

            // ✅ Calcul des compteurs en excluant les NC rejetées (qui sont comptées à part dans countSoumission)
            this.countBrouillon = this.brouillonData.length;
            this.countImputees = this.imputationsData.filter((nc: any) => !nc.rejeter).length;
            this.countReception = this.receptionData.filter((nc: any) => !nc.rejeter).length;
            this.countAffectation = this.affectationData.filter((nc: any) => !nc.rejeter).length;
            this.countValidationPilote = this.validationPiloteData.filter((nc: any) => !nc.rejeter).length;
            this.countValidationRQ = this.validationRqData.filter((nc: any) => !nc.rejeter).length;
            this.countValidationRqAffectation = this.validationRqAffectationData.filter((nc: any) => !nc.rejeter).length;
            this.countCloture = this.clotureData.filter((nc: any) => !nc.rejeter).length;
            this.countNonConformiteCloturee = this.nonConformiteClotureeData.length;
            this.countNonTraiter = this.nonTraiterData.length;
            this.countSoumission = this.soumissionData.length;

            // ✅ Recalcul des statistiques du tableau de bord pour l'Agent en se basant sur le circuit réel (etatTraitement)
            if (this.roleService.isAgent) {
                const allNcs = data.allUserNcs || [];
                const isCloturee = (nc: any) =>
                    (nc.etatTraitement === 'CLOTURE' ||
                     nc.workflowStatus === 'Clôture' ||
                     nc.workflowStatus === 'CLOTURE');

                this.stats = {
                    total: allNcs.length,
                    enCours: allNcs.filter((nc: any) => !isCloturee(nc) && nc.status !== 'DRAFT').length,
                    published: allNcs.filter((nc: any) => nc.etatTraitement === 'RECEPTION').length,
                    cloturees: allNcs.filter((nc: any) => isCloturee(nc)).length
                };
            }


            console.log('🔄 [VUE-ENSEMBLE] Sous-indicateurs et stats mis à jour par loadUserNcData :', {
                countValidationPilote: this.countValidationPilote,
                countValidationRQ: this.countValidationRQ,
                countNonConformiteCloturee: this.countNonConformiteCloturee,
                statsAgent: this.roleService.isAgent ? this.stats : 'N/A'
            });

            // ✅ Fusionner toutes les listes actives dans allActiveNCs
            const mergedList: any[] = [];
            
            if (this.brouillonData && this.brouillonData.length > 0) {
                this.brouillonData.forEach(item => {
                    mergedList.push({ ...item, status: 'DRAFT' });
                });
            }

            const otherActiveLists = [
                this.receptionData,
                this.validationRqAffectationData,
                this.affectationData,
                this.imputationsData,
                this.validationRqData,
                this.validationPiloteData,
                this.clotureData,
                this.nonTraiterData,
                this.soumissionData
            ];

            otherActiveLists.forEach(list => {
                if (list && list.length > 0) {
                    list.forEach(item => {
                        if (!mergedList.some(existing => existing.id === item.id)) {
                            mergedList.push(item);
                        }
                    });
                }
            });

            this.allActiveNCs = mergedList;
            // A SUPPRIMER : Filtrage local du tableau (commenté dans le HTML)
            // this.applyLocalFilters();

            // ✅ countSoumission compte toutes les NC rejetées pour la notification "Non-Conformités rejetées"
            this.countSoumission = this.allActiveNCs.filter((nc: any) => nc.rejeter).length;

            // ✅ Mise à jour du badge dans le menu global et les onglets spécifiques
            // this.nonConformiteService.notificationsNC$.next({
            //     total: this.countTotal,
            //     brouillons: this.countBrouillon,
            //     imputees: this.countImputees,
            //     reception: this.countReception,
            //     validationRQ: this.countValidationRQ + this.countValidationRqAffectation,
            //     validationPilote: this.countValidationPilote,
            //     cloture: this.countCloture,
            //     affectation: this.countAffectation,
            //     nonTraiter: this.countNonTraiter,
            //     soumission: this.countSoumission
            // });
            
            // ✅ Utilise le résumé officiel du backend sans écraser par des données locales
            this.nonConformiteService.rafraichirNotifications();

            this.ncDataLoading = false; // 🔓 Déverrouillage après succès
        },
        error: (err) => {
            console.error(err);
            this.resetUserDataState();
            this.ncDataLoading = false; // 🔓 Déverrouillage même en cas d'erreur
        }
        });
    }

    // A SUPPRIMER : Pagination manuelle du tableau (commenté dans le HTML)
    /*
    onPageChange(event: any) {
        this.currentPage = event.page;
        this.pageSize = event.size;
        this.updatePaginatedNCs();
    }

    updatePaginatedNCs() {
        const start = this.currentPage * this.pageSize;
        const end = start + this.pageSize;
        this.paginatedNCs = this.filteredActiveNCs.slice(start, end);
    }
    */

    /**Recuperation des Non Conformités de l'utilisateur connecté en fonction de son rôle | FIN */



    private getUserRole(): 'AGENT' | 'CHEF' | 'RQ' {
        if (this.roleService.isAgent) return 'AGENT';
        if (this.roleService.isChef) return 'CHEF';
        return 'RQ'; // ✅ RQ ou Admin traité pareil ici
    }


    private updateKpis() {
        if (!this.dashboardData) return;

        this.stats = buildDashboardStats(this.dashboardData);

        // 🔍 LOG COMPLET DES DONNÉES ALIMENTANT LES CARDS STATS
        console.group('📊 [VUE-ENSEMBLE] ALIMENTATION DES CARDS STATS (updateKpis)');
        console.log('👤 Rôle actif :', this.getUserRole());
        console.log('📦 Données brutes reçues du backend (dashboardData) :', this.dashboardData);
        console.log('🧮 Objet stats calculé (this.stats) :', this.stats);
        console.table({
            'Card 1 - Total': { 
                valeur: this.stats?.total, 
                source: 'dashboardData.total' 
            },
            'Card 2 - En cours': { 
                valeur: this.stats?.enCours, 
                source: 'dashboardData.enCours' 
            },
            'Card 3 - En retard': { 
                valeur: this.stats?.retard, 
                source: 'dashboardData.enRetard' 
            },
            'Card 4 - Clôturées': { 
                valeur: this.stats?.cloturees, 
                source: 'dashboardData.cloturees' 
            },
            'Taux SLA (%)': {
                valeur: this.stats?.tauxSla,
                source: 'dashboardData.tauxSla'
            },
            'Taux Résolution (%)': {
                valeur: this.stats?.tauxResolution,
                source: 'dashboardData.tauxResolution'
            },
            'Sous-métrique : Validation Pilote': { 
                valeur: this.countValidationPilote, 
                source: 'countValidationPilote' 
            },
            'Sous-métrique : Validation RQ': { 
                valeur: this.countValidationRQ, 
                source: 'countValidationRQ' 
            }
        });
        console.groupEnd();

        // A SUPPRIMER : Log de debug
        // console.log("CALCULATED STATS OBJECT:", this.stats);

        // A SUPPRIMER : Variable jamais utilisée
        // this.filteredNc = this.dashboardData.nonConformites || this.dashboardData.content || this.dashboardData.ncs || [];

        // ❌ ANCIENNE ARCHITECTURE — Appel commenté car il créait un couplage non désiré.
        // updateKpis() est un callback de loadDashboardData() : appeler loadUserNcData() ici
        // mélangeait deux responsabilités distinctes (KPIs vs. liste NC à traiter) et
        // provoquait des appels en cascade (loadDashboardData → updateKpis → loadUserNcData).
        // ✅ NOUVELLE ARCHITECTURE — loadUserNcData() est appelé directement dans ngOnInit(),
        // en parallèle de loadDashboardData(), de façon indépendante.
        // this.loadUserNcData();
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    dashboardCardsAgent = DASHBOARD_CARDS_AGENT;
    dashboardCardsChef = DASHBOARD_CARDS_CHEF;
    dashboardCardsRQ = DASHBOARD_CARDS_RQ;

    // A SUPPRIMER : isUserInRoles n'est pas utilisé dans le template
    // protected readonly isUserInRoles = isUserInRoles;
}