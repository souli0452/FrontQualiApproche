import { Component, OnInit, OnDestroy, ViewChild, input, Input } from '@angular/core';
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
import { ApiItemResponse } from '../../../models/response.model';

@Component({
  selector: 'app-nc-analyse-cloture',
  standalone: true,
  imports: [
      CommonModule, 
      NgPrimeModule, 
      NcFilterBarComponent,
      TraitementTableComponent, 
      NCRejetComponent,
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
  motifRejetDialog: boolean = false;

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
    
  ngOnInit() {
    this.fetchData();
  }

  onPageChange(event: { page: number, size: number }) {
    this.currentPage = event.page;
    this.pageSize = event.size;
    this.fetchData();
  }

  fetchData() {
    this.loading = true;

        this.nonConformiteService.nonConformiteParEtapeGetPagination(EtapeTraitement.SUIVI_RQ, this.currentPage, this.pageSize)
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

    handleFilter(filters: any) {
      if (!filters) return;
      
      const { dateDebut, dateFin, process, gravite, origine } = filters;

      this.suiviRqData = this.rawSuiviRqData.filter(item => {
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
    
  rejet(demande: any) {
      this.demande = demande;
      this.motifRejetDialog = true;
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
