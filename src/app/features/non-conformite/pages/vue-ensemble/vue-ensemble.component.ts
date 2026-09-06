import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

import { NgPrimeModule } from '@prime-ng';
import { 
    NcStatsCardComponent, 
    AlerteTraitement, 
    DASHBOARD_CARDS_AGENT, 
    DASHBOARD_CARDS_CHEF, 
    DASHBOARD_CARDS_RQ, 
    TraitementTableComponent, 
    NcFilter, 
    NcFilterBarComponent 
} from '../../components';
import { AuthService, isUserInRoles, currentUserState, getCurrentUserStructure } from '@core/auth';
import { Subject, takeUntil, forkJoin, of, debounceTime } from 'rxjs';
import { FeaturesService } from '@core';
import { RoleService, NonConformiteService } from '../../services';
import { buildDashboardStats } from '../../utils';
import { NcVueEnsembleFacade } from './vue-ensemble.facade';
import { AuthData } from '../../../../models/auth.model';
import { EtapeTraitement } from '../../models';
import { StructureService } from '@features/organigramme/services';

@Component({
    selector: 'app-vue-ensemble',
    standalone: true,
    imports: [
        CommonModule, 
        NgPrimeModule,
        NcStatsCardComponent,
        AlerteTraitement,
        NcFilterBarComponent,
        TraitementTableComponent
    ],
    templateUrl: './vue-ensemble.component.html',
    styleUrl: './vue-ensemble.component.scss'
})
export class NcVueEnsembleComponent implements OnInit, OnDestroy {

    loading: boolean = false;
    dashboardData: any;
    filteredNc: any[] = [];

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

    evolutionTotal: number = 0;
    evolutionPourcentage: string = '';
    countCritique: number = 0;
    countMajeure: number = 0;
    countMineure: number = 0;


    // Calcul automatique du total global basé sur la liste unique de toutes les NC actives
    get countTotal(): number {
        return this.allActiveNCs.length;
    }

    brouillonData: any[] = [];
    allActiveNCs: any[] = [];
    filteredActiveNCs: any[] = [];
    paginatedNCs: any[] = [];
    currentPage: number = 0;
    pageSize: number = 10;
    currentFilters: any = {};
    colsDashboard: any[] = [];
    imputationsData: any[] = [];
    receptionData: any[] = [];
    validationRqData: any[] = [];
    validationRqAffectationData: any[] = [];
    affectationData: any[] = [];
    currentUser: AuthData | null = null;
    userStructure: any = {};
    validationPiloteData: any[] = [];
    clotureData: any[] = [];
    nonTraiterData: any[] = [];
    nonConformiteClotureeData: any[] = [];
    soumissionData: any[] = [];
    countSoumission: number = 0;

    // 🛡️ GARDE DE CHARGEMENT — empêche les appels concurrents à loadUserNcData().
    // Problème observé : reaload$ émettait plusieurs fois après une action workflow
    // (validation() L70 + hideDialog() L82 + circuitAvance() L244 dans traitement-table),
    // à des intervalles parfois supérieurs au debounceTime(300ms), ce qui déclenchait
    // plusieurs loadUserNcData() simultanés et produisait N affichages du même bloc NC.
    // Solution : si un chargement est déjà en cours, on ignore les appels suivants.
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

    chartData: any;
    chartOptions: any;

    // Variables pour les filtres du graphique
    selectedYear: Date = new Date(); // Par défaut : l'année en cours
    selectedMonth: Date | null = null; // Pas de mois sélectionné par défaut
    selectedStructure: string | null = null;
    structuresList: any[] = []; // Liste de vos structures (à charger si vous l'avez)


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

