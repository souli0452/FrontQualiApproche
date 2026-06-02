import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { showToast, StatusEnum } from '../../../utils';
import { MessageService } from 'primeng/api';
import { FeaturesService } from '../../../services/feature-service';
import { Location } from '@angular/common';
import { NonConformStatus } from '../../../enums';
import { Structure } from '../../structure/structure-config/structure';
import { ProcNonConformiteService } from '../../proc-non-conformite/proc-non-conformite.service';
import { AuthService } from '../../../services/auth-services/auth.service';
import { NonConformiteService } from '../../../services/non-conformite/non-conformite.service';

@Component({
    selector: 'app-nc-draft',
    templateUrl: './nc-draft.component.html',
    standalone: false
})
export class NcDraftComponent implements OnInit, OnDestroy {
    // actualities: any[] = [];
    @Input() brouillonData: any[] = [];
    loading: boolean = false;
    userStructure: Structure = {};
    destroy$: Subject<boolean> = new Subject<boolean>();
    cols: any[] = [
        {field: 'numeroReference', header: 'N° Ref', type: 'string', filter: true, width: '220px'},
        {field: 'typeProcessusLibelle', header: 'Processus concerné', type: 'string', filter: true, width: '300px'},
        {field: 'niveauNonConformiteLibelle', header: 'Gravité', type: 'badge', filter: true, width: '150px'},
        {field: 'createdAt', header: 'Date de soumission', type: 'date', filter: true, width: '200px'}
    ];

    colsDetail: any[] = [
        { field: 'nomProcessus', header: 'Titre', type: 'string' },
        { field: 'justification', header: 'Description', type: 'string' },
        { field: 'createdAt', header: 'Date création', type: 'dateTime' },
        { field: 'dueDate', header: 'Date expiration', type: 'date' },
        { field: 'tags', header: 'Tags', type: 'tags' },
        { field: 'pieceJointes', header: 'Pièces Jointes', type: 'file' }
    ];

    constructor(
        private actualityService: NonConformiteService,
        private messageService: MessageService,
        private featureService: FeaturesService,
    ) {
    }

    ngOnInit() {
    }

    ngOnDestroy() {
        this.destroy$.next(true);
        this.destroy$.unsubscribe();
    }

    publish(rowdata: any) {
        this.actualityService.updateStatus(rowdata.id!, NonConformStatus.PUBLISHED).subscribe({
            next: (data) => {
                // this.fetchUserDrafts();
                this.messageService.add({ severity: 'success', summary: 'Succès', detail: 'Opération succès' });
                // this.goBack();
                this.featureService.onReloadRequested(true);
            },
            error: error => {
                this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Une erreur est survenue' });
            }
        });
    }

    delete(rowdata: any) {
        this.actualityService.delete(rowdata.id!).subscribe({
            next: (data) => {
                // this.fetchUserDrafts();
                this.featureService.onReloadRequested(true);
                this.messageService.add({ severity: 'success', summary: 'Succès', detail: 'La non-conformité a été supprimée avec succès.' });
                // this.goBack();
            },
            error: error => {
                this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Une erreur est survenue' });
            }
        });
    }

    protected readonly NonConformStatus = NonConformStatus;
}
