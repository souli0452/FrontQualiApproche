import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NcModule } from '../nc.module';
import { NgPrimeModule } from '../../../../prime-ng.module';
import { ProcNonConformiteService } from '../../proc-non-conformite/proc-non-conformite.service';
import { NcFilter, NcFilterBarComponent } from '../nc-filter-bar/nc-filter-bar';
import { NcStatsCardComponent } from './nc-stats-card/nc-stats-card';
import { NcDoughnutGraphComponent } from './nc-doughnut-graph/nc-doughnut-graph';
import { isUserInRoles, hasAnyPermission, hasAllPermissions, getCurrentUserStructure } from '../../../utils';
import { AuthService } from '../../../services/auth-services/auth.service';
import { Subject, takeUntil, forkJoin, of } from 'rxjs';
import { EtapeTraitement } from '../../../enums';
import { VueEnsembleImputationComponent } from './nc-imputation/nc-imputation';
import { AlerteTraitement } from './alerte-traitement/alerte-traitement';
import { NcStackedBarGraphComponent } from './nc-stackedBar-graph/nc-stackedBar-graph';
import { FeaturesService } from '../../../services/feature-service';
import { ReceptionComponent } from './nc-reception/nc-reception';
import { ValidationRQComponent } from './nc-validation-rq/nc-validation-rq';
import { NcAffectationComponent } from './nc-affectation/nc-affectation';
import { ValidationPiloteComponent } from './nc-validation-pilote/nc-validation-pilote';
import { NcClotureComponent } from './nc-cloture-rq/nc-cloture';
import { NcNonTraiterComponent } from './nc-traitement-action/nc-non-traiter';
import { TraitementActionTable } from '../../../components/non-conformite/action-traitement/traitement-action-table';
import { StructureService } from '../../structure/structure-service/structure-service';
import { RoleService } from '../../../services/non-conformite/role.service';

