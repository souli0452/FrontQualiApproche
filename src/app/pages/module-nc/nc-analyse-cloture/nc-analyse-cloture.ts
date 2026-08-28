import { Component, OnInit, OnDestroy, ViewChild, input, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgPrimeModule } from '../../../../prime-ng.module';
import { RoleService } from '../../../services/non-conformite/role.service'; // 👈 Bon chemin
import { EtapeTraitement } from '../../../enums/enums';
import { Subject, takeUntil } from 'rxjs';
import { NcFilter, NcFilterBarComponent } from '../../../components/non-conformite/nc-filter-bar/nc-filter-bar';
import { NonConformiteService } from '../../../services/non-conformite/non-conformite.service';
import { TraitementTableComponent } from '../../../components/non-conformite/table-traitement/traitement-table';
import { MessageService } from 'primeng/api';
import { FeaturesService } from '../../../services/feature-service';
import { ApiItemResponse } from '../../../models/response.model';
import { criteresDeRecherche } from '../../../utils/non-conformite/nc-criteres';

@Component({
  selector: 'app-nc-analyse-cloture',
  standalone: true,
  imports: [
      CommonModule, 
      NgPrimeModule, 
      NcFilterBarComponent,
      TraitementTableComponent,
  ],
  templateUrl: './nc-analyse-cloture.html',
  styleUrl: './nc-analyse-cloture.scss'
})
export class AnalyseClotureComponent implements OnInit, OnDestroy {
  title = 'Analyse et Clôture des Non-Conformités';

  demande: any;

  @ViewChild(TraitementTableComponent) dmdTraitement!: TraitementTableComponent;

  suiviRqData: any[] = [];
  rawSuiviRqData: any[] = []; 
  totalElements: number = 0;
  currentPage: number = 0;
  pageSize: number = 5;
  totalPages: number = 0;

  loading: boolean = false;
  
  private destroy$ = new Subject<void>();

  protected readonly BtnActions = EtapeTraitement;

  cols: any[] = [];

  constructor(
    public roleService: RoleService,
    protected messageService: MessageService,
    private  featureService:FeaturesService,
    private nonConformiteService:NonConformiteService,
  ){
    this.cols = [
        { field: 'numeroReference', header: 'N° Ref', type: 'string', filter: true, width: '220px', centered: false },
        { field: 'structureSoumissionLibelle', header: 'Processus Emetteur', type: 'string', filter: true, width: '200px', centered: true },
        { field: 'niveauNonConformiteLibelle', header: 'Gravité', type: 'badge', filter: false, width: '150px', centered: false },
        { field: 'createdAt', header: 'Date soumission', type: 'date', filter: true, width: '150px', centered: false }
    ];
  }
    
  /** Ce qui est coché dans la barre, transmis au serveur à chaque chargement. */
  currentFilters?: NcFilter;

  ngOnInit() {
    this.fetchData();
  }

  onPageChange(event: { page: number, size: number }) {
    this.currentPage = event.page;
    this.pageSize = event.size;
    this.fetchData();
  }

  /**
   * Charge l'étape de suivi qualité, filtres compris.
   *
   * <p>La sélection est faite par la base : le périmètre de l'écran — l'étape que le circuit lui
   * confie — et ce que l'utilisateur a coché dans la barre partent ensemble. L'écran filtrait
   * jusqu'ici la page déjà chargée, si bien que le compteur annonçait un total qui ne
   * correspondait à rien et que les dossiers des pages suivantes restaient invisibles.</p>
   */
  fetchData() {
    this.loading = true;

    const criteres = criteresDeRecherche(
        [{ field: 'etatTraitement', operator: 'EQ', value: EtapeTraitement.SUIVI_RQ }],
        this.currentFilters);

    this.nonConformiteService.rechercher(criteres, this.currentPage, this.pageSize)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (res) => {
                    this.rawSuiviRqData = res.data.content || [];
                    this.totalElements = res.data.totalElements;
                    this.currentPage = res.data.pageNumber || 0;
                    this.pageSize = res.data.pageSize;
                    this.totalPages = res.data.totalPages;

                    const currentNotifs = this.nonConformiteService.notificationsNC$.value;
                    this.nonConformiteService.notificationsNC$.next({
                        ...currentNotifs,
                        validation: this.totalElements
                    });
                    this.suiviRqData = [...this.rawSuiviRqData];
                    this.loading = false;
                },
                error: () => this.loading = false
            });
    }

    /**
     * Un filtre change : la liste est redemandée depuis la première page.
     *
     * <p>Repartir de la première page n'est pas un détail : restreindre en restant à la page cinq
     * afficherait une page vide alors que des dossiers correspondent.</p>
     */
    handleFilter(filters: NcFilter) {
      this.currentFilters = filters;
      this.currentPage = 0;
      this.fetchData();
    }
    
    cloture(demandes: any) {
        const demandesArray = Array.isArray(demandes) ? demandes : [demandes];
        const cleanedDemandes = demandesArray.map((demande: any) => {
            if (demande.planActions && Array.isArray(demande.planActions)) {
                const cleanedActions = demande.planActions.map((action: any) => {
                    const { responsable, dateEcheance, ...rest } = action;
                    return {
                        ...rest,
                        dateEcheance: typeof dateEcheance === 'string' ? dateEcheance.replace(/\//g, "-") : dateEcheance
                    };
                });
                return {
                    ...demande,
                    planActions: cleanedActions
                };
            }
            return demande;
        });

        this.nonConformiteService.nonConformiteUpdate(cleanedDemandes).subscribe({
            next: (data) => {
                this.onSuccess(data);
            },
            error: (error) => {
                this.messageService.add({ severity: 'error', summary: 'ERREUR', detail: "L'oppération a échoué ! Veuillez réessayer", life: 3000 });
            }
        });
    }


    onSuccess(res: ApiItemResponse<any>) {
        this.dmdTraitement.closeDetailsDialog();
        this.featureService.onReloadRequested(true);
        this.fetchData();
        this.messageService.add({ severity: 'success', summary: 'Succès', detail: "L'opération a réussie !", life: 5000 });
    }
    
    ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

    hideDialog(event: any) {
      if (event) {
          this.dmdTraitement.displayDetails();
          this.featureService.onReloadRequested(true);
      }
  }
}
