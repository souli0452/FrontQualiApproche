import { Component, Input, ViewChild } from '@angular/core';
import { forkJoin, Subject, takeUntil } from 'rxjs';
import { MessageService } from 'primeng/api';
import { EtapeTraitement } from '../../../enums';
import { CommonModule } from '@angular/common';
import { NgPrimeModule } from '../../../../prime-ng.module';
import { AuthService } from '../../../services/auth-services/auth.service';
import { TraitementTableComponent } from '../../../components/non-conformite/table-traitement/traitement-table';
import { FeaturesService } from '../../../services/feature-service';
import { ProcNonConformiteService } from '../../../services/non-conformite/proc-non-conformite.service';
import { NcFilter, NcFilterBarComponent } from '../../../components/non-conformite/nc-filter-bar/nc-filter-bar';
import { NonConformiteService } from '../../../services/non-conformite/non-conformite.service';
import { ApiItemResponse } from '../../../models';

@Component({
    selector: 'app-nc-traitement-global',
    templateUrl: './nc-traitement-global.html',
    styleUrl: './nc-traitement-global.scss',
    standalone: true,
    providers: [MessageService],
    imports: [
        CommonModule, 
        NgPrimeModule, 
        TraitementTableComponent, 
        NcFilterBarComponent
    ]
})
export class TraitementGlobalComponent {
    @Input() demandeList: any = [];
    protected demande: any;

    mesNonConformites: any[] = [];
    mesNonConformitesRaw: any[] = [];

    totalElements: number = 0;
    currentPage: number = 0;
    pageSize: number = 5;
    totalPages: number = 0;

    nonTraiterData: any[] = [];
    rawNonTraiterData: any[] = [];

    private destroy$ = new Subject<void>();

    currentFilters: NcFilter | undefined;
    motifRejetDialog: boolean=false;
    loading: boolean = false;
    title = 'Traitements des non-conformités';
    user!: any;
    protected readonly BtnActions = EtapeTraitement;
    @ViewChild(TraitementTableComponent) dmdTraitement!: TraitementTableComponent;
    cols: any[] = [];
    constructor(
        private authService: AuthService,
        protected messageService: MessageService,
        private service: ProcNonConformiteService,
        private featureService:FeaturesService,
        private nonConformiteService:NonConformiteService
    ) {
        this.cols = [
            {field: 'numeroReference', header: 'N° Ref', type: 'string', filter: true, width: '220px'},
            { field: 'structureSoumissionLibelle', header: 'Processus Emetteur', type: 'string', filter: true, width: '300px'},
            {field: 'niveauNonConformiteLibelle', header: 'Gravité', type: 'badge', filter: true, width: '150px'},
            {field: 'createdAt', header: 'Date de soumission', type: 'date', filter: true, width: '200px'}
        ];
    }
    ngOnInit() {
        this.user = this.authService.getUser()!;
        this.fetchData();
    }
        handleFilter(event: NcFilter) {
        this.currentFilters = event;
        this.applyLocalFilters();
    }

    onPageChange(event: { page: number, size: number }) {
        this.currentPage = event.page;
        this.pageSize = event.size;
        this.fetchData();
    }

