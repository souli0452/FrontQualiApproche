import { Component, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MessageService } from 'primeng/api';
import { EtapeTraitement } from '../../../enums/enums';
import { HttpResponse } from '@angular/common/http';
import { showToast, StatusEnum } from '../../../utils/global/global-utils';
import { CommonModule } from '@angular/common';
import { NgPrimeModule } from '../../../../prime-ng.module';
import { FeaturesService } from '../../../services/feature-service';
import { TraitementTableComponent } from '../../../components/non-conformite/table-traitement/traitement-table';
import { AuthService } from '../../../services/auth-services/auth.service';
import { Subject } from 'rxjs';
import { ProcNonConformiteService } from '../../../services/non-conformite/proc-non-conformite.service';
import { NcFilter, NcFilterBarComponent } from '../../../components/non-conformite/nc-filter-bar/nc-filter-bar';
import { NonConformiteService } from '../../../services/non-conformite/non-conformite.service';
import { criteresDeRecherche } from '../../../utils/non-conformite/nc-criteres';

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

    /**
     * Un filtre change : la liste est redemandée au serveur depuis la première page.
     *
     * <p>Repartir de la première page n'est pas un détail : restreindre en restant à la page cinq
     * afficherait une page vide alors que des dossiers correspondent.</p>
     */
    handleFilter(event: NcFilter) {
        this.currentFilters = event;
        this.currentPage = 0;
        this.getDemandeList();
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
        // Aucun périmètre propre à l'écran : la consultation montre tout ce que l'appelant a le
        // droit de voir, et c'est le serveur qui en décide. Seuls les filtres de la barre
        // s'ajoutent.
        const criteres = criteresDeRecherche([], this.currentFilters);

        this.nonConformiteService.rechercher(criteres, this.currentPage, this.pageSize).subscribe({
            next: (data) => {
                this.rawDemandeList = data.data.content || [];
                this.totalElements = data.data.totalElements ?? this.rawDemandeList.length;
                this.totalPages = data.data.totalPages ?? 1;
                this.currentPage = data.data.pageNumber ?? this.currentPage;
                this.pageSize = data.data.pageSize ?? this.pageSize;
                this.demandeList = this.rawDemandeList;
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

    // L'édition de la fiche de clôture est le fait de la fiche elle-même (traitement-table) :
    // le dossier clôturé s'édite partout où il s'ouvre, plus seulement depuis cet écran.
}
