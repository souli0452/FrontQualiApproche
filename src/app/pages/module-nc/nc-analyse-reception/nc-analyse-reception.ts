import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgPrimeModule } from '../../../../prime-ng.module';
import { RoleService } from '../../../services/non-conformite/role.service';
import { getCurrentUserStructure } from '../../../utils/global/global-utils';
import { EtapeTraitement } from '../../../enums/enums';
import { Subject, takeUntil } from 'rxjs';

import { NcFilter, NcFilterBarComponent } from '../../../components/non-conformite/nc-filter-bar/nc-filter-bar';
import { NonConformiteService } from '../../../services/non-conformite/non-conformite.service';

// Nouveaux imports pour le tableau
import { TraitementTableComponent } from '../../../components/non-conformite/table-traitement/traitement-table';
import { MessageService } from 'primeng/api';
import { FeaturesService } from '../../../services/feature-service';
import { ApiItemResponse } from '../../../models/response.model';
import { criteresDeRecherche } from '../../../utils/non-conformite/nc-criteres';

@Component({
  selector: 'app-nc-analyse-reception',
  standalone: true,
  imports: [
      CommonModule, 
      NgPrimeModule, 
      NcFilterBarComponent,
      TraitementTableComponent
  ],
  providers: [MessageService], // Essentiel pour les toasts
  templateUrl: './nc-analyse-reception.html',
  styleUrl: './nc-analyse-reception.scss'
})
export class AnalyseReceptionComponent implements OnInit, OnDestroy {
  title = 'Réceptions des Non-Conformités';
  
  receptionPiloteData: any[] = [];
  totalElements: number = 0;
  currentPage: number = 0;
  pageSize: number = 0;
  totalPages: number = 0;

  rawReceptionPiloteData: any[] = []; 
  loading: boolean = false;
  userStructure: any = {};
  
  private destroy$ = new Subject<void>();

  // Propriétés du tableau
  protected readonly BtnActions = EtapeTraitement;
  cols: any[] = [];
  demande: any;

  @ViewChild(TraitementTableComponent) dmdTraitement!: TraitementTableComponent;

  constructor(
    public roleService: RoleService,
    private nonConformiteService: NonConformiteService,
    protected messageService: MessageService,
    private featureService: FeaturesService
  ){
        this.cols = [
            { field: 'numeroReference', header: 'N° ref', type: 'string', filter: true, width: '150px', centered: false },
            { field: 'structureSoumissionLibelle', header: 'Processus Emetteur', type: 'string', filter: true, width: '150px', centered: false },
            { field: 'currentUserfullName', header: 'Initateur', type: 'string', filter: true, width: '150px', centered: false },
            { field: 'status', header: 'Statut', type: 'enum', filter: true, width: '150px', centered: false },
            { field: 'niveauNonConformiteLibelle', header: 'Gravité', type: 'badge', filter: false, width: '150px', centered: false },
            { field: 'createdAt', header: 'Date soumission', type: 'date', filter: true, width: '150px', centered: false }
        ];
  }
    
  /** Ce qui est coché dans la barre, transmis au serveur à chaque chargement. */
  currentFilters?: NcFilter;

  ngOnInit() {
    this.userStructure = getCurrentUserStructure();
    this.fetchData();
  }

  onPageChange(event: { page: number, size: number }) {
      this.currentPage = event.page;
      this.pageSize = event.size;
      this.fetchData();
  }

  fetchData() {
    this.loading = true;

    if (this.roleService.isChef && this.userStructure?.id) {
        // Le périmètre de l'écran, tel que le point d'entrée qu'il appelait le posait : l'étape
        // de réception, dans la structure émettrice du dossier.
        const criteres = criteresDeRecherche([
                { field: 'etatTraitement', operator: 'EQ', value: EtapeTraitement.RECEPTION },
                { field: 'structureSoumissionId', operator: 'EQ', value: this.userStructure.id }
            ], this.currentFilters);

        this.nonConformiteService.rechercher(criteres, this.currentPage, this.pageSize)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (res) => {
                    this.rawReceptionPiloteData = res.data.content || [];
                    this.totalElements = res.data.totalElements;
                    this.currentPage = res.data.pageNumber || 0;
                    this.pageSize = res.data.pageSize;
                    this.totalPages = res.data.totalPages;

                    const currentNotifs = this.nonConformiteService.notificationsNC$.value;
                    this.nonConformiteService.notificationsNC$.next({
                        ...currentNotifs,
                        reception: this.totalElements
                    });
                    this.receptionPiloteData = [...this.rawReceptionPiloteData];
                    this.loading = false;
                },
                error: () => this.loading = false
            });
    }
  }

    /**
     * Un filtre change : la liste est redemandée au serveur depuis la première page.
     *
     * <p>Repartir de la première page n'est pas un détail : restreindre en restant à la page cinq
     * afficherait une page vide alors que des dossiers correspondent.</p>
     */
    handleFilter(filters: NcFilter) {
      this.currentFilters = filters;
      this.currentPage = 0;
      this.fetchData();
    }

  // ============== ACTIONS DU TABLEAU ==============

    onSuccess(res: ApiItemResponse<any>) {
        this.dmdTraitement.closeDetailsDialog();
        this.featureService.onReloadRequested(true);
        this.fetchData();
        this.messageService.add({ severity: 'success', summary: 'Succès', detail: "L'opération a réussie !", life: 5000 });
    }

    reception(dmd: any) {
        this.nonConformiteService.nonConformiteUpdate(dmd).subscribe({
            next: (data) => {
                this.onSuccess(data);
            },
            error: (error) => {
                this.messageService.add({ severity: 'error', summary: 'Erreur', detail: "L'opération a échouée !", life: 3000 });
            }
        });
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
