import { Component, OnInit, OnDestroy, ViewChild} from '@angular/core';
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
import { Router } from '@angular/router';
import { criteresDeRecherche } from '../../../utils/non-conformite/nc-criteres';

@Component({
  selector: 'app-nc-analyse-validation',
  standalone: true,
  imports: [
      CommonModule, 
      NgPrimeModule, 
      NcFilterBarComponent,
      TraitementTableComponent,
  ],
  templateUrl: './nc-analyse-validation.html',
  styleUrl: './nc-analyse-validation.scss'
})
export class AnalyseValidationComponent implements OnInit, OnDestroy {
  title = 'Analyse et validation des Non-Conformités';
  
  validationPiloteData: any[] = [];

  demande: any;

  @ViewChild(TraitementTableComponent) dmdTraitement!: TraitementTableComponent;

  validationRqData: any[] = [];
  rawValidationRqData: any[] = []; 
  totalElements: number = 0;
  currentPage: number = 0;
  pageSize: number = 5;
  totalPages: number = 0;

  clotureData: any[] = [];
  loading: boolean = false;
  userStructure: any = {};
  
  private destroy$ = new Subject<void>();

  protected readonly BtnActions = EtapeTraitement;

  cols: any[] = [];

  constructor(
    public roleService: RoleService,
    protected messageService: MessageService,
    private  featureService:FeaturesService,
    private nonConformiteService:NonConformiteService,
    private router: Router
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
    // this.userStructure = getCurrentUserStructure();
    this.fetchData();
  }

  onPageChange(event: { page: number, size: number }) {
    this.currentPage = event.page;
    this.pageSize = event.size;
    this.fetchData();
  }

  fetchData() {
    this.loading = true;

        const criteres = criteresDeRecherche(
            [{ field: 'etatTraitement', operator: 'EQ', value: EtapeTraitement.VALIDATION_RS }],
            this.currentFilters);

        this.nonConformiteService.rechercher(criteres, this.currentPage, this.pageSize)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (res) => {
                    this.rawValidationRqData = res.data.content || [];
                    this.totalElements = res.data.totalElements;
                    this.currentPage = res.data.pageNumber || 0;
                    this.pageSize = res.data.pageSize;
                    this.totalPages = res.data.totalPages;

                    const currentNotifs = this.nonConformiteService.notificationsNC$.value;
                    this.nonConformiteService.notificationsNC$.next({
                        ...currentNotifs,
                        validation: this.totalElements
                    });
                    this.validationRqData = [...this.rawValidationRqData];
                    this.loading = false;
                },
                error: () => this.loading = false
            });
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

  validationRs(demandes: any) {
      const clean = (val: any) => (val === '' ? null : val);
      const cleanedDemandes = demandes.map((demande: any) => {
          const { btnActions, ...demandeRest } = demande;
          const actions = demandeRest.planActions || [];
          const cleanedActions = actions.map(({ responsable, dateEcheance, ...rest }: any) => ({
              ...rest,
              dateEcheance: dateEcheance?.replace(/\//g, "-")
          }));

          return {
              ...demandeRest,
              pertinanceRs: clean(demandeRest.pertinanceRs),
              justificationRs: clean(demandeRest.justificationRs),
              pertinancePilote: clean(demandeRest.pertinancePilote),
              justificationPilote: clean(demandeRest.justificationPilote),
              pertinanceRsSuivi: clean(demandeRest.pertinanceRsSuivi),
              numeroFdac: clean(demandeRest.numeroFdac),
              circuit: clean(demandeRest.circuit),
              actionId: clean(demandeRest.actionId),
              origineId: clean(demandeRest.origineId),
              fonctionEmetteur: clean(demandeRest.fonctionEmetteur),
              planActions: cleanedActions
          };
      });

      this.nonConformiteService.nonConformiteUpdate(cleanedDemandes).subscribe({
          next: (data) => {
              this.featureService.onReloadRequested(true);
              this.dmdTraitement.closeDetailsDialog();
              this.router.navigate(['/non-conformite/vue-ensemble']);
              this.messageService.add({ severity: 'success', summary: 'Succès', detail: "L'oppération à réussie !", life: 5000 });
          },
          error: (error) => {
              this.messageService.add({ severity: 'error', summary: 'Erreur', detail: "L'oppération à échouée ! Veuillez réessayer 16", life: 5000 });
              this.dmdTraitement.closeDetailsDialog();
              console.log("ERREUR LORS DE LA VALIDATION", error);
              
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
