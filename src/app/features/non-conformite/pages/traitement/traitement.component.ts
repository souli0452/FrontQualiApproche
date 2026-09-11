import { Component, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MessageService } from 'primeng/api';
import { EtapeTraitement } from '../../models';
import { HttpResponse } from '@angular/common/http';
import { showToast, StatusEnum, BasePaginationComponent } from '@shared';
import { CommonModule } from '@angular/common';
import { NgPrimeModule } from '@prime-ng';
import { FeaturesService } from '@core';
import { TraitementTableComponent, NcFilter, NcFilterBarComponent } from '../../components';
import { AuthService, currentUserState } from '@core/auth';
import { forkJoin, of, Subject } from 'rxjs';
import { catchError, map, debounceTime, takeUntil } from 'rxjs/operators';
import { NonConformiteService } from '../../services';
import { AlertService } from '@shared';

@Component({
    selector: 'app-nc-traitement',
    templateUrl: './traitement.component.html',
    styleUrl: './traitement.component.scss',
    standalone: true,
    imports:[
        CommonModule,
        NgPrimeModule,
        NcFilterBarComponent,
        TraitementTableComponent
    ]
})
export class NCTraitementComponent extends BasePaginationComponent {
    filteredDemandeList: any[] = [];
    hasActiveFilters: boolean = false;

    get demandeList(): any[] {
        return this.hasActiveFilters ? this.filteredDemandeList : this.dataList;
    }
    get rawDemandeList(): any[] {
        return this.dataList;
    }
    get currentTotalElements(): number {
        return this.hasActiveFilters ? this.filteredDemandeList.length : this.totalElements;
    }

    currentFilters: NcFilter | undefined;

    title = 'Traitement des non-conformités';
    cols: any[] = [];
    private destroy$ = new Subject<void>();

    constructor(
      private featureService:FeaturesService,
      protected messageService: MessageService,
      private service: NonConformiteService,
      private nonConformiteService:NonConformiteService,
      private route: ActivatedRoute,
      private alertService: AlertService,
      private authService: AuthService) 
      {
        super();
        this.cols = [
            { field: 'numeroReference', header: 'N° Ref', type: 'string', filter: true, width: '180px', centered: false },
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
        const { process, gravite, origine } = event || {};
        const hasProcess = !!(process && process.length > 0);
        const hasGravite = !!(gravite && gravite.length > 0);
        const hasOrigine = !!(origine && origine.length > 0);

        // Un filtre est actif si un processus, une gravité ou une origine est sélectionné
        this.hasActiveFilters = hasProcess || hasGravite || hasOrigine;
        this.applyLocalFilters();
    }

    ngOnInit() {
        const cur: any = currentUserState.value ?? JSON.parse(localStorage.getItem('currentUser') || '{}');
        const roles: string[] = cur?.roles || cur?.user?.roles || [];
        const perms: string[] = cur?.permissions || [];

        this.fetchObject();

        this.featureService.reaload$
            .pipe(
                debounceTime(300),
                takeUntil(this.destroy$)
            )
            .subscribe(() => {
                this.getDemandeList();
                this.nonConformiteService.rafraichirNotifications();
            });
    }

    fetchObject(): void {
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
        if (!this.hasActiveFilters) {
            this.filteredDemandeList = [...this.dataList];
            return;
        }

        const filters = this.currentFilters || {} as any;
        const { dateDebut, dateFin, process, gravite, origine } = filters;

        const filterFn = (item: any) => {
            if (!item) return false;
            let isValid = true;

            if (dateDebut || dateFin) {
                const itemDateStr = item.dateVisaEmetteur || item.dateCreation || item.createdAt || item.date;
                if (itemDateStr) {
                    const itemDate = new Date(itemDateStr);
                    if (!isNaN(itemDate.getTime())) {
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
            }
            // 1. Pour les Processus
            if (process && process.length > 0) {
                const selectedIds = process.map((p: any) => p.id);
                if (!selectedIds.includes(item.typeProcessusId) && !selectedIds.includes(item.structureSoumissionId) && !selectedIds.includes(item.origineId)) {
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

        this.filteredDemandeList = this.dataList.filter(filterFn);
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
        this.nonConformiteService.nonConformiteATraiterPage(this.currentPage, this.pageSize).subscribe({
            next: (res: any) => {
                this.applyPagination(res);
                this.finalizeDemandeList();
            },
            error: (error) => {
                    console.error('Erreur chargement traitement NC', error);
                    this.dataList = [];
                    this.totalElements = 0;
                    this.loading = false;
            }
        });
    }

    private finalizeDemandeList() {
        setTimeout(() => {
            this.applyLocalFilters();
            this.loading = false;
            if (!this.ficheDeLAdresseOuverte) {
                this.ficheDeLAdresseOuverte = true;
                this.ouvrirLaFicheDeLAdresse();
            }
        }, 300);
    }

    onSuccess(res: HttpResponse<any>) {
        this.getDemandeList()
        this.alertService.showSuccess("Opération effectuée avec succès");
        this.dmdTraitement.closeDetailsDialog();
    }

    cloture(dmd:any) {
        this.service.updateNonConformite(dmd,dmd.id).subscribe({
            next: (data) => {
                this.onSuccess(data);
            },
            error: (error) => {

            }
        })
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
