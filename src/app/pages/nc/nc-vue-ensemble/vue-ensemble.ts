import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NcModule } from '../nc.module';
import { NgPrimeModule } from '../../../../prime-ng.module';
import { NcStatsCardComponent } from '../../../components/non-conformite/nc-stats-card/nc-stats-card';
import { getCurrentUserStructure } from '../../../utils';
import { AuthService } from '../../../services/auth-services/auth.service';
import { Subject, takeUntil, forkJoin, of } from 'rxjs';
import { VueEnsembleImputationComponent } from './nc-imputation/nc-imputation';
import { AlerteTraitement } from '../../../components/non-conformite/alerte-traitement/alerte-traitement';
import { FeaturesService } from '../../../services/feature-service';
import { ReceptionComponent } from './nc-reception/nc-reception';
import { ValidationRQComponent } from './nc-validation-rq/nc-validation-rq';
import { NcAffectationComponent } from './nc-affectation/nc-affectation';
import { ValidationPiloteComponent } from './nc-validation-pilote/nc-validation-pilote';
import { NcClotureComponent } from './nc-cloture-rq/nc-cloture';
import { NcNonTraiterComponent } from './nc-traitement-action/nc-non-traiter';
import { RoleService } from '../../../services/non-conformite/role.service';
import { StructureService } from '../../parametrages/structure/structure-service/structure-service';
import { NonConformiteService } from '../../../services/non-conformite/non-conformite.service';
import { buildDashboardStats } from '../../../utils/non-conformite/nc-utils';
import { DASHBOARD_CARDS_AGENT, DASHBOARD_CARDS_CHEF, DASHBOARD_CARDS_RQ } from '../../../components/non-conformite/dashboard-card/dashboard-card';
import { NcVueEnsembleFacade } from './vue-ensemble.facade';
import { AuthData, UserResponse } from '../../../models';
import { isUserInRoles } from '../../../utils/auth/auth-utils';
import { currentUserState } from '../../../services/auth-services/auth.state';

@Component({
  selector: 'app-vue-ensemble',
  standalone: true,
  imports: [
            CommonModule, 
            NcModule, 
            NgPrimeModule,
            NcStatsCardComponent,
            VueEnsembleImputationComponent,
            AlerteTraitement,
            ReceptionComponent,
            ValidationRQComponent,
            NcAffectationComponent,
            ValidationPiloteComponent,
            NcClotureComponent,
            NcNonTraiterComponent
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


    // Calcul automatique du total global basé sur les compteurs spécifiques au rôle
    get countTotal(): number {
        return this.countBrouillon + 
               this.countImputees + 
               this.countReception + 
               this.countValidationRQ + 
               this.countAffectation + 
               this.countValidationPilote + 
               this.countCloture + 
               this.countNonTraiter;
    }

    brouillonData: any[] = [];
    imputationsData: any[] = [];
    receptionData: any[] = [];
    validationRqData: any[] = [];
    affectationData: any[] = [];
    currentUser: AuthData | null = null;
    userStructure: any = {};
    validationPiloteData: any[] = [];
    clotureData: any[] = [];
    nonTraiterData: any[] = [];
    nonConformiteClotureeData: any[] = [];

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

        this.countCloture = 0;
        this.clotureData = [];

        this.countNonTraiter = 0;
        this.nonTraiterData = [];

        this.countNonConformiteCloturee = 0;
        this.nonConformiteClotureeData = [];
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
    const user = this.currentUser;

    if (!user || !user.user?.userId) {
        this.resetUserDataState();
        return;
    }

    this.facade.loadUserNcData(user, this.roleService, this.userStructure)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
        next: (data: any) => {
            this.brouillonData = data.brouillonData;
            this.imputationsData = data.imputationsData;
            this.receptionData = data.receptionData;
            this.affectationData = data.affectationData;
            this.validationPiloteData = data.validationPiloteData;
            this.validationRqData = data.validationRqData;
            this.clotureData = data.clotureData;
            this.nonConformiteClotureeData = data.nonConformiteClotureeData;
            this.nonTraiterData = data.nonTraiterData;

            // ✅ Calcul des counts ici (ou tu peux centraliser après)
            this.countBrouillon = this.brouillonData.length;
            this.countImputees = this.imputationsData.length;
            this.countReception = this.receptionData.length;
            this.countAffectation = this.affectationData.length;
            this.countValidationPilote = this.validationPiloteData.length;
            this.countValidationRQ = this.validationRqData.length;
            this.countCloture = this.clotureData.length;
            this.countNonConformiteCloturee = this.nonConformiteClotureeData.length;
            this.countNonTraiter = this.nonTraiterData.length;

            // ✅ Mise à jour du badge dans le menu global et les onglets spécifiques
            this.nonConformiteService.notificationsNC$.next({
                total: this.countTotal,
                brouillons: this.countBrouillon,
                imputees: this.countImputees,
                reception: this.countReception,
                validationRQ: this.countValidationRQ,
                validationPilote: this.countValidationPilote,
                cloture: this.countCloture,
                affectation: this.countAffectation,
                nonTraiter: this.countNonTraiter,
                // Si actions est la même chose que nonTraiter ou imputees pour l'agent, on le met
                //actions: this.countNonTraiter // à adapter selon le vrai compteur "actions"
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

        const stats = this.dashboardData.statsByStatus || {};

        // Affichage des 4 blocs
        this.stats = buildDashboardStats(this.dashboardData);

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