    ngOnInit(): void {
        this.authService.currentUser$
            .pipe(takeUntil(this.destroy$))
            .subscribe(user => {
                this.currentUser = user;
        });
        this.userStructure = getCurrentUserStructure();
        
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

        // ─── RESPONSABILITÉ 1 : KPIs / Stats (agrégés depuis la base, par rôle) ───────────
        // Le backend dispose d'un endpoint dédié par rôle qui calcule les statistiques
        // directement en base : l'Agent voit ses NC, le Pilote celles de sa structure,
        // le RQ voit l'ensemble du système. Ce sont des données résumées, indépendantes
        // de la liste des NC à traiter.
        this.loadDashboardData();

        // ─── RESPONSABILITÉ 2 : Tableau des NC à traiter (piloté par le workflow) ─────────
        // Depuis la mise en place du moteur workflow, c'est le backend qui décide quelles NC
        // chaque utilisateur doit traiter (nonConformiteATraiter). Ce chargement est
        // INDÉPENDANT des KPIs : les deux coexistent sans se déclencher mutuellement.
        //
        // ❌ ANCIENNE ARCHITECTURE (commentée) — loadUserNcData() était appelé depuis updateKpis()
        // ce qui créait un couplage fort et des appels en cascade :
        //   loadDashboardData() → updateKpis() → loadUserNcData() [cascade non désirée]
        // ✅ NOUVELLE ARCHITECTURE — chargement direct et indépendant ici :
        this.loadUserNcData();

        if (this.roleService.isAdmin || this.roleService.isRQ) {
            this.loadStructures();
        }

        // ─── RAFRAÎCHISSEMENT après action workflow ──────────────────────────────────────
        // Après toute action (validation, rejet, clôture...), reaload$ est émis.
        // On rafraîchit les DEUX responsabilités pour maintenir la cohérence :
        //   - Les KPIs (compteurs peuvent avoir changé)
        //   - Le tableau des NC à traiter (la liste évolue après chaque action)
        //
        // debounceTime(300) : plusieurs composants appellent onReloadRequested() quasi-simultanément
        // après une action (nc-validation-pilote.ts x2, traitement-table.ts x1, etc.).
        // Sans debounce, chaque émission déclencherait un rechargement complet — d'où les
        // N affichages observés. On attend la fin de la "vague" d'émissions avant d'agir.
        this.featureService.reaload$
            .pipe(
                debounceTime(300),
                takeUntil(this.destroy$)
            )
            .subscribe(() => {
                // ✅ Rafraîchissement des KPIs : les compteurs ont pu changer suite à l'action
                this.loadDashboardData();
                // ✅ Rafraîchissement du tableau : la liste des NC à traiter a évolué
                this.loadUserNcData();
            });
            
            this.loadEvolutionStats();
            this.initChart();

            // À insérer temporairement dans ngOnInit()
            console.log("Rôles de l'utilisateur connecté :", this.roleService);
            console.log("Permissions de l'utilisateur connecté :", this.currentUser?.permissions);
            console.log("STRUCTURE DE L'UTILISATEUR CONNECTE (vue-ensemble) :", this.userStructure);
            console.log("ETAT DE L'UTILISATEUR COURANT (vue-ensemble) :", currentUserState.value);
    }

    loadStructures() {
        this.structureService.getAllStructures().subscribe({
        next: (res) => {
            if (res.data) {
                // C'est ici le changement : s.libelleCourt
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
        // On ne garde QUE la configuration visuelle du graphique
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
                    this.updateKpis(); // ✅ maintenant correct
                    this.loading = false;
                },
                error: (error: any) => {
                    this.loading = false;
                }
                });

            // ✅ Récupération et log des NC clôturées de la structure du Pilote
            this.nonConformiteService.nonConformiteParStructureEtTraitementGet(
                EtapeTraitement.CLOTURE,
                this.userStructure?.id
            ).pipe(takeUntil(this.destroy$)).subscribe({
                next: (res: any) => {
                    console.log("NC CLOTUREES DE LA STRUCTURE DU PILOTE (Brut) :", res);
                    const count = res.data?.content?.length || 0;
                    if (!this.stats) {
                        this.stats = {};
                    }
                    this.stats.cloturees = count;
                },
                error: (err: any) => {
                    console.error("Erreur lors du chargement des NC clôturées du Pilote :", err);
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
                this.stats = {
                    total: allNcs.length,
                    enCours: allNcs.filter((nc: any) => nc.etatDeTraitement !== 'CLOTURE' && nc.status !== 'DRAFT').length,
                    published: allNcs.filter((nc: any) => nc.etatDeTraitement === 'RECEPTION').length,
                    cloturees: allNcs.filter((nc: any) => nc.etatDeTraitement === 'CLOTURE').length
                };
            }

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
            this.applyLocalFilters();

            // ✅ countSoumission compte toutes les NC rejetées pour la notification "Non-Conformités rejetées"
            this.countSoumission = this.allActiveNCs.filter((nc: any) => nc.rejeter).length;

            // ✅ Mise à jour du badge dans le menu global et les onglets spécifiques
            this.nonConformiteService.notificationsNC$.next({
                total: this.countTotal,
                brouillons: this.countBrouillon,
                imputees: this.countImputees,
                reception: this.countReception,
                validationRQ: this.countValidationRQ + this.countValidationRqAffectation,
                validationPilote: this.countValidationPilote,
                cloture: this.countCloture,
                affectation: this.countAffectation,
                nonTraiter: this.countNonTraiter,
                soumission: this.countSoumission
            });

            this.ncDataLoading = false; // 🔓 Déverrouillage après succès
        },
        error: (err) => {
            console.error(err);
            this.resetUserDataState();
            this.ncDataLoading = false; // 🔓 Déverrouillage même en cas d'erreur
        }
        });
    }

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

    /**Recuperation des Non Conformités de l'utilisateur connecté en fonction de son rôle | FIN */



    private getUserRole(): 'AGENT' | 'CHEF' | 'RQ' {
        if (this.roleService.isAgent) return 'AGENT';
        if (this.roleService.isChef) return 'CHEF';
        return 'RQ'; // ✅ RQ ou Admin traité pareil ici
    }


    private updateKpis() {
        if (!this.dashboardData) return;
        console.log("DASHBOARD DATA RECEIVED:", this.dashboardData);

        const stats = this.dashboardData.statsByStatus || {};

        // Affichage des 4 blocs
        this.stats = buildDashboardStats(this.dashboardData);
        console.log("CALCULATED STATS OBJECT:", this.stats);

        // Pour les graphiques
        this.filteredNc = this.dashboardData.nonConformites || this.dashboardData.content || this.dashboardData.ncs || [];

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


    protected readonly isUserInRoles = isUserInRoles;
}