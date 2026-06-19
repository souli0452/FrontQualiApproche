import { Component, OnInit, OnDestroy, ViewChild, input, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgPrimeModule } from '../../../../prime-ng.module';
import { RoleService } from '../../../services/non-conformite/role.service'; // 👈 Bon chemin
import { getCurrentUserStructure } from '../../../utils';
import { EtapeTraitement } from '../../../enums';
import { Subject, takeUntil, forkJoin } from 'rxjs';

// 👇 N'oubliez pas d'importer les composants de vos deux tableaux
import { ValidationRQComponent } from '../nc-vue-ensemble/nc-validation-rq/nc-validation-rq';
import { ReceptionComponent } from '../nc-vue-ensemble/nc-reception/nc-reception';
import { ValidationPiloteComponent } from '../nc-vue-ensemble/nc-validation-pilote/nc-validation-pilote';
import { NcClotureComponent } from '../nc-vue-ensemble/nc-cloture-rq/nc-cloture';
import { ProcNonConformiteService } from '../../../services/non-conformite/proc-non-conformite.service';
import { NcFilterBarComponent } from '../../../components/non-conformite/nc-filter-bar/nc-filter-bar';
import { NonConformiteService } from '../../../services/non-conformite/non-conformite.service';
import { TraitementTableComponent } from '../../../components/non-conformite/table-traitement/traitement-table';
import { NCRejetComponent } from '../nc-rejet/nc-rejet';
import { MessageService } from 'primeng/api';
import { FeaturesService } from '../../../services/feature-service';
import { Router } from '@angular/router';
import { ApiItemResponse } from '../../../models';

@Component({
  selector: 'app-nc-validation-pilote',
  standalone: true,
  imports: [
      CommonModule, 
      NgPrimeModule, 
      NcFilterBarComponent,
      TraitementTableComponent, 
      NCRejetComponent,
  ],
  templateUrl: './nc-validation-pilote.html',
  styleUrl: './nc-validation-pilote.scss'
})
export class ValidationPilote implements OnInit, OnDestroy {
  title = 'Validation des Non-Conformités';
  
  demande: any;

  @ViewChild(TraitementTableComponent) dmdTraitement!: TraitementTableComponent;

  validationPiloteData: any[] = [];
  rawValidationPiloteData: any[] = []; 
  totalElements: number = 0;
  currentPage: number = 0;
  pageSize: number = 5;
  totalPages: number = 0;

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
        if(this.userStructure?.id){
            this.nonConformiteService.nonConformiteParStructureEtOrigineGetPagination(EtapeTraitement.VALIDATION, this.userStructure?.id, this.currentPage, this.pageSize)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (res) => {
                    this.rawValidationPiloteData = res.data.content || [];
                    this.totalElements = res.data.totalElements;
                    this.currentPage = res.data.pageNumber || 0;
                    this.pageSize = res.data.pageSize;
                    this.totalPages = res.data.totalPages;

                    const currentNotifs = this.nonConformiteService.notificationsNC$.value;
                    this.nonConformiteService.notificationsNC$.next({
                        ...currentNotifs,
                        validation: this.totalElements
                    });
                    this.validationPiloteData = [...this.rawValidationPiloteData];
                    this.loading = false;
                },
                error: () => this.loading = false
            });
        } else {
            this.loading = false;
            this.messageService.add({ severity: 'error', summary: 'Erreur', detail: "Structure non trouvée", life: 5000 });
        }
    }

    handleFilter(filters: any) {
      if (!filters) return;
      
      const { dateDebut, dateFin, process, gravite, origine } = filters;

      this.validationPiloteData = this.rawValidationPiloteData.filter(item => {
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

  // fetchData() {
  //   this.loading = true;

    // 1. Si c'est le Pilote (Chef), on charge UNIQUEMENT ses validations
    // if (this.roleService.isChef && this.userStructure?.id) {
    //     this.procService.getNonConformiteByEtapeAndSumit(EtapeTraitement.VALIDATION, this.userStructure.id)
    //         .pipe(takeUntil(this.destroy$))
    //         .subscribe({
    //             next: (res) => {
    //               console.log(" validation pilote ", res);
                  
    //                 this.validationPiloteData = res.body || [];
    //                 this.loading = false;
    //             },
    //             error: () => this.loading = false
    //         });
    // }

    // 2. Si c'est le RQ, on charge UNIQUEMENT les validations RQ
    // if (this.roleService.isRQ) {
    //     forkJoin({
    //         validation: this.procService.getNonConformiteByEtape(EtapeTraitement.VALIDATION_RS),
    //         cloture: this.procService.getNonConformiteByEtape(EtapeTraitement.SUIVI_RQ)
    //     })
    //     .pipe(takeUntil(this.destroy$))
    //     .subscribe({
    //         next: (res: any) => {
    //             this.validationRqData = res.validation.body || [];
    //             this.clotureData = res.cloture.body || [];
    //             this.loading = false;
    //         },
    //         error: () => this.loading = false
    //     });
    // }
  // }

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

      console.log("PAYLOAD VALIDATION RQ: ", cleanedDemandes);

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

      onSuccess(res: ApiItemResponse<any>) {
          this.dmdTraitement.closeDetailsDialog();
          this.featureService.onReloadRequested(true);
          this.fetchData();
          this.messageService.add({ severity: 'success', summary: 'Succès', detail: "L'opération a réussie !", life: 5000 });
      }

    validation(demandes: any) {
        const cleanedDemandes = demandes.map((demande: { planActions: { [x: string]: any; responsable: any; dateEcheance: string }[] }) => {
            const cleanedActions = demande.planActions.map(({ responsable, dateEcheance, ...rest }) => ({
                ...rest,
                dateEcheance: dateEcheance?.replace(/\//g, "-")
            }));

            return {
                ...demande,
                planActions: cleanedActions
            };
        });

        this.nonConformiteService.nonConformiteUpdate(cleanedDemandes).subscribe({
            next: (data) => {
               this.onSuccess(data);
            },
            error: (error) => {
                this.messageService.add({ severity: 'error', summary: 'Erreur', detail: "L'oppération à échouée ! Veuillez réessayer", life: 3000 });
            }
        });
    }

  rejet(demande: any) {
      this.demande = demande;
      console.log("MOTIF REJET DEMANDEE 1 ", this.motifRejetDialog);
      this.motifRejetDialog = true;
      console.log("MOTIF REJET DEMANDEE 2 ", this.motifRejetDialog);
      
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
