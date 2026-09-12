import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { MessageService } from 'primeng/api';
import { Location } from '@angular/common';
import { CommonModule } from '@angular/common';
import { NgPrimeModule } from '@prime-ng';
import { AuthData } from '../../../../models/auth.model';
import { ApiResponse } from '../../../../models/response.model';
import { FeaturesService } from '@core/services/feature-service';
import { getCurrentUserStructure } from '@core/auth/auth-utils';
import { currentUserState } from '@core/auth/auth.state';
import { NcFilter, NcFilterBarComponent } from '@features/non-conformite/components/nc-filter-bar/nc-filter-bar';
import { NonConformite } from '@features/non-conformite/models/non-conformite.model';
import { NonConformStatus } from '@features/non-conformite/models/nc-status.model';
import { TraitementTableComponent } from '@features/non-conformite/components/table-traitement/traitement-table';
import { NonConformiteService } from '@features/non-conformite/services/non-conformite.service';
import { RoleService } from '@features/non-conformite/services/role.service';
import { criteresDeRecherche } from '@features/non-conformite/utils/nc-criteres';
import { Structure } from '@features/organigramme/models/structure.model';
import { BasePaginationComponent } from '@shared/pagination/pagination';

@Component({
    selector: 'app-suivi',
    templateUrl: './suivi.component.html',
    standalone: true,
    imports: [CommonModule, NgPrimeModule, NcFilterBarComponent, TraitementTableComponent]
})
export class NcSuiviComponent extends BasePaginationComponent implements OnInit, OnDestroy {
    get demandeList(): any[] {
        return this.dataList;
    }
    get publishedList(): any[] {
        return this.dataList;
    }
    get rawDemandeList(): any[] {
        return this.dataList;
    }

    currentFilters: NcFilter | undefined;
    destroy$: Subject<boolean> = new Subject<boolean>();
    cols: any[] = [
        { field: 'numeroReference', header: 'N° Ref', type: 'string', filter: true, width: '180px', centered: false },
        { field: 'typeNonConformiteLibelle', header: 'Source', type: 'string', filter: true, width: '150px', centered: false },
        { field: 'status', header: 'Statut', type: 'enum', filter: true, width: '150px' },
        { field: 'niveauNonConformiteLibelle', header: 'Gravité', type: 'badge', filter: false, width: '150px', centered: false },
        { field: 'createdAt', header: 'Date soumission', type: 'date', filter: true, width: '150px', centered: false }
    ];
    colsDetail: any[] = [
        { field: 'title', header: 'Titre', type: 'string' },
        { field: 'content', header: 'Description', type: 'string' },
        { field: 'createdAt', header: 'Date création', type: 'dateTime' },
        { field: 'dueDate', header: 'Date expiration', type: 'date' },
        { field: 'publicationDate', header: 'Date publication', type: 'dateTime' },
        { field: 'tags', header: 'Tags', type: 'tags' },
        { field: 'pieceJointes', header: 'Pièces Jointes', type: 'file' }
    ];
    userStructure: Structure = {};
    isRQ: boolean = false;
    isChef: boolean = false;
    isAgent: boolean = false;

    constructor(
        private featureService: FeaturesService,
        private nonConformiteService: NonConformiteService,
        private location: Location,
        protected messageService: MessageService,
        public roleService: RoleService
    ) {
        super();
    }

    /** L'utilisateur dont l'écran montre les dossiers, retenu pour les rechargements. */
    utilisateurCourant = '';

    ngOnInit() {
        this.userStructure = getCurrentUserStructure();
        const user = currentUserState.value as AuthData | any;
        this.utilisateurCourant = user?.userId;
        this.isRQ = this.roleService.isRQ;
        this.isChef = this.roleService.isChef;
        this.isAgent = this.roleService.isAgent;

        this.fetchObject();
    }

    fetchObject(): void {
        if (!this.utilisateurCourant) {
            const user = currentUserState.value as AuthData | any;
            this.utilisateurCourant = user?.userId;
        }
        this.getDemandeListUser(this.utilisateurCourant);
    }

    getDemandeListUser(userId: string) {
        this.loading = true;

        // ✅ Si RQ, Pilote (Chef) ou Admin : afficher l'ensemble des NC pour le suivi global.
        // Sinon (Agent simple) : n'afficher que les dossiers qu'il a créés ou qui lui sont imputés.
        const criteresUtilisateur: any[] = (this.roleService.isRQ || this.roleService.isChef || this.roleService.isAdmin)
            ? []
            : (userId ? [{ fields: ['createdById', 'userImputId'], operator: 'EQ' as const, value: userId }] : []);

        this.nonConformiteService
            .rechercher(criteresDeRecherche(criteresUtilisateur, this.currentFilters), this.currentPage, this.pageSize)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (res: ApiResponse<NonConformite>) => {
                    this.applyPagination(res);
                },
                error: (error) => {
                    console.error(error);
                    this.dataList = [];
                    this.totalElements = 0;
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

    /**
     * Un filtre change : la liste est redemandée au serveur depuis la première page.
     */
    handleFilter(event: NcFilter) {
        this.currentFilters = event;
        this.currentPage = 0;
        this.fetchObject();
    }

    archive(rowdata: any): void {
        this.nonConformiteService.updateStatus(rowdata.id, NonConformStatus.ARCHIVED).subscribe({
            next: () => {
                this.fetchObject();
                this.featureService.onReloadRequested(true);
                this.messageService.add({ severity: 'success', summary: 'Succès', detail: 'Non-Conformité archivée' });
            },
            error: () => {
                this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Une erreur est survenue' });
            }
        });
    }

    delete(rowdata: any) {
        this.nonConformiteService.delete(rowdata.id!).subscribe({
            next: () => {
                this.fetchObject();
                this.featureService.onReloadRequested(true);
                this.messageService.add({ severity: 'success', summary: 'Succès', detail: 'Non-Conformité supprimée' });
            },
            error: () => {
                this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Une erreur est survenue' });
            }
        });
    }

    protected readonly NonConformStatus = NonConformStatus;
}