@Component({
  selector: 'app-vue-ensemble',
  standalone: true,
  imports: [
            CommonModule, 
            NcModule, 
            NgPrimeModule, 
            NcFilterBarComponent,  
            NcStatsCardComponent, 
            // NcDoughnutGraphComponent, 
            // NcStackedBarGraphComponent,
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

    // isAdmin: boolean = false;
    // isChef: boolean = false;
    // isRQ: boolean = false;
    // isAgent: boolean = false;
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
               this.countNonTraiter + 
               this.countNonConformiteCloturee;
    }

    brouillonData: any[] = [];
    imputationsData: any[] = [];
    receptionData: any[] = [];
    validationRqData: any[] = [];
    affectationData: any[] = [];
    userStructure: any = {};
    validationPiloteData: any[] = [];
    clotureData: any[] = [];
    nonTraiterData: any[] = [];
    nonConformiteClotureeData: any[] = [];

    // Données brutes pour le filtrage local
    rawBrouillonData: any[] = [];
    rawImputationsData: any[] = [];
    rawReceptionData: any[] = [];
    rawValidationRqData: any[] = [];
    rawAffectationData: any[] = [];
    rawValidationPiloteData: any[] = [];
    rawClotureData: any[] = [];
    rawNonTraiterData: any[] = [];
    rawNonConformiteClotureeData: any[] = [];

    currentFilters: NcFilter | undefined;

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


  constructor(
    private procService: ProcNonConformiteService,
    private authService: AuthService,
    private featureService: FeaturesService,
    private structureService: StructureService,
    public roleService: RoleService
  ) {} 

  ngOnInit(): void {
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
            if (reload) {
                // On recharge les données silencieusement !
                this.fetchUserNCData(); 
            }
        });
        
        this.loadEvolutionStats();
        this.initChart();
  }

    loadStructures() {
        this.structureService.getAllStructures().subscribe({
        next: (res) => {
            if (res.body) {
                // C'est ici le changement : s.libelleCourt
                this.structuresList = res.body.map((s: any) => ({
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
        const annee = this.selectedYear ? this.selectedYear.getFullYear() : new Date().getFullYear();
        const mois = this.selectedMonth ? this.selectedMonth.getMonth() + 1 : undefined;
        
        // Si c'est un Chef, on force l'appel avec l'ID de SA structure
        const structureId = this.roleService.isChef ? this.userStructure?.id : (this.selectedStructure || undefined);
        
        this.procService.getNcEvolution(annee, mois, structureId).subscribe({
      next: (response) => {
        const stats = response.body;
        const backendChartData = stats.chartData;
            
            // 1. On enrichit les données du backend avec le design (couleurs, épaisseur)
            const styledDatasets = backendChartData.datasets.map((ds: any) => {
                if (ds.label === 'Mineure') {
                    return {
                        ...ds,
                        backgroundColor: '#ffffff2f', // Vert très clair pastel (green-200)
                        hoverBackgroundColor: '#00ff99ff', // Vert un peu plus soutenu au survol (green-300)
                        borderRadius: 6,
                        borderWidth: 0,
                        barThickness: 24
                    };
                } else if (ds.label === 'Majeure') {
                    return {
                        ...ds,
                        backgroundColor: '#ffffffab', // Orange très clair pastel (orange-200)
                        hoverBackgroundColor: '#ffbf00ff', // Orange un peu plus soutenu (orange-400)
                        borderRadius: 6,
                        borderWidth: 0,
                        barThickness: 24
                    };
                } else if (ds.label === 'Critique') {
                    return {
                        ...ds,
                        backgroundColor: '#ffffffff', // Rouge très clair pastel (red-200)
                        hoverBackgroundColor: '#ff0000ff', // Rouge un peu plus soutenu (red-300)
                        borderRadius: 6,
                        borderWidth: 0,
                        barThickness: 24
                    };
                }
                return ds;
            });

            // 2. On met à jour la variable liée au graphique HTML
            this.chartData = {
                labels: backendChartData.labels,
                datasets: styledDatasets
            };

        this.evolutionTotal = stats.totalEvolution;
        this.evolutionPourcentage = stats.pourcentageEvolution;
        
        const critiqueObj = stats.gravites.find((g: any) => g.nom === 'Critique');
        this.countCritique = critiqueObj ? critiqueObj.count : 0;
        
        const majeureObj = stats.gravites.find((g: any) => g.nom === 'Majeure');
        this.countMajeure = majeureObj ? majeureObj.count : 0;
        
        const mineureObj = stats.gravites.find((g: any) => g.nom === 'Mineure');
        this.countMineure = mineureObj ? mineureObj.count : 0;


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


  /**
   * Cette méthode est appelée par la barre de filtres au démarrage 
   * et chaque fois qu'un filtre change.
   */
  handleFilter(filters: NcFilter) {
    this.currentFilters = filters;
    this.applyLocalFilters();
  }

  applyLocalFilters() {
    const filters = this.currentFilters || {} as any;
    const { dateDebut, dateFin, process, gravite, origine } = filters;

    const filterFn = (item: any) => {
        if (!item) return false;
        
        let isValid = true;

        // Filtrage par Date (dateCreation ou updatedAt ou createdAt)
        if (dateDebut || dateFin) {
            const itemDateStr = item.dateCreation || item.createdAt || item.date;
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

        // Filtrage par Processus
        if (process && process.id) {
            if (item.typeProcessusId !== process.id) isValid = false;
        }

        // Filtrage par Gravité (Niveau)
        if (gravite && gravite.id) {
            if (item.niveauNonConformiteId !== gravite.id) isValid = false;
        }

        // Filtrage par Origine (Type de NC)
        if (origine && origine.id) {
            if (item.typeNonConformiteId !== origine.id) isValid = false;
        }

        return isValid;
    };

    // Appliquer le filtre sur chaque tableau
    this.brouillonData = this.rawBrouillonData.filter(filterFn);
    this.countBrouillon = this.brouillonData.length;

    this.imputationsData = this.rawImputationsData.filter(filterFn);
    this.countImputees = this.imputationsData.length;

    this.receptionData = this.rawReceptionData.filter(filterFn);
    this.countReception = this.receptionData.length;

    this.validationRqData = this.rawValidationRqData.filter(filterFn);
    this.countValidationRQ = this.validationRqData.length;

    this.affectationData = this.rawAffectationData.filter(filterFn);
    this.countAffectation = this.affectationData.length;

    this.validationPiloteData = this.rawValidationPiloteData.filter(filterFn);
    this.countValidationPilote = this.validationPiloteData.length;

    this.clotureData = this.rawClotureData.filter(filterFn);
    this.countCloture = this.clotureData.length;

    this.nonConformiteClotureeData = this.rawNonConformiteClotureeData.filter(filterFn);
    this.countNonConformiteCloturee = this.nonConformiteClotureeData.length;

    // Pour nonTraiter (plan actions), le filtrage peut se faire sur les propriétés mappées
    // (A condition que niveauNonConformiteId, etc. soient bien rattachés lors du mapping initial)
    this.nonTraiterData = this.rawNonTraiterData.filter((planAction: any) => {
        // Comme c'est un PlanAction, le filtrage direct peut ne pas marcher si l'objet n'a pas les propriétés de NC
        // Mais nous avons un fallback dans fetchUserNCData pour ces objets.
        return true; 
    });
    this.countNonTraiter = this.nonTraiterData.length;

    // Envoi de la notification globale au menu et à la topbar
    this.procService.notificationsNC$.next({
        total: this.countTotal,
        brouillons: this.countBrouillon,
        imputees: this.countImputees,
        reception: this.countReception,
        validationRQ: this.countValidationRQ,
        enAttenteValidation: 0, // A ajouter si necessaire
        validationPilote: this.countValidationPilote,
        cloture: this.countCloture,
        affectation: this.countAffectation,
        nonTraiter: this.countNonTraiter
    });
  }

  loadDashboardData(filters?: NcFilter) {
    this.loading = true;
    const user = this.authService.getUser();
    console.log("USER : ", user);
    
    if (!user || !user.permissions) {
        console.warn("Utilisateur non connecté ou sans permissions, impossible de charger le dashboard.");
        this.loading = false;
        return;
    }

    const currentUserId = user.id || user.userId;

    // 1. Détermination stricte des rôles selon ta logique d'exclusion
    // const hasRQ = hasAnyPermission(['VALIDATION_RQ']);
    // const hasChef = hasAnyPermission(['VALIDATION_CHEF']);

    // if (hasRQ) {
    //     // Règle 1 : S'il contient VALIDATION_RQ -> C'est un RQ
    //     this.isRQ = true;
    //     this.isChef = false;
    //     this.isAgent = false;
    // } else if (hasChef) {
    //     // Règle 2 : S'il contient VALIDATION_CHEF et PAS VALIDATION_RQ -> C'est un Pilote (Chef)
    //     this.isChef = true;
    //     this.isRQ = false;
    //     this.isAgent = false;
    // } else {
    //     // Règle 3 : S'il n'a ni VALIDATION_CHEF ni VALIDATION_RQ -> C'est un Agent
    //     this.isAgent = true;
    //     this.isRQ = false;
    //     this.isChef = false;
    // }

    // 2. Aiguillage vers les appels de services correspondants
    if (this.roleService.isAgent) {
        this.procService.getUserDashboard(currentUserId!)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (response: any) => {
                    this.dashboardData = response.body;
                    console.log("dashboardData agent : ", this.dashboardData);
                    this.updateKpis();
                    this.loading = false;
                },
                error: (error: any) => {
                    console.error('Erreur dashboard Agent:', error);
                    this.loading = false;
                }
            });
    } 
    else if (this.roleService.isChef) {
        this.procService.getPilotDashboard(this.userStructure?.id)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (response: any) => {
                    this.dashboardData = response.body;
                    console.log("dashboardData chef : ", this.dashboardData);
                    this.updateKpis();
                    this.loading = false;
                },
                error: (error: any) => {
                    console.error('Erreur dashboard Chef:', error);
                    this.loading = false;
                }
            });
        console.log("Chargement du dashboard pour le Pilote de processus");
        
        // 1. Initialisez un dashboardData vide pour éviter les erreurs dans le HTML
        this.dashboardData = { statsByStatus: {}, totalNC: 0, retard: 0, nonConformites: [] };
        
        // 2. Mettez à jour les KPIs (qui seront à 0 pour l'instant)
        this.updateKpis();
        
        // 3. (Important) Déclenchez manuellement la récupération des tableaux !
        this.fetchUserNCData();
        
        this.loading = false; 
    }
    else if (this.roleService.isRQ) {
      this.procService.getDashboardRQ()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
            next: (response: any) => {
                this.dashboardData = response.body;
                console.log("dashboardData RQ : ", this.dashboardData);
                this.updateKpis();
                this.loading = false;
            },
            error: (error: any) => {
                console.error('Erreur dashboard RQ:', error);
                this.loading = false;
            }
        });
    }
  }

  // UserNCDataAPI() {
  //   const user = this.authService.getUser();
  //   if (!user || !user.userId) return;

  //   this.loading = true;

  //   // On ne fait plus qu'un seul appel API propre
  //   this.procService.getNCByUser(user.userId)
  //     .pipe(takeUntil(this.destroy$))
  //     .subscribe({
  //       next: (res) => {
  //         const allNcs = res.body;
  //         console.log('Toutes les NC de l\'utilisateur :', allNcs);
  //         if (allNcs && Array.isArray(allNcs)) {
  //           // 1. Filtrer pour obtenir uniquement les Brouillons
  //           const drafts = allNcs.filter((nc: any) => nc.status === 'DRAFT');
  //           console.log('Brouillons (DRAFT) filtrés :', drafts);

  //           // 2. Filtrer pour obtenir uniquement les Imputations (si le statut ou une propriété le définit)
  //           // Adapte 'IMPUTED' selon le nom exact de ton enum ou de ta propriété (ex: nc.status === 'IN_PROGRESS' ou nc.imputed === true)
  //           const imputations = allNcs.filter((nc: any) => nc.statutTraitement === 'IMPUTED');
  //           console.log('Imputations filtrées :', imputations);
            
  //           // Tu peux maintenant stocker ces données pour ton dashboard
  //           // this.draftsData = drafts;
  //           // this.imputationsData = imputations;
  //         }
  //         this.loading = false;
  //       },
  //       error: (error) => {
  //         console.error('Erreur lors de la récupération des NC de l\'utilisateur :', error);
  //         this.loading = false;
  //       }
  //     });
  // }

    private fetchUserNCData() {
        const user = this.authService.getUser();
        if (!user || !user.userId) {
            this.countBrouillon = 0;
            this.countImputees = 0;
            return;
        }
        console.log(user);
        

        // Utilisation propre de forkJoin pour exécuter les deux requêtes en parallèle
        const requests: any = {
            userNcsRes: this.procService.getNCByUser(user.userId),
            imputationsRes: this.procService.findImputedByUserId(user.userId),
            ncNonTraiterRes: this.procService.getPlanActions(user.email,"NON_TRAITER")
        };

        if ((this.roleService.isChef && this.userStructure?.id) || this.roleService.isRQ) {
            requests.receptionRes = this.procService.getNonConformiteByEtapeAndSumit(EtapeTraitement.RECEPTION, this.userStructure.id);
            requests.affectationRes = this.procService.getNonConformiteByEtapeAndOrigin(EtapeTraitement.IMPUTATION, this.userStructure.id!);
            requests.validationPiloteRes = this.procService.getNonConformiteByEtapeAndOrigin(EtapeTraitement.VALIDATION, this.userStructure.id!);
        }
        if (this.roleService.isRQ) {
            console.log("Chargement du dashboard pour le RQ");
            requests.validationRqRes = this.procService.getNonConformiteByEtape(EtapeTraitement.VALIDATION_RS);
            requests.clotureRes = this.procService.getNonConformiteByEtape(EtapeTraitement.SUIVI_RQ);
            requests.nonConformiteClotureeRes = this.procService.getNonConformiteByEtape(EtapeTraitement.CLOTURE);
        }

        forkJoin(requests)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
            next: (res: any) => {
                const userNcsRes = res.userNcsRes;
                const imputationsRes = res.imputationsRes;
                const receptionRes = res.receptionRes;
                const affectationRes = res.affectationRes;
                const validationPiloteRes = res.validationPiloteRes;
                const clotureRes = res.clotureRes;
                const ncNonTraiterRes = res.ncNonTraiterRes;
                const ncNonConformiteClotureeRes = res.ncNonConformiteClotureeRes;

                // Extraction sécurisée des données du body (valeur par défaut : tableau vide [])
                const allUserNcs = userNcsRes?.body || [];
                const allImputations = imputationsRes?.body || [];
                const allReceptions = receptionRes?.body || [];
                const allValidationRq = res.validationRqRes?.body || [];
                const allAffectations = affectationRes?.body || [];
                const allValidationPilotes = validationPiloteRes?.body || [];
                const allClotures = clotureRes?.body || [];
                const allNcNonTraiter = ncNonTraiterRes?.body || [];
                const allNcNonConformiteCloturee = ncNonConformiteClotureeRes?.body || [];
                

                console.log('--- RETOUR API QUALISIRA ---');
                console.log('NCs Créées reçues :', allUserNcs);
                console.log('Imputations reçues :', allImputations);
                if (this.roleService.isChef) console.log('Réceptions reçues :', allReceptions);
                if (this.roleService.isRQ) console.log('Validations RQ reçues :', allValidationRq);

                // 1. Traitement des Brouillons (DRAFT) parmi les NC créées par l'utilisateur
                if (Array.isArray(allUserNcs)) {
                    const drafts = allUserNcs.filter((nc: any) => nc.status === 'DRAFT');
                    this.rawBrouillonData = drafts;
                } else {
                    this.rawBrouillonData = [];
                }

                // 2. Traitement des Imputations (On filtre par etapeTraitement === TRAITEMENT)
                if (Array.isArray(allImputations)) {
                    const activeImputations = allImputations.filter((imp: any) => imp.etatTraitement === EtapeTraitement.TRAITEMENT);
                    this.rawImputationsData = activeImputations;
                } else {
                    this.rawImputationsData = [];
                }

                // 3. Traitement des Réceptions (Pilote uniquement)
                if ((this.roleService.isChef && Array.isArray(allReceptions)) || (this.roleService.isRQ)) {
                    this.rawReceptionData = allReceptions;
                } else {
                    this.rawReceptionData = [];
                }

                // 5. Traitement des Affectation (Pilote uniquement)
                if (this.roleService.isChef && Array.isArray(allAffectations)) {
                    this.rawAffectationData = allAffectations;
                } else {
                    this.rawAffectationData = [];
                }

                // 4. Traitement des Validations Pilote (Pilote uniquement)
                if ((this.roleService.isChef && Array.isArray(allValidationPilotes)) || (this.roleService.isRQ)) {
                    this.rawValidationPiloteData = allValidationPilotes;
                } else {
                    this.rawValidationPiloteData = [];
                }

                // 6. Traitement des Validations RQ (RQ uniquement)
                if ((this.roleService.isRQ && Array.isArray(allValidationRq)) || (this.roleService.isRQ)) {
                    this.rawValidationRqData = allValidationRq;
                } else {
                    this.rawValidationRqData = [];
                }

                // 7. Traitement des Cloture (RQ uniquement)
                if (this.roleService.isRQ && Array.isArray(allClotures)) {
                    this.rawClotureData = allClotures;
                } else {
                    this.rawClotureData = [];
                }

                // 7. Traitement des NC Non Confromite Cloturee (RQ uniquement)
                if (this.roleService.isRQ && Array.isArray(allNcNonConformiteCloturee)) {
                    this.rawNonConformiteClotureeData = allNcNonConformiteCloturee;
                } else {
                    this.rawNonConformiteClotureeData = [];
                }

                // 8. Traitement des NC Non Traiter (RQ uniquement)
                if (Array.isArray(allNcNonTraiter)) {
                    // Enrichissement avec les données des autres tableaux (si la NC est présente ailleurs)
                    const allNCs = [
                        ...allUserNcs, 
                        ...allImputations, 
                        ...allReceptions, 
                        ...allValidationRq, 
                        ...allAffectations, 
                        ...allValidationPilotes, 
                        ...allClotures
                    ];
                    
                    allNcNonTraiter.forEach((planAction: any) => {
                        const relatedNC = allNCs.find((nc: any) => nc.numeroReference === planAction.numeroNc || nc.id === planAction.nonConformeId);
                        if (relatedNC && relatedNC.niveauNonConformiteLibelle) {
                            planAction.niveauNonConformiteLibelle = relatedNC.niveauNonConformiteLibelle;
                        }
                    });

                    this.rawNonTraiterData = allNcNonTraiter;
                } else {
                    this.rawNonTraiterData = [];
                }

                if (!this.roleService.isChef && !this.roleService.isRQ) {
                    // On calcule le nombre de NC clôturées de l'agent directement dans les stats
                    const mesNcsCloturees = allUserNcs.filter((nc: any) => nc.etatTraitement === EtapeTraitement.CLOTURE);
                    
                    // On met à jour uniquement la statistique, sans créer d'alerte !
                    if (this.stats) {
                        this.stats.cloturees = mesNcsCloturees.length;
                    }
                }

                // On applique les filtres actuels sur les données brutes
                this.applyLocalFilters();
            },
            error: (err) => {
                console.error('Erreur lors du forkJoin (fetchUserNCData) :', err);
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
        });
    }

  private updateKpis() {
    if (!this.dashboardData) return;

    const stats = this.dashboardData.statsByStatus || {};
    
    this.stats = {
        total: this.dashboardData.totalNC || Object.values(stats).reduce((a: any, b: any) => a + b, 0) || 0,
        enCours: (stats.PENDING_PILOT || 0) + (stats.PENDING_RQ || 0) + (stats.PENDING_ASSIGNMENT || 0) + (stats.IN_PROGRESS || 0) + (stats.PENDING_PILOT_REVIEW || 0) + (stats.PENDING_CLOSURE || 0),
        retard: stats.OVERDUE || this.dashboardData.retard || 0, 
        imputees: (stats.IMPUTED || 0),
        cloturees: stats.CLOSED || 0,
        draft: stats.DRAFT || 0,
        published: stats.PUBLISHED || 0,
        pendingPilot: stats.PENDING_PILOT || 0,
        rejectedByPilot: stats.REJECTED_BY_PILOT || 0,
        pendingRq: stats.PENDING_RQ || 0,
        rejectedByRq: stats.REJECTED_BY_RQ || 0,
        pendingAssignment: stats.PENDING_ASSIGNMENT || 0,
        inProgress: stats.IN_PROGRESS || 0,
        pendingPilotReview: stats.PENDING_PILOT_REVIEW || 0,
        pendingClosure: stats.PENDING_CLOSURE || 0,
        closed: stats.CLOSED || 0,
        archived: stats.ARCHIVED || 0
    };

    // Pour les graphiques
    this.filteredNc = this.dashboardData.nonConformites || this.dashboardData.content || this.dashboardData.ncs || [];

    // this.UserNCDataAPI();
    this.fetchUserNCData();
  }

  ngOnDestroy() {
      this.destroy$.next();
      this.destroy$.complete();
  }

  protected readonly isUserInRoles = isUserInRoles;
}