import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { getCurrentUserStructure, showToast, StatusEnum } from '../../../utils/global/global-utils';
import { MessageService } from 'primeng/api';
import { FeaturesService } from '../../../services/feature-service';
import { Location } from '@angular/common';
import { NonConformStatus } from '../../../enums/enums';
import { AuthService } from '../../../services/auth-services/auth.service';
import { CommonModule } from '@angular/common';
import { NgPrimeModule } from '../../../../prime-ng.module';
import { NcModule } from '../nc.module';
import { NonConformiteService } from '../../../services/non-conformite/non-conformite.service';
import { Structure } from '../../parametrages/structure/structure-config/structure';
import { ProcNonConformiteService } from '../../../services/non-conformite/proc-non-conformite.service';
import { currentUserState } from '../../../services/auth-services/auth.state';
import { AuthData } from '../../../models/auth.model';
import { ApiResponse } from '../../../models/response.model';
import { NonConformite } from '../../../models/non-conformite.model';
import { TraitementTableComponent } from '../../../components/non-conformite/table-traitement/traitement-table';
import { NcFilter, NcFilterBarComponent } from '../../../components/non-conformite/nc-filter-bar/nc-filter-bar';
import { criteresDeRecherche } from '../../../utils/non-conformite/nc-criteres';

@Component({
    selector: 'app-nc-publiees',
    templateUrl: './nc-publiees.html',
    standalone: true,
    imports: [CommonModule, NgPrimeModule, NcModule, NcFilterBarComponent, TraitementTableComponent]
})
export class NcPublieesComponent implements OnInit, OnDestroy {
    publishedList: any[] = [];
    totalElements: number = 0;
    currentPage: number = 0;
    pageSize: number = 5;
    totalPages: number = 0;


    loading: boolean = false;
    currentFilters: NcFilter | undefined;
    destroy$: Subject<boolean> = new Subject<boolean>();
    cols: any[] = [
            { field: 'numeroReference', header: 'N° Ref', type: 'string', filter: true, width: '250px', centered: false },
            {
                field: 'typeNonConformiteLibelle',
                header: 'Source',
                type: 'string',
                filter: true,
                width: '150px',
                centered: false
            },
            { field: 'status', header: 'Statut', type: 'enum', filter: true, width: '150px' },
            { field: 'niveauNonConformiteLibelle', header: 'Gravité', type: 'badge', filter: false, width: '150px', centered: false },
            { field: 'createdAt', header: 'Date soumission', type: 'date', filter: true, width: '150px', centered: false }
    ];
    colsDetail: any[] = [
        {field: 'title', header: 'Titre', type: 'string'},
        {field: 'content', header: 'Description', type: 'string'},
        {field: 'createdAt', header: 'Date création', type: 'dateTime'},
        {field: 'dueDate', header: 'Date expiration', type: 'date'},
        {field: 'publicationDate', header: 'Date publication', type: 'dateTime'},
        {field: 'tags', header: 'Tags', type: 'tags'},
        {field: 'pieceJointes', header: 'Pièces Jointes', type: 'file'}

    ];
    userStructure:Structure={};
    isRQ: boolean = false;
    isChef: boolean = false;
    isAgent: boolean = false;
    rawDemandeList: any[] = [];
    constructor(
        private featureService:FeaturesService,
        private nonConformiteService: NonConformiteService,
        private location: Location,
        protected messageService: MessageService,
        private service:ProcNonConformiteService,
        private authService: AuthService
    ) {}

    /** L'utilisateur dont l'écran montre les dossiers, retenu pour les rechargements. */
    utilisateurCourant = '';

ngOnInit() {
        this.userStructure = getCurrentUserStructure();
        const user = currentUserState.value as AuthData | any;
        this.utilisateurCourant = user.userId;

        if (this.utilisateurCourant) {
            this.getDemandeListUser(this.utilisateurCourant);
        }
    }

    getDemandeListUser(userId: string) {
        this.loading = true;
        this.nonConformiteService
            .rechercher(criteresDeRecherche(
                // « Mes dossiers » n'est pas une colonne : ce sont ceux que j'ai déclarés **ou**
                // ceux qui me sont imputés. Des critères cumulés ne savent pas le dire — ils se
                // combinent par un ET — d'où la comparaison portée sur les deux colonnes à la fois.
                [{ fields: ['createdById', 'userImputId'], operator: 'EQ', value: userId }],
                this.currentFilters),
                this.currentPage, this.pageSize)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (res: ApiResponse<NonConformite>) => {
                    console.log(res);
                    
                    this.rawDemandeList = res.data?.content ?? [];
                    this.publishedList = this.rawDemandeList;

                    // ✅ mise à jour pagination
                    this.totalElements = res.data?.totalElements ?? 0;
                    this.currentPage = res.data?.pageNumber ?? 0;
                    this.pageSize = res.data?.pageSize ?? 10;
                    this.totalPages = res.data?.totalPages ?? 0;

                    this.loading = false;
                },
                error: (error) => {
                    console.error(error);
                    this.loading = false;
                }
            });
    }

    goBack() {
        this.location.back();
    }

    ngOnDestroy() {
        this.destroy$.next(true);
        this.destroy$.unsubscribe();
    }

    onPageChange(event: { page: number, size: number }) {
        this.currentPage = event.page;   // ✅ mettre à jour la page
        this.pageSize = event.size;      // ✅ mettre à jour la taille
        const user = currentUserState.value as AuthData | any;
        const userId = user.userId;
        
        if (userId) {
            this.getDemandeListUser(userId);
        }
    }

    /**
     * Un filtre change : la liste est redemandée au serveur depuis la première page.
     */
    handleFilter(event: NcFilter) {
        this.currentFilters = event;
        this.currentPage = 0;
        this.getDemandeListUser(this.utilisateurCourant);
    }



    archive(rowdata: any): void {
        this.nonConformiteService.updateStatus(rowdata.id, NonConformStatus.ARCHIVED).subscribe({
            next: (data) => {
                this.rawDemandeList = this.rawDemandeList.filter(item => item.id !== rowdata.id);
                this.publishedList = this.rawDemandeList;
                this.featureService.onReloadRequested(true);
                this.messageService.add({ severity: 'success', summary: 'Succès', detail: 'Non-Conformité archivée' });
            },
            error: error => {
                this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Une erreur est survenue' });
            }
        });
    }

    delete(rowdata: any) {
        this.nonConformiteService.delete(rowdata.id!).subscribe({
            next: (data) => {
                this.rawDemandeList = this.rawDemandeList.filter(item => item.id !== rowdata.id);
                this.publishedList = this.rawDemandeList;
                this.featureService.onReloadRequested(true);
                this.messageService.add({ severity: 'success', summary: 'Succès', detail: 'Non-Conformité supprimée' });
            },
            error: error => {
                this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Une erreur est survenue' });
            }
        });
    }
    protected readonly NonConformStatus = NonConformStatus;
}
