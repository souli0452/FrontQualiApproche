import { Component, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MessageService } from 'primeng/api';
import { EtapeTraitement } from '../../../enums/enums';
import { HttpResponse } from '@angular/common/http';
import { showToast, StatusEnum } from '../../../utils/global/global-utils';
import { CommonModule } from '@angular/common';
import { NgPrimeModule } from '../../../../prime-ng.module';
import { FeaturesService } from '../../../services/feature-service';
import { TraitementTableComponent } from '../../../components/non-conformite/table-traitement/traitement-table';
import { AuthService } from '../../../services/auth-services/auth.service';
import { forkJoin, of, Subject } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ProcNonConformiteService } from '../../../services/non-conformite/proc-non-conformite.service';
import { NcFilter, NcFilterBarComponent } from '../../../components/non-conformite/nc-filter-bar/nc-filter-bar';
import { NonConformiteService } from '../../../services/non-conformite/non-conformite.service';

@Component({
    selector: 'app-nc-traitement-suivi',
    templateUrl: './nc-traitement-suivi.html',
    styleUrl: './nc-traitement-suivi.scss',
    standalone: true,
    imports:[
        CommonModule,
        NgPrimeModule,
        NcFilterBarComponent,
        TraitementTableComponent
    ]
})
export class NCTraitementSuiviComponent {
    demandeList: any = [];
    rawDemandeList: any[] = [];

    totalElements: number = 0;
    currentPage: number = 0;
    pageSize: number = 5;
    totalPages: number = 0;

    currentFilters: NcFilter | undefined;

    title = 'Consultations des non-conformités';
    loading: boolean = false;
    cols: any[] = [];
    private destroy$ = new Subject<void>();

    constructor(
      private featureService:FeaturesService,
      protected messageService: MessageService,
      private service:ProcNonConformiteService,
      private nonConformiteService:NonConformiteService,
      private route: ActivatedRoute,
      private authService: AuthService) 
      {
        this.cols = [
            { field: 'numeroReference', header: 'N° Ref', type: 'string', filter: true, width: '250px', centered: false },
            { field: 'structureSoumissionLibelle', header: 'Processus Emetteur', type: 'string', filter: true, width: '150px', centered: false },
            // L'étape du circuit, et non le statut : c'est elle qui dit où en est le dossier, et
            // c'est le circuit qui la nomme. Le type « enum » du tableau affiche l'étape courante
            // rendue par le moteur ; à défaut de circuit en cours — un dossier clos — il retombe sur
            // ce champ, d'où `workflowStatus` : la dernière étape connue, plutôt qu'un statut
            // technique (« PUBLISHED ») qui ne dit rien à qui lit la liste.
            { field: 'workflowStatus', header: 'Étape du circuit', type: 'enum', filter: true, width: '250px', centered: false },
            { field: 'dateVisaEmetteur', header: 'Date soumission', type: 'string', width: '200px' },
            { field: 'niveauNonConformiteLibelle', header: 'Gravité', type: 'badge', filter: false, width: '150px', centered: false },
        ];
    }
    @ViewChild(TraitementTableComponent) dmdTraitement!: TraitementTableComponent;

    protected readonly BtnActions = EtapeTraitement;

    handleFilter(event: NcFilter) {
        this.currentFilters = event;
        this.applyLocalFilters();
    }

