import { Component, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MessageService } from 'primeng/api';
import { EtapeTraitement } from '../../../enums/enums';
import { HttpResponse } from '@angular/common/http';
import { showToast, StatusEnum, TypeDemande } from '../../../utils/global/global-utils';
import { CommonModule } from '@angular/common';
import { NgPrimeModule } from '../../../../prime-ng.module';
import { FeaturesService } from '../../../services/feature-service';
import { TraitementTableComponent } from '../../../components/non-conformite/table-traitement/traitement-table';
import { AuthService } from '../../../services/auth-services/auth.service';
import { Subject } from 'rxjs';
import { ProcNonConformiteService } from '../../../services/non-conformite/proc-non-conformite.service';
import { NcFilter, NcFilterBarComponent } from '../../../components/non-conformite/nc-filter-bar/nc-filter-bar';
import { NonConformiteService } from '../../../services/non-conformite/non-conformite.service';
import { generateReportFile, ReportFormat, ReportingInput } from '../../../utils/fichier/fichier-utils';

@Component({
    selector: 'app-nc-suivi',
    templateUrl: './nc-suivi.html',
    styleUrl: './nc-suivi.scss',
    standalone: true,
    imports:[
        CommonModule,
        NgPrimeModule,
        NcFilterBarComponent,
        TraitementTableComponent
    ]
})
export class NCSuiviComponent {
    demandeList: any = [];
    rawDemandeList: any[] = [];

    totalElements: number = 0;
    currentPage: number = 0;
    pageSize: number = 5;
    totalPages: number = 0;

    currentFilters: NcFilter | undefined;

    title = 'Consultations des non-conformités';
    loading: boolean = false;
    cols: any[] = [];
    private destroy$ = new Subject<void>();

    constructor(
      private featureService:FeaturesService,
      protected messageService: MessageService,
      private service:ProcNonConformiteService,
      private nonConformiteService:NonConformiteService,
      private route: ActivatedRoute,
      private authService: AuthService) 
      {
        this.cols = [
            { field: 'numeroReference', header: 'N° Ref', type: 'string', filter: true, width: '250px', centered: false },
            { field: 'structureSoumissionLibelle', header: 'Processus Emetteur', type: 'string', filter: true, width: '150px', centered: false },
            // L'étape du circuit, et non le statut : c'est elle qui dit où en est le dossier, et
            // c'est le circuit qui la nomme. Le type « enum » du tableau affiche l'étape courante
            // rendue par le moteur ; à défaut de circuit en cours — un dossier clos — il retombe sur
            // ce champ, d'où `workflowStatus` : la dernière étape connue, plutôt qu'un statut
            // technique (« PUBLISHED ») qui ne dit rien à qui lit la liste.
            { field: 'workflowStatus', header: 'Étape du circuit', type: 'enum', filter: true, width: '250px', centered: false },
            {
                field: 'typeNonConformiteLibelle',
                header: 'Source',
                type: 'string',
                filter: true,
                width: '150px',
                centered: false
            },
            { field: 'niveauNonConformiteLibelle', header: 'Gravité', type: 'badge', filter: false, width: '150px', centered: false },
            { field: 'createdAt', header: 'Date soumission', type: 'date', filter: true, width: '150px', centered: false }
        ];
    }
    @ViewChild(TraitementTableComponent) dmdTraitement!: TraitementTableComponent;

    protected readonly BtnActions = EtapeTraitement;

    handleFilter(event: NcFilter) {
        this.currentFilters = event;
        this.applyLocalFilters();
    }

    ngOnInit() {
        this.loadSuiviData();
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Charge la consultation : tous les dossiers que l'appelant a le droit de voir, tous processus
     * confondus.
     *
     * <p>L'écran choisissait son point d'entrée selon le rôle — la liste générale pour le
     * responsable qualité, celle d'une structure pour le pilote, celle d'un utilisateur pour l'agent.
     * Deux conséquences, toutes deux constatées : la liste du pilote était bâtie sur un seul champ de
     * structure, si bien qu'un dossier transféré ou clos en sortait et disparaissait de son écran ;
     * et la portée de la consultation dépendait d'un aiguillage de gabarit, alors que le serveur la
     * tient déjà.</p>
     *
     * <p>Une seule source désormais. C'est {@code visiblesParLAppelant} qui décide, côté serveur :
     * l'administration et la responsabilité qualité voient tout ; les autres voient les dossiers de
     * leur structure — émis par elle <b>ou</b> qui lui sont adressés — plus les leurs, ceux qu'ils
     * ont déclarés et ceux qui leur sont imputés. Aucun filtre sur l'état : un dossier clos reste
     * consultable, ce qui est le propre d'un écran de suivi.</p>
     */
    loadSuiviData() {
        this.getDemandeList();
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
            // 1. Pour les Processus
            if (process && process.length > 0) {
                const selectedIds = process.map((p: any) => p.id);
                if (!selectedIds.includes(item.typeProcessusId)) {
                    isValid = false;
                }
            }

            // 2. Pour les Gravités
            if (gravite && gravite.length > 0) {
                const selectedIds = gravite.map((g: any) => g.id);
                if (!selectedIds.includes(item.niveauNonConformiteId)) {
                    isValid = false;
                }
            }

            // 3. Pour les Origines
            if (origine && origine.length > 0) {
                const selectedIds = origine.map((o: any) => o.id);
                if (!selectedIds.includes(item.typeNonConformiteId)) {
                    isValid = false;
                }
            }

            return isValid;
        };

        this.demandeList = this.rawDemandeList.filter(filterFn);
    }


