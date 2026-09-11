import { Component, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MessageService } from 'primeng/api';
import { HttpResponse } from '@angular/common/http';
import { BasePaginationComponent, AlertService } from '@shared';
import { CommonModule } from '@angular/common';
import { NgPrimeModule } from '@prime-ng';
import { FeaturesService } from '@core';
import { TraitementTableComponent, NcFilter, NcFilterBarComponent, LightboxComponent, DetailsDialogComponent } from '../../components';
import { AuthService } from '@core/auth';
import { forkJoin, of, Subject } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { NonConformiteService, PlanActionService, PieceJointeFichierService } from '../../services';
import { WorkflowActionsComponent, WorkflowGuidanceComponent, WorkflowHistoriqueComponent } from '@features/workflow';

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
        WorkflowActionsComponent,
        WorkflowGuidanceComponent,
        WorkflowHistoriqueComponent,
        LightboxComponent,
        DetailsDialogComponent
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

    // Gestion du dialogue Détails du plan d'action (Capture 1 directe)
    selectedPlan: any = null;
    afficheDialog: boolean = false;
    @ViewChild('maLightbox') maLightbox!: LightboxComponent;
    @ViewChild(TraitementTableComponent) dmdTraitement!: TraitementTableComponent;

    readonly deposerFichierDEtape = (fichier: File) =>
        this.planActionService.deposerFichier(this.selectedPlan?.id, fichier).pipe(
            map((reponse: any) => reponse?.url || reponse?.id || `${reponse}`)
        );

    constructor(
        private featureService: FeaturesService,
        protected messageService: MessageService,
        private service: NonConformiteService,
        private nonConformiteService: NonConformiteService,
        private planActionService: PlanActionService,
        private fichiersService: PieceJointeFichierService,
        private route: ActivatedRoute,
        private alertService: AlertService,
        private authService: AuthService
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

    // =========================================================================
    // GESTION DU DIALOGUE DE TRAITEMENT DIRECT DU PLAN D'ACTION (Capture 1)
    // =========================================================================

    ouvrirPlan(plan: any) {
        if (!plan) return;
        this.selectedPlan = { ...plan };
        if (typeof this.selectedPlan?.dateEcheance === 'string') {
            this.selectedPlan.dateEcheance = this.selectedPlan.dateEcheance.replace(/-/g, '/');
        }

        // S'assurer que le dossier parent NC est complètement chargé pour consultation
        const parentId = this.selectedPlan.nonConformeId || this.selectedPlan.nonConformiteId || this.selectedPlan.nonConformite?.id;
        if (parentId && (!this.selectedPlan.nonConformite || !this.selectedPlan.nonConformite.justification)) {
            this.nonConformiteService.findNCById(parentId).subscribe({
                next: (res: any) => {
                    const nc = res?.data ?? res;
                    if (nc) {
                        this.selectedPlan.nonConformite = nc;
                    }
                },
                error: (err) => console.error("Erreur chargement dossier parent NC", err)
            });
        }

        this.afficheDialog = true;
    }

    apresDecisionSurLePlan(plan: any) {
        this.afficheDialog = false;
        this.alertService.showSuccess("Opération effectuée avec succès");
        this.getDemandeList();
        this.nonConformiteService.rafraichirNotifications();
    }

    couleurEtapeDuPlan(plan: any): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
        const code = plan?.workflowState?.currentStateCode || plan?.status;
        if (code === 'REALISE' || code === 'EFFICACE' || code === 'TRAITER') return 'success';
        if (code === 'A_REALISER' || code === 'NON_TRAITER') return 'warn';
        return 'info';
    }

    etapeDuPlan(plan: any): string {
        return plan?.workflowState?.currentStateName || plan?.status || 'À réaliser';
    }

    getResponsableName(plan: any): string {
        if (!plan) return '—';
        return plan.responsable?.nomComplet || plan.responsableNomComplet || plan.responsableEmail || '—';
    }

    downloadFile(fichier: any) {
        this.fichiersService.telecharger(fichier);
    }

    openLightbox(file: any) {
        this.maLightbox?.open(file);
    }

    isViewable(fichier: any): boolean {
        const nom = fichier?.nom || fichier?.nomFichier;
        if (!nom) return false;
        const nomStr = nom.toLowerCase();
        return nomStr.endsWith('.pdf') || nomStr.endsWith('.png') || nomStr.endsWith('.jpg') || nomStr.endsWith('.jpeg');
    }

    getFileIcon(filename: string): string {
        if (!filename) return 'assets/images/unknown-file.png';
        const ext = filename.split('.').pop()?.toLowerCase() || '';
        const icons: Record<string, string> = {
            pdf: 'assets/images/pdf-file.png',
            doc: 'assets/images/doc-file.png',
            docx: 'assets/images/doc-file.png',
            xls: 'assets/images/xls-file.png',
            xlsx: 'assets/images/xls-file.png',
            jpg: 'assets/images/jpeg-file.png',
            jpeg: 'assets/images/jpeg-file.png',
            png: 'assets/images/jpeg-file.png'
        };
        return icons[ext] || 'assets/images/unknown-file.png';
    }
}
