import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NcModule } from '../nc.module';
import { NgPrimeModule } from '../../../../prime-ng.module';
import { NcStatsCardComponent } from '../../../components/non-conformite/nc-stats-card/nc-stats-card';
import { getCurrentUserStructure } from '../../../utils/global/global-utils';
import { AuthService } from '../../../services/auth-services/auth.service';
import { Subject, takeUntil, forkJoin, of } from 'rxjs';
import { AlerteTraitement } from '../../../components/non-conformite/alerte-traitement/alerte-traitement';
import { FeaturesService } from '../../../services/feature-service';
import { RoleService } from '../../../services/non-conformite/role.service';
import { StructureService } from '../../parametrages/structure/structure-service/structure-service';
import { NonConformiteService } from '../../../services/non-conformite/non-conformite.service';
import { buildDashboardStats } from '../../../utils/non-conformite/nc-utils';
import { DASHBOARD_CARDS_AGENT, DASHBOARD_CARDS_CHEF, DASHBOARD_CARDS_RQ } from '../../../components/non-conformite/dashboard-card/dashboard-card';
import { NcVueEnsembleFacade } from './vue-ensemble.facade';
import { isUserInRoles } from '../../../utils/auth/auth-utils';
import { currentUserState } from '../../../services/auth-services/auth.state';
import { AuthData } from '../../../models/auth.model';
import { TraitementTableComponent } from '../../../components/non-conformite/table-traitement/traitement-table';
import { EtapeTraitement } from '../../../enums/enums';

@Component({
    selector: 'app-vue-ensemble',
    standalone: true,
    imports: [
                CommonModule, 
                NcModule, 
                NgPrimeModule,
                NcStatsCardComponent,
                AlerteTraitement,
                TraitementTableComponent
            ],
    templateUrl: './vue-ensemble.html',
    styleUrl: './vue-ensemble.scss'
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

    ngOnInit(): void {
        this.authService.currentUser$
            .pipe(takeUntil(this.destroy$))
            .subscribe(user => {
                this.currentUser = user;
        });
        this.userStructure = getCurrentUserStructure();
        
        this.colsDashboard = [
            { field: 'numeroReference', header: 'N° Ref', type: 'string', width: '200px' },
            { 
                field: 'structureSoumissionLibelle', 
                header: 'Processus Emetteur', 
                type: 'string', 
                width: 'fit-content'
            },
            { field: 'currentUserfullName', header: 'Initiateur', type: 'user', width: '200px' },
            { field: 'workflowStatus', header: 'Étape du circuit', type: 'enum', width: '220px' },
            { field: 'niveauNonConformiteLibelle', header: 'Gravité', type: 'badge', width: '150px' }
        ];

        // Charger les données initialement
        this.loadDashboardData();
        
        if (this.roleService.isAdmin || this.roleService.isRQ) {
            this.loadStructures();
        }

        // On écoute les demandes de rafraîchissement (comme après une suppression)
        this.featureService.reaload$
            .pipe(takeUntil(this.destroy$))
            .subscribe(reload => {
                    // On recharge les données silencieusement !
                    this.loadUserNcData(); 
                });
            
            this.loadEvolutionStats();
            this.initChart();

            // Récupérer et afficher toutes les non-conformités en console
            this.nonConformiteService.nonConformiteGetAll(0, 100).subscribe({
                next: (data) => {
                    console.log("Toutes les Non-Conformités (page 0, taille 100) :", data);
                },
                error: (err) => {
                    console.error("Erreur lors de la récupération de toutes les Non-Conformités :", err);
                }
            });

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
    const user = currentUserState.value as AuthData | any;

    if (!user || !user?.userId) {
        this.resetUserDataState();
        return;
    }

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
                    enCours: allNcs.filter((nc: any) => nc.etatTraitement !== 'CLOTURE' && nc.status !== 'DRAFT').length,
                    published: allNcs.filter((nc: any) => nc.etatTraitement === 'RECEPTION').length,
                    cloturees: allNcs.filter((nc: any) => nc.etatTraitement === 'CLOTURE').length
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
        },
        error: (err) => {
            console.error(err);
            this.resetUserDataState();
        }
        });
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

        this.loadUserNcData();
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