    fetchData() {
        this.loading = true;

        // On combine les requêtes en parallèle comme dans ton ancien code, mais avec la pagination
        forkJoin({
            traitement: this.nonConformiteService.nonConformiteImputesGetPagination(
                this.user.userId, 
                EtapeTraitement.IMPUTATION, 
                this.currentPage, 
                this.pageSize
            ),
            // Note : Si getPlanActions et getNCByUser acceptent aussi la pagination, passe-leur this.currentPage et this.pageSize
            nonTraiter: this.nonConformiteService.nonConformitePlanActionsGetPagination(this.user.email, "NON_TRAITER", this.currentPage, this.pageSize),
            userNCs: this.nonConformiteService.nonConformiteParUtilisateurGetPagination(this.user.userId, this.currentPage, this.pageSize)
        })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
            next: (res: any) => {
                // 1. Extraction des données paginées de la table principale
                this.mesNonConformitesRaw = res.traitement.data?.content || [];
                this.totalElements = res.traitement.data?.totalElements || 0;
                this.currentPage = res.traitement.data?.pageNumber || 0;
                this.pageSize = res.traitement.data?.pageSize || 10;
                this.totalPages = res.traitement.data?.totalPages || 0;

                // 2. Extraction des autres listes (on s'adapte si c'est une structure ApiResponse ou un body brut)
                const nonTraiter = res.nonTraiter.data?.content || [];
                const allUserNCs = res.userNCs.data?.content || [];

                // 3. Application de ta logique de mapping pour la Gravité
                const allNcsForMapping = [...this.mesNonConformitesRaw, ...allUserNCs];
                
                nonTraiter.forEach((planAction: any) => {
                    const relatedNC = allNcsForMapping.find(
                        (nc: any) => nc.numeroReference === planAction.numeroNc || nc.id === planAction.nonConformeId
                    );
                    if (relatedNC && relatedNC.niveauNonConformite) {
                        // Attention au renommage propre de ton entité : niveauNonConformite.libelle
                        planAction.niveauNonConformiteLibelle = relatedNC.niveauNonConformite?.libelle || relatedNC.niveauNonConformiteLibelle;
                    }
                });

                this.rawNonTraiterData = nonTraiter;

                // 4. Mise à jour de ton BehaviorSubject de notifications globales (Barre latérale)
                const currentNotifs = this.nonConformiteService.notificationsNC$.value || {};
                this.nonConformiteService.notificationsNC$.next({
                    ...currentNotifs,
                    imputees: this.mesNonConformitesRaw.length,
                    nonTraiter: this.rawNonTraiterData.length,
                    nonConformites: this.mesNonConformitesRaw.length
                });

                // 5. Finalisation de la vue
                this.mesNonConformites = [...this.mesNonConformitesRaw];
                
                // Relancer tes filtres locaux et avertir les autres composants si nécessaire
                if (typeof this.applyLocalFilters === 'function') this.applyLocalFilters();
                if (this.featureService) this.featureService.onReloadRequested(true);
                
                this.loading = false;
            },
            error: (error) => {
                console.error("Erreur de récupération fetchData :", error);
                this.messageService.add({ 
                    severity: 'error', 
                    summary: 'ERREUR', 
                    detail: "L'opération a échoué ! Veuillez réessayer", 
                    life: 3000 
                });
                this.loading = false;
            }
        });
    }

     applyLocalFilters() {
        const filters = this.currentFilters || {} as any;
        const { dateDebut, dateFin, process, gravite, origine } = filters;

        const filterFn = (item: any) => {
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
        };

        this.mesNonConformites = this.mesNonConformitesRaw.filter(filterFn);
    }

   
    saveEntity(demandes: any) {
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
            next: (data: any) => {
                this.onSuccess(data);
            },
            error: (error: any) => {
                this.messageService.add({ severity: 'error', summary: 'ERREUR', detail: "L'oppération à échouée ! Veuillez réessayer 13", life: 3000 });
            }
        });
    }

    onSuccess(res: ApiItemResponse<any>) {
        this.dmdTraitement.closeDetailsDialog();
        this.featureService.onReloadRequested(true);
        this.fetchData();
        this.messageService.add({ severity: 'success', summary: 'Succès', detail: "L'opération a réussie !", life: 5000 });
    }

    submission(demandes: any) {
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
            next: (data: any) => {
                this.onSuccess(data);
            },
            error: (error) => {
                this.messageService.add({ severity: 'error', summary: 'ERREUR', detail: "L'oppération à échouée ! Veuillez réessayer 14", life: 3000 });
            }
        });
    }
    hideDialog(event: any) {
        if (event) {
            this.dmdTraitement.displayDetails();
            this.featureService.onReloadRequested(true);
        }
    }
}
