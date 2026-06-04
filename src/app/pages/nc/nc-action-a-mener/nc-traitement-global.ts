import { Component, Input, ViewChild } from '@angular/core';
import { HttpResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { MessageService } from 'primeng/api';
import { EtapeTraitement } from '../../../enums';
import { showToast, StatusEnum } from '../../../utils';
import { CommonModule } from '@angular/common';
import { NgPrimeModule } from '../../../../prime-ng.module';
import { AuthService } from '../../../services/auth-services/auth.service';
import { TraitementTableComponent } from '../../../components/non-conformite/table-traitement/traitement-table';
import { FormRejetComponent } from '../../../components/non-conformite/form-rejet/form-rejet';
import { NcFilter, NcFilterBarComponent } from '../nc-filter-bar/nc-filter-bar';
import { FeaturesService } from '../../../services/feature-service';
import { NcNonTraiterComponent } from '../nc-vue-ensemble/nc-traitement-action/nc-non-traiter';
import { ProcNonConformiteService } from '../../../services/non-conformite/proc-non-conformite.service';

@Component({
    selector: 'app-nc-traitement-global',
    templateUrl: './nc-traitement-global.html',
    styleUrl: './nc-traitement-global.scss',
    standalone: true,
    providers: [MessageService],
    imports: [CommonModule, NgPrimeModule, TraitementTableComponent, FormRejetComponent, NcFilterBarComponent, NcNonTraiterComponent]
})
export class TraitementGlobalComponent {
    @Input() demandeList: any = [];
    protected demande: any;
    rawDemandeList: any[] = [];

    nonTraiterData: any[] = [];
    rawNonTraiterData: any[] = [];

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
        this.getDemandeList(this.user.userId);
    }
        handleFilter(event: NcFilter) {
        this.currentFilters = event;
        this.applyLocalFilters();
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

        this.demandeList = this.rawDemandeList.filter(filterFn);
        if (this.rawNonTraiterData) {
            // Le filterFn risque d'échouer sur les planActions qui n'ont pas de dates ou d'ids conformes
            this.nonTraiterData = this.rawNonTraiterData;
            console.log("nonTraiterData assigné :", this.nonTraiterData);
        }
    }

    getDemandeList(userId: string) {
        this.loading = true;

        forkJoin({
            traitement: this.service.getNonConformiteImputed(userId, EtapeTraitement.TRAITEMENT),
            nonTraiter: this.service.getPlanActions(this.user.email, "NON_TRAITER"),
            userNCs: this.service.getNCByUser(userId)
        }).subscribe({
            next: (res: any) => {
                this.rawDemandeList = res.traitement.body || [];
                const nonTraiter = res.nonTraiter.body || [];
                const allUserNCs = res.userNCs.body || [];

                console.log("NON_TRAITER bruts récupérés :", nonTraiter);

                const allNcsForMapping = [...this.rawDemandeList, ...allUserNCs];

                // Mapping pour récupérer la Gravité (niveauNonConformiteLibelle) depuis les NC en traitement ou créées
                nonTraiter.forEach((planAction: any) => {
                    const relatedNC = allNcsForMapping.find((nc: any) => nc.numeroReference === planAction.numeroNc || nc.id === planAction.nonConformeId);
                    if (relatedNC && relatedNC.niveauNonConformiteLibelle) {
                        planAction.niveauNonConformiteLibelle = relatedNC.niveauNonConformiteLibelle;
                    }
                });

                this.rawNonTraiterData = nonTraiter;

                // Mettre à jour la notification globale pour la barre latérale
                const currentNotifs = this.service.notificationsNC$.value || {};
                this.service.notificationsNC$.next({
                    ...currentNotifs,
                    imputees: this.rawDemandeList.length,
                    nonTraiter: this.rawNonTraiterData.length
                });

                this.applyLocalFilters();
                this.featureService.onReloadRequested(true);
                this.loading = false;
            },
            error: (error) => {
                console.error("Erreur de récupération :", error);
                this.messageService.add({ severity: 'error', summary: 'ERREUR', detail: "L'oppération a échouée ! Veuillez réessayer", life: 3000 });
                this.loading = false;
            }
        });
    }
    
    onSuccess(res: HttpResponse<any>) {
        showToast(StatusEnum.success, res.status, null, this.messageService);
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

        this.service.updateNomConformites(cleanedDemandes).subscribe({
            next: () => {
                this.getDemandeList(this.user.userId);
                this.dmdTraitement.closeDetailsDialog();
                this.messageService.add({ severity: 'success', summary: 'Succès', detail: "L'oppération à réussie !", life: 3000 });
            },
            error: (error) => {
                this.messageService.add({ severity: 'error', summary: 'ERREUR', detail: "L'oppération à échouée ! Veuillez réessayer 13", life: 3000 });
            }
        });
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

        this.service.updateNomConformites(cleanedDemandes).subscribe({
            next: (data) => {
                this.getDemandeList(this.user.userId);
                this.dmdTraitement.closeDetailsDialog();
                this.messageService.add({ severity: 'success', summary: 'Succès', detail: "L'oppération à réussie !", life: 3000 });
            },
            error: (error) => {
                this.messageService.add({ severity: 'error', summary: 'ERREUR', detail: "L'oppération à échouée ! Veuillez réessayer 14", life: 3000 });
            }
        });
    }
    hideDialog(event: any) {
        if (event) {
            this.dmdTraitement.displayDetails();
            this.getDemandeList(this.user.userId);
        }
    }
    rejet(demande: any) {
        this.demande = demande;
        this.motifRejetDialog = true;
    }
}
