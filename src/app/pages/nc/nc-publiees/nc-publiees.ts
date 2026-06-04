import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { getCurrentUserStructure, hasAnyPermission, showToast, StatusEnum } from '../../../utils';
import { MessageService } from 'primeng/api';
import { FeaturesService } from '../../../services/feature-service';
import { Location } from '@angular/common';
import { NonConformStatus } from '../../../enums';
import { AuthService } from '../../../services/auth-services/auth.service';
import { CommonModule } from '@angular/common';
import { NgPrimeModule } from '../../../../prime-ng.module';
import { NcModule } from '../nc.module';
import { NonConformiteService } from '../../../services/non-conformite/non-conformite.service';
import { Structure } from '../../parametrages/structure/structure-config/structure';
import { ProcNonConformiteService } from '../../../services/non-conformite/proc-non-conformite.service';

@Component({
    selector: 'app-nc-publiees',
    templateUrl: './nc-publiees.html',
    standalone: true,
    imports: [CommonModule, NgPrimeModule, NcModule]
})
export class NcPublieesComponent implements OnInit, OnDestroy {
    publishedList: any[] = [];
    loading: boolean = false;
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

ngOnInit() {
        this.userStructure = getCurrentUserStructure();
        const user = this.authService.getUser();
        const userId = user?.userId;
        
        // 2. Appel de la bonne méthode
        if (userId) {
            this.getDemandeListUser(userId);
        }
    }

    getDemandeListUser(userId: string) {
        this.loading = true;
        this.service.getNCByUser(userId).subscribe({
            next: (data) => {
                this.publishedList = data.body || [];
                this.loading = false;
            },
            error: (error) => {
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

    archive(rowdata: any): void {
        this.nonConformiteService.updateStatus(rowdata.id, NonConformStatus.ARCHIVED).subscribe({
            next: (data) => {
                this.publishedList = this.publishedList.filter(item => item.id !== rowdata.id);
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
                this.publishedList = this.publishedList.filter(item => item.id !== rowdata.id);
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
