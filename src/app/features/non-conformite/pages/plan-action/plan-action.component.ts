import { Component, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MessageService } from 'primeng/api';
import { CommonModule } from '@angular/common';
import { NgPrimeModule } from '@prime-ng';

import { forkJoin, of, Subject } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { FeaturesService } from '@core/services/feature-service';
import { NcFilter, NcFilterBarComponent } from '@features/non-conformite/components/nc-filter-bar/nc-filter-bar';
import { TraitementTableComponent } from '@features/non-conformite/components/table-traitement/traitement-table';
import { PlanActionDialogComponent } from '@features/non-conformite/components/plan-action-dialog/plan-action-dialog.component';
import { NonConformiteService } from '@features/non-conformite/services/non-conformite.service';
import { BasePaginationComponent } from '@shared/pagination/pagination';

@Component({
    selector: 'app-plan-action',
    templateUrl: './plan-action.component.html',
    styleUrl: './plan-action.component.scss',
    standalone: true,
    imports: [
        CommonModule,
        NgPrimeModule,
        NcFilterBarComponent,
        TraitementTableComponent,
        PlanActionDialogComponent
    ]
})
export class PlanActionComponent extends BasePaginationComponent {
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
    title = "Plans d'action";
    cols: any[] = [];
    private destroy$ = new Subject<void>();

    // Gestion du dialogue Détails du plan d'action
    selectedPlan: any = null;
    afficheDialog: boolean = false;
    @ViewChild(TraitementTableComponent) dmdTraitement!: TraitementTableComponent;

    constructor(
        private featureService: FeaturesService,
        protected messageService: MessageService,
        private nonConformiteService: NonConformiteService,
        private route: ActivatedRoute,
    ) {
        super();
        this.cols = [
            { field: 'numeroReference', header: 'N° Ref NC', type: 'string', filter: true, width: '180px', centered: false },
            { field: 'numeroOdre', header: 'Action N°', type: 'string', filter: false, width: '100px', centered: true },
            { field: 'workflowStatus', header: 'Étape du circuit', type: 'enum', filter: true, width: '220px', centered: false },
            { field: 'dateEcheance', header: 'Échéance', type: 'string', width: '150px', centered: true },
            { field: 'niveauNonConformiteLibelle', header: 'Gravité', type: 'badge', filter: false, width: '140px', centered: false },
        ];
    }

    ngOnInit() {
        this.fetchObject();
    }

    fetchObject(): void {
        this.getDemandeList();
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    handleFilter(event: NcFilter) {
        this.currentFilters = event;
        const { process, gravite, origine } = event || {};
        const hasProcess = !!(process && process.length > 0);
        const hasGravite = !!(gravite && gravite.length > 0);
        const hasOrigine = !!(origine && origine.length > 0);

        this.hasActiveFilters = hasProcess || hasGravite || hasOrigine;
        this.applyLocalFilters();
    }

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
                const itemDateStr = item.dateCreation || item.createdAt || item.date || item.nonConformite?.dateCreation || item.nonConformite?.createdAt;
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

            if (process && process.length > 0) {
                const selectedIds = process.map((p: any) => p.id);
                const procId = item.typeProcessusId || item.structureSoumissionId || item.nonConformite?.structureSoumissionId;
                if (!selectedIds.includes(procId)) {
                    isValid = false;
                }
            }

            if (gravite && gravite.length > 0) {
                const selectedIds = gravite.map((g: any) => g.id);
                const gravId = item.niveauNonConformiteId || item.nonConformite?.niveauNonConformiteId;
                if (!selectedIds.includes(gravId)) {
                    isValid = false;
                }
            }

            if (origine && origine.length > 0) {
                const selectedIds = origine.map((o: any) => o.id);
                const origId = item.typeNonConformiteId || item.nonConformite?.typeNonConformiteId;
                if (!selectedIds.includes(origId)) {
                    isValid = false;
                }
            }

            return isValid;
        };

        this.filteredDemandeList = this.dataList.filter(filterFn);
    }

    getDemandeList() {
        this.loading = true;
        this.nonConformiteService.planActionsATraiterPage(this.currentPage, this.pageSize).subscribe({
            next: (res: any) => {
                const pageData = res?.data ?? res;
                const plans = pageData?.content ?? (Array.isArray(pageData) ? pageData : []);

                if (plans.length === 0) {
                    this.applyPagination(res);
                    this.finalizeDemandeList();
                    return;
                }

                // Enrichit uniquement les plans de la page courante si la NC parente manque
                const enrichmentRequests = plans.map((plan: any) => {
                    if (plan.nonConformeId && !plan.nonConformite) {
                        return this.nonConformiteService.findNCById(plan.nonConformeId).pipe(
                            map((ncRes: any) => {
                                const parentNC = ncRes?.data ?? ncRes;
                                if (parentNC) {
                                    plan.nonConformite = parentNC;
                                }
                                return plan;
                            }),
                            catchError(() => of(plan))
                        );
                    }
                    return of(plan);
                });

                forkJoin(enrichmentRequests).subscribe({
                    next: (enrichedPlans: any) => {
                        this.applyPagination(res, 0, enrichedPlans);
                        this.finalizeDemandeList();
                    },
                    error: () => {
                        this.applyPagination(res, 0);
                        this.finalizeDemandeList();
                    }
                });
            },
            error: (error) => {
                console.error('Erreur chargement plans d\'action', error);
                this.dataList = [];
                this.totalElements = 0;
                this.loading = false;
            }
        });
    }

    private finalizeDemandeList() {
        setTimeout(() => {
            this.applyLocalFilters();
            this.featureService.onReloadRequested(true);
            this.loading = false;
            if (!this.ficheDeLAdresseOuverte) {
                this.ficheDeLAdresseOuverte = true;
                this.ouvrirLaFicheDeLAdresse();
            }
        }, 300);
    }

    private ficheDeLAdresseOuverte = false;

    private ouvrirLaFicheDeLAdresse(): void {
        const ncId = this.route.snapshot.queryParamMap.get('ncId');
        if (!ncId) return;

        const dejaChargee = this.rawDemandeList.find((p: any) => p.id === ncId || p.nonConformeId === ncId);
        if (dejaChargee) {
            this.ouvrirPlan(dejaChargee);
            return;
        }
    }

    override onPageChange(event: { page: number, size: number }) {
        this.currentPage = event.page;
        this.pageSize = event.size;
        this.getDemandeList();
    }

    ouvrirPlan(plan: any) {
        if (!plan) return;
        this.selectedPlan = plan;
        this.afficheDialog = true;
    }

    apresDecisionSurLePlan(plan: any) {
        this.afficheDialog = false;
        this.getDemandeList();
        this.nonConformiteService.rafraichirNotifications();
    }
}
