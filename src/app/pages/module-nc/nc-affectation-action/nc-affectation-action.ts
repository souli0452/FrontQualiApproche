import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgPrimeModule } from '../../../../prime-ng.module';
import { getCurrentUserStructure } from '../../../utils/global/global-utils';
import { EtapeTraitement } from '../../../enums/enums';
import { Subject, takeUntil } from 'rxjs';
import { NcFilterBarComponent } from '../../../components/non-conformite/nc-filter-bar/nc-filter-bar';
import { TraitementTableComponent } from '../../../components/non-conformite/table-traitement/traitement-table';
import { Structure } from '../../parametrages/structure/structure-config/structure';
import { MessageService } from 'primeng/api';
import { FeaturesService } from '../../../services/feature-service';
import { NonConformiteService } from '../../../services/non-conformite/non-conformite.service';
import { ApiItemResponse } from '../../../models/response.model';

@Component({
  selector: 'app-nc-affectation-action',
  standalone: true,
  imports: [
      CommonModule, 
      NgPrimeModule, 
      NcFilterBarComponent,
      TraitementTableComponent,
  ],
  templateUrl: './nc-affectation-action.html',
  styleUrl: './nc-affectation-action.scss'
})
export class NCAffectationActionComponent implements OnInit, OnDestroy {
    title = 'Affectations des non-conformités';
    @ViewChild(TraitementTableComponent) dmdTraitement!: TraitementTableComponent;
    userStructure: Structure = {};
    protected readonly BtnActions = EtapeTraitement;
    cols: any[] = [];
    motifRejetDialog: boolean = false;
    demande: any;

    affectationData: any[] = [];
    rawAffectationData: any[] = []; 
    totalElements: number = 0;
    currentPage: number = 0;
    pageSize: number = 5;
    totalPages: number = 0;


    loading: boolean = false;
    
    private destroy$ = new Subject<void>();

    constructor(
        protected messageService: MessageService,
        private  featureService:FeaturesService,
        private nonConformiteService:NonConformiteService
    ){
        this.cols = [
            { field: 'numeroReference', header: 'N° ref', type: 'string', filter: true, width: '220px', centered: false },
            { field: 'structureSoumissionLibelle', header: 'Processus Emetteur', type: 'string', filter: true, width: '300px', centered: false },
            {
                field: 'currentUserfullName',
                header: 'Initateur',
                type: 'string',
                filter: true,
                width: '150px',
                centered: false
            },
            { field: 'niveauNonConformiteLibelle', header: 'Gravité', type: 'badge', filter: false, width: '150px', centered: false },
            { field: 'createdAt', header: 'Date soumission', type: 'date', filter: true, width: '150px', centered: false }
        ];
    }
        
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

    // TODO: Adapter la condition si l'affectation n'est pas réservée qu'au Chef
    if (this.userStructure?.id) {
        this.nonConformiteService.nonConformiteParStructureEtTraitementGetPagination(EtapeTraitement.IMPUTATION, this.userStructure.id, this.currentPage, this.pageSize)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (res) => {
                    this.rawAffectationData = res.data.content || [];
                    this.totalElements = res.data.totalElements;
                    this.currentPage = res.data.pageNumber || 0;
                    this.pageSize = res.data.pageSize;
                    this.totalPages = res.data.totalPages;

                    const currentNotifs = this.nonConformiteService.notificationsNC$.value;
                    this.nonConformiteService.notificationsNC$.next({
                        ...currentNotifs,
                        affectation: this.rawAffectationData.length
                    });
                    this.affectationData = [...this.rawAffectationData];
                    this.loading = false;
                },
                error: () => this.loading = false
            });
    } else {
        this.loading = false;
    }
  }

      onSuccess(res: ApiItemResponse<any>) {
          this.dmdTraitement.closeDetailsDialog();
          this.featureService.onReloadRequested(true);
          this.fetchData();
          this.messageService.add({ severity: 'success', summary: 'Succès', detail: "L'opération a réussie !", life: 5000 });
      }

    imputation(selectedDemandes: any) {
        this.nonConformiteService.nonConformiteUpdate(selectedDemandes).subscribe({
            next: (data) => {
                this.onSuccess(data);
            },
            error: () => {
                this.messageService.add({ severity: 'error', summary: 'ERREUR', detail: "L'oppération à échouée ! Veuillez réessayer 7", life: 3000 });
            }
        });
    }

   handleFilter(filters: any) {
    if (!filters) return;
    
    const { dateDebut, dateFin, process, gravite, origine } = filters;

    this.affectationData = this.rawAffectationData.filter(item => {
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