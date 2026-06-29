import { Component, OnInit, OnDestroy, ViewChild} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgPrimeModule } from '../../../../prime-ng.module';
import { RoleService } from '../../../services/non-conformite/role.service'; // 👈 Bon chemin
import { EtapeTraitement } from '../../../enums/enums';
import { Subject, takeUntil } from 'rxjs';
import { NcFilterBarComponent } from '../../../components/non-conformite/nc-filter-bar/nc-filter-bar';
import { NonConformiteService } from '../../../services/non-conformite/non-conformite.service';
import { TraitementTableComponent } from '../../../components/non-conformite/table-traitement/traitement-table';
import { NCRejetComponent } from '../nc-rejet/nc-rejet';
import { MessageService } from 'primeng/api';
import { FeaturesService } from '../../../services/feature-service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-nc-analyse-validation',
  standalone: true,
  imports: [
      CommonModule, 
      NgPrimeModule, 
      NcFilterBarComponent,
      TraitementTableComponent, 
      NCRejetComponent,
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
  motifRejetDialog: boolean = false;

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

        this.nonConformiteService.nonConformiteParEtapeGetPagination(EtapeTraitement.VALIDATION_RS, this.currentPage, this.pageSize)
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

    handleFilter(filters: any) {
      if (!filters) return;
      
      const { dateDebut, dateFin, process, gravite, origine } = filters;

      this.validationRqData = this.rawValidationRqData.filter(item => {
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

          if (process && process.id) {
              if (item.typeProcessusId !== process.id) isValid = false;
          }

          if (gravite && gravite.id) {
              if (item.niveauNonConformiteId !== gravite.id) isValid = false;
          }

          if (origine && origine.id) {
              if (item.typeNonConformiteId !== origine.id) isValid = false;
          }

          return isValid;
      });
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

  rejet(demande: any) {
      this.demande = demande;
      this.motifRejetDialog = true;
      // Note: Il faudra ajouter le composant app-nc-rejet dans le template HTML
      // si tu veux que la pop-up de rejet s'affiche !
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