    /**
     * Ouvre la fiche désignée par « ?ncId= » — le lien des courriels d'étape.
     *
     * <p>Le dossier n'est pas forcément dans la page chargée : il est relu par son identifiant,
     * puis la fiche s'ouvre comme si la ligne avait été cliquée. Introuvable ou hors de portée,
     * rien ne s'ouvre et l'écran de suivi reste utilisable — le lien d'un courriel ancien ne doit
     * pas produire une erreur bloquante.</p>
     */
    private ouvrirLaFicheDeLAdresse(): void {
        const ncId = this.route.snapshot.queryParamMap.get('ncId');
        if (!ncId) {
            return;
        }
        const dejaChargee = this.rawDemandeList.find((nc: any) => nc.id === ncId);
        if (dejaChargee) {
            this.dmdTraitement.displayDetails(dejaChargee);
            return;
        }
        this.nonConformiteService.findNCById(ncId).subscribe({
            next: (reponse: any) => {
                const nc = reponse?.data ?? reponse;
                if (nc?.id) {
                    this.dmdTraitement.displayDetails(nc);
                }
            },
            error: () => { /* dossier hors de portée : le suivi reste l'écran. */ }
        });
    }

    /** La fiche ne s'ouvre qu'une fois : revenir du dialogue ne doit pas la rouvrir. */
    private ficheDeLAdresseOuverte = false;

    getDemandeList() {
        this.loading = true;
        // Les bornes de page sont transmises, et le total repris : sans elles, le serveur servait sa
        // page par défaut — dix dossiers — et la barre de pagination, faute de total, n'annonçait
        // aucune suite. La consultation paraissait ne compter que dix non-conformités.
        this.nonConformiteService.nonConformiteGetAll(this.currentPage, this.pageSize).subscribe({
            next: (data) => {
                this.rawDemandeList = data.data.content || [];
                this.totalElements = data.data.totalElements ?? this.rawDemandeList.length;
                this.totalPages = data.data.totalPages ?? 1;
                this.currentPage = data.data.pageNumber ?? this.currentPage;
                this.pageSize = data.data.pageSize ?? this.pageSize;
                this.applyLocalFilters();
                this.featureService.onReloadRequested(true);
                this.loading = false;
                if (!this.ficheDeLAdresseOuverte) {
                    this.ficheDeLAdresseOuverte = true;
                    this.ouvrirLaFicheDeLAdresse();
                }
            },
            error: (error) => {
                this.loading = false;
            }
        });
    }

    onSuccess(res: HttpResponse<any>) {
        this.getDemandeList()
        showToast(StatusEnum.success, res.status, null, this.messageService);
        this.dmdTraitement.closeDetailsDialog();
    }

    cloture(dmd:any) {
        this.service.updateNomConformite(dmd,dmd.id).subscribe({
            next: (data) => {
                this.onSuccess(data);
            },
            error: (error) => {

            }
        })
    }

    onPageChange(event: { page: number, size: number }) {
        this.currentPage = event.page;   // ✅ mettre à jour la page
        this.pageSize = event.size;      // ✅ mettre à jour la taille
        this.loadSuiviData();
    }

    // private editer(rowData: any, resp: HttpResponse<any>) {
    //     const reportingInput: ReportingInput = {
    //         reportFormat: ReportFormat.PDF,
    //         reportType: rowData.typeDemande,
    //         entityId: rowData.id!,
    //     };
    //     this.featureService.printReport(reportingInput).pipe()
    //         .subscribe({
    //             next: arrayBytes => {
    //                 if (arrayBytes.byteLength) {
    //                     generateReportFile(arrayBytes, reportingInput);
    //                     this.dmdTraitement.displayDetails(resp.body);
    //                     this.messageService.add({ severity: 'success', summary: 'Succès', detail: "L'oppération à réussie !", life: 3000 });
    //                 }
    //             },
    //             error: () => {
    //                 this.messageService.add({ severity: 'error', summary: 'ERREUR', detail: "L'oppération à échouée ! Veuillez réessayer 2", life: 3000 });
    //                 //showToast(handleHttpErrors(err, 'error', 'Impression correspondance', 'demandeCodeKey'), this.messageService);
    //             }
    //         });
    // }

    private editer(rowData: any, resp: any) { // J'ai retiré HttpResponse car c'est trompeur
        const reportingInput: ReportingInput = {
            reportFormat: ReportFormat.PDF,
            reportType: TypeDemande.NON_CONFORMITE, // Utilisation de l'Enum correcte
            entityId: rowData.id!,
        };
        
        this.featureService.printReport(reportingInput).pipe()
            .subscribe({
                next: arrayBytes => {
                    if (arrayBytes.byteLength) {
                        generateReportFile(arrayBytes, reportingInput);
                        this.dmdTraitement.displayDetails(resp); // Remplacement de resp.body par resp
                        this.messageService.add({ severity: 'success', summary: 'Succès', detail: "L'oppération a réussi !", life: 3000 });
                    }
                },
                error: (error) => {
                    console.log("ERREUR DE PRINT : ", error)
                    this.messageService.add({ severity: 'error', summary: 'ERREUR', detail: "L'opération a échoué ! Veuillez réessayer", life: 3000 });
                }
            });
    }


    edition(demandes: any) {
        this.editer(demandes[0], demandes[0]);}
}