    ngOnInit() {
        this.loadSuiviData();
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Charge la consultation : tous les dossiers que l'appelant a le droit de voir, tous processus
     * confondus.
     *
     * <p>L'écran choisissait son point d'entrée selon le rôle — la liste générale pour le
     * responsable qualité, celle d'une structure pour le pilote, celle d'un utilisateur pour l'agent.
     * Deux conséquences, toutes deux constatées : la liste du pilote était bâtie sur un seul champ de
     * structure, si bien qu'un dossier transféré ou clos en sortait et disparaissait de son écran ;
     * et la portée de la consultation dépendait d'un aiguillage de gabarit, alors que le serveur la
     * tient déjà.</p>
     *
     * <p>Une seule source désormais. C'est {@code visiblesParLAppelant} qui décide, côté serveur :
     * l'administration et la responsabilité qualité voient tout ; les autres voient les dossiers de
     * leur structure — émis par elle <b>ou</b> qui lui sont adressés — plus les leurs, ceux qu'ils
     * ont déclarés et ceux qui leur sont imputés. Aucun filtre sur l'état : un dossier clos reste
     * consultable, ce qui est le propre d'un écran de suivi.</p>
     */
    loadSuiviData() {
        this.getDemandeList();
    }

    /**
     * Filtrage local, et il le reste — contrairement aux autres écrans du module.
     *
     * <p>Les sept écrans qui listent une seule requête ont été portés sur {@code POST /search} : la
     * base fait la sélection, et le compteur comme les pages suivantes s'accordent enfin avec le
     * filtre. Celui-ci ne liste pas une requête : sa liste est l'<b>union</b> de plusieurs sources,
     * dont l'une n'est pas une interrogation de table — les dossiers sur lesquels l'appelant a une
     * décision ouverte sont calculés par le moteur de workflow, à partir des habilitations d'étape.
     * Aucun jeu de critères ne saurait la reproduire.</p>
     *
     * <p>Le filtrage porte donc sur la liste assemblée. C'est le seul endroit du module où il a
     * encore un sens : ne pas le remplacer par un appel à la recherche, qui perdrait les lignes
     * venues des plans d'action.</p>
     */
    applyLocalFilters() {
        const filters = this.currentFilters || {} as any;
        const { dateDebut, dateFin, process, gravite, origine } = filters;

        const filterFn = (item: any) => {
            if (!item) return false;
            let isValid = true;

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
            // 1. Pour les Processus
            if (process && process.length > 0) {
                const selectedIds = process.map((p: any) => p.id);
                if (!selectedIds.includes(item.typeProcessusId)) {
                    isValid = false;
                }
            }

            // 2. Pour les Gravités
            if (gravite && gravite.length > 0) {
                const selectedIds = gravite.map((g: any) => g.id);
                if (!selectedIds.includes(item.niveauNonConformiteId)) {
                    isValid = false;
                }
            }

            // 3. Pour les Origines
            if (origine && origine.length > 0) {
                const selectedIds = origine.map((o: any) => o.id);
                if (!selectedIds.includes(item.typeNonConformiteId)) {
                    isValid = false;
                }
            }

            return isValid;
        };

        this.demandeList = this.rawDemandeList.filter(filterFn);
    }


    /**
     * Ouvre la fiche désignée par « ?ncId= » — le lien des courriels d'étape.
     *
     * <p>Le dossier n'est pas forcément dans la page chargée : il est relu par son identifiant,
     * puis la fiche s'ouvre comme si la ligne avait été cliquée. Introuvable ou hors de portée,
     * rien ne s'ouvre et l'écran de suivi reste utilisable — le lien d'un courriel ancien ne doit
     * pas produire une erreur bloquante.</p>
     */
    private ouvrirLaFicheDeLAdresse(): void {
        const ncId = this.route.snapshot.queryParamMap.get('ncId');
        if (!ncId) {
            return;
        }
        const dejaChargee = this.rawDemandeList.find((nc: any) => nc.id === ncId);
        if (dejaChargee) {
            this.dmdTraitement.displayDetails(dejaChargee);
            return;
        }
        this.nonConformiteService.findNCById(ncId).subscribe({
            next: (reponse: any) => {
                const nc = reponse?.data ?? reponse;
                if (nc?.id) {
                    this.dmdTraitement.displayDetails(nc);
                }
            },
            error: () => { /* dossier hors de portée : le suivi reste l'écran. */ }
        });
    }

    /** La fiche ne s'ouvre qu'une fois : revenir du dialogue ne doit pas la rouvrir. */
    private ficheDeLAdresseOuverte = false;

    getDemandeList() {
        this.loading = true;
        /*
        this.nonConformiteService.nonConformiteGetAll(this.currentPage, this.pageSize).subscribe({
            next: (data) => {
                this.rawDemandeList = data.data.content || [];
                this.totalElements = data.data.totalElements ?? this.rawDemandeList.length;
                this.totalPages = data.data.totalPages ?? 1;
                this.currentPage = data.data.pageNumber ?? this.currentPage;
                this.pageSize = data.data.pageSize ?? this.pageSize;
                this.applyLocalFilters();
                this.featureService.onReloadRequested(true);
                this.loading = false;
                if (!this.ficheDeLAdresseOuverte) {
                    this.ficheDeLAdresseOuverte = true;
                    this.ouvrirLaFicheDeLAdresse();
                }
            },
            error: (error) => {
                this.loading = false;
            }
        });
        */
        forkJoin({
            ncATraiter: this.nonConformiteService.nonConformiteATraiter(this.currentPage, this.pageSize),
            planActions: this.nonConformiteService.planActionsATraiter()
        }).subscribe({
            next: (res: any) => {
                const ncList = res.ncATraiter || [];
                const planList = res.planActions || [];
                
                if (planList.length > 0) {
                    const enrichmentRequests = planList.map((plan: any) => {
                        const localParent = ncList.find((nc: any) => nc.id === plan.nonConformeId);
                        if (localParent) {
                            plan.nonConformite = { ...plan.nonConformite, ...localParent };
                            return of(plan);
                        } else if (plan.nonConformeId) {
                            return this.nonConformiteService.findNCById(plan.nonConformeId).pipe(
                                map((ncRes: any) => {
                                    const parentNC = ncRes?.data ?? ncRes;
                                    if (parentNC) {
                                        plan.nonConformite = { ...plan.nonConformite, ...parentNC };
                                    }
                                    return plan;
                                }),
                                catchError(() => of(plan))
                            );
                        } else {
                            return of(plan);
                        }
                    });

                    forkJoin(enrichmentRequests).subscribe({
                        next: (enrichedPlans: any) => {
                            this.rawDemandeList = [...ncList, ...enrichedPlans];
                            this.finalizeDemandeList();
                        },
                        error: () => {
                            this.rawDemandeList = [...ncList, ...planList];
                            this.finalizeDemandeList();
                        }
                    });
                } else {
                    this.rawDemandeList = [...ncList];
                    this.finalizeDemandeList();
                }
            },
            error: (error) => {
                this.loading = false;
            }
        });
    }

    private finalizeDemandeList() {
        this.totalElements = this.rawDemandeList.length;
        this.totalPages = 1;
        this.applyLocalFilters();

        // ✅ Synchronise le badge "Traitement & Suivi" avec les données fraîches.
        // On recalcule chaque compteur spécifique à partir de la liste chargée :
        // le badge était périmé car la vue d'ensemble ne se recharge pas automatiquement
        // après chaque action de workflow (resoumission, validation…).
        // Les clés propres aux plans d'action (imputees, nonTraiter) sont préservées via le spread.
        const getCount = (etape: string) =>
            this.rawDemandeList.filter((item: any) => item.etatTraitement === etape && !this.isRejet(item)).length;

        const currentNotifs = this.nonConformiteService.notificationsNC$.value;
        this.nonConformiteService.notificationsNC$.next({
            ...currentNotifs,
            total:            this.rawDemandeList.length,
            reception:        getCount('RECEPTION'),
            validationRQ:     getCount('VALIDATION_RQ') + getCount('VALIDATION_RS'),
            affectation:      getCount('IMPUTATION'),
            validationPilote: getCount('VALIDATION'),
            cloture:          getCount('SUIVI_RQ'),
            soumission:       this.rawDemandeList.filter((item: any) => this.isRejet(item)).length,
        });

        this.featureService.onReloadRequested(true);
        this.loading = false;
        if (!this.ficheDeLAdresseOuverte) {
            this.ficheDeLAdresseOuverte = true;
            this.ouvrirLaFicheDeLAdresse();
        }
    }

    onSuccess(res: HttpResponse<any>) {
        this.getDemandeList()
        showToast(StatusEnum.success, res.status, null, this.messageService);
        this.dmdTraitement.closeDetailsDialog();
    }

    cloture(dmd:any) {
        this.service.updateNomConformite(dmd,dmd.id).subscribe({
            next: (data) => {
                this.onSuccess(data);
            },
            error: (error) => {

            }
        })
    }

    onPageChange(event: { page: number, size: number }) {
        this.currentPage = event.page;   // ✅ mettre à jour la page
        this.pageSize = event.size;      // ✅ mettre à jour la taille
        this.loadSuiviData();
    }

    // L'édition de la fiche de clôture est le fait de la fiche elle-même (traitement-table) :
    // le dossier clôturé s'édite partout où il s'ouvre, sans câblage par écran.

    isRejet(rowData: any): boolean {
        if (!rowData || rowData.status === 'DRAFT' || rowData.status === 'Brouillon') return false;

        const STEP_ORDER: Record<string, number> = {
            'SOUMISSION': 1,
            'RECEPTION': 2,
            'VALIDATION_RQ': 3,
            'IMPUTATION': 4,
            'TRAITEMENT': 5,
            'VALIDATION': 6,
            'VALIDATION_RS': 7,
            'SUIVI_RQ': 8,
            'CLOTURE': 9,

            // Support des codes numériques du moteur de workflow
            '1': 1, // SOUMISSION
            '2': 2, // RECEPTION
            '3': 3, // VALIDATION_RQ
            '4': 4, // IMPUTATION
            '5': 5, // TRAITEMENT
            '6': 6, // VALIDATION
            '7': 7, // VALIDATION_RS
            '8': 8, // SUIVI_RQ
            '9': 9  // CLOTURE
        };

        const currentOrder = STEP_ORDER[rowData.etatTraitement || ''] || 0;

        // Rechercher dans l'historique à quelle étape le document de rejet a été attaché
        const saisies = rowData.workflowState?.saisies || [];
        const docRejetId = rowData.docRejet?.id?.toLowerCase();
        const docRejetNom = (rowData.docRejet?.nom || rowData.docRejet?.nomFichier || '').toLowerCase();

        const rejectionSaisie = saisies.find((s: any) => {
            const val = (s.value || '').toLowerCase();
            const fieldName = (s.fieldName || '').toLowerCase();
            const fieldLabel = (s.fieldLabel || '').toLowerCase();

            return fieldName.includes('rejet') || 
                   fieldLabel.includes('rejet') ||
                   fieldName === 'docrejet' ||
                   (docRejetId && val.includes(docRejetId)) ||
                   (docRejetNom && val.includes(docRejetNom));
        });

        if (rejectionSaisie) {
            const rejectOrder = STEP_ORDER[rejectionSaisie.stepCode || ''] || 0;
            if (rejectOrder > currentOrder) {
                return true; // Rejet actif
            }
        }

        // Cas de repli : retour à l'étape initiale SOUMISSION
        if (rowData.etatTraitement === 'SOUMISSION' && rowData.status !== 'DRAFT') {
            return true;
        }

        return false;
    }
}
