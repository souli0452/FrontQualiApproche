import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgPrimeModule } from '../../../../prime-ng.module';
import { RoleService } from '../../../services/non-conformite/role.service';
import { getCurrentUserStructure, generateReportFile, ReportFormat, ReportingInput, TypeDemande, showToast, StatusEnum } from '../../../utils';
import { EtapeTraitement } from '../../../enums';
import { Subject, takeUntil } from 'rxjs';

import { NcFilterBarComponent } from '../../../components/non-conformite/nc-filter-bar/nc-filter-bar';
import { NonConformiteService } from '../../../services/non-conformite/non-conformite.service';

// Nouveaux imports pour le tableau
import { TraitementTableComponent } from '../../../components/non-conformite/table-traitement/traitement-table';
import { MessageService } from 'primeng/api';
import { FeaturesService } from '../../../services/feature-service';
import { NCRejetComponent } from '../nc-rejet/nc-rejet';
import { ApiItemResponse } from '../../../models';

@Component({
  selector: 'app-nc-analyse-reception',
  standalone: true,
  imports: [
      CommonModule, 
      NgPrimeModule, 
      NcFilterBarComponent,
      TraitementTableComponent, 
      NCRejetComponent
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
  motifRejetDialog: boolean = false;
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
        this.nonConformiteService.nonConformiteParStructureEtTraitementGet(EtapeTraitement.RECEPTION, this.userStructure.id)
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

  handleFilter(filters: any) {
    if (!filters) return;
    
    const { dateDebut, dateFin, process, gravite, origine } = filters;

    this.receptionPiloteData = this.rawReceptionPiloteData.filter(item => {
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

  // ============== ACTIONS DU TABLEAU ==============

//   private editer(rowData: any, resp: HttpResponse<any>) {
//       const reportingInput: ReportingInput = {
//           reportFormat: ReportFormat.PDF,
//           reportType: TypeDemande.NON_CONFORMITE,
//           entityId: rowData.id!,
//       };
//       this.featureService.printReport(reportingInput).pipe(takeUntil(this.destroy$))
//           .subscribe({
//               next: arrayBytes => {
//                   if (arrayBytes.byteLength) {
//                       generateReportFile(arrayBytes, reportingInput);
//                       this.dmdTraitement.displayDetails(resp.body);
//                       this.messageService.add({ severity: 'success', summary: 'Succès', detail: "L'opération a réussie !", life: 3000 });
//                   }
//               },
//               error: () => {
//                   this.messageService.add({ severity: 'error', summary: 'ERREUR', detail: "L'opération a échouée !", life: 3000 });
//               }
//           });
//   }

//   edition(demandes: any) {
//     console.log(demandes);
    
//       this.procService.updateNomConformites(demandes).subscribe({
//           next: (data) => {
//               this.editer(demandes[0], data);
//               this.dmdTraitement.closeDetailsDialog();
//           },
//           error: () => {
//               this.messageService.add({ severity: 'error', summary: 'ERREUR', detail: "L'opération a échouée !", life: 3000 });
//           }
//       });
//   }

  rejet(demande: any) {
      this.demande = demande;
      this.motifRejetDialog = true;
      // Note: Il faudra ajouter le composant app-nc-rejet dans le template HTML
      // si tu veux que la pop-up de rejet s'affiche !
  }

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
