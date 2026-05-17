import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';

import { takeUntil } from 'rxjs/operators';
import { getCurrentUserStructure, showToast, StatusEnum, StatusEnumShow } from '../../../utils';
import { MessageService } from 'primeng/api';
import { FeaturesService } from '../../../services/feature-service';
import { Location } from '@angular/common';
import { NonConformiteService } from '../../../services/non-conformite.service';
import { NonConformStatus } from '../../../enums';
import { Structure } from '../../structure/structure-config/structure';

@Component({
    selector: 'app-nc-draft',
    templateUrl: './nc-draft.component.html',
    standalone:false
})
export class NcDraftComponent implements OnInit, OnDestroy {
    actualities: any[] = [];
    loading: boolean = false;
    userStructure:Structure={};
    destroy$: Subject<boolean> = new Subject<boolean>();
    cols: any[] = [
        {field: 'numeroReference', header: 'N° ref', type: 'string', filter: true, width: '28%'},
        {field: 'origineService', header: 'Processus Destinataire', type: 'string', filter: true, width: '30%'},
        {field: 'currentUserfullName', header: 'Responsable', type: 'string', filter: true, width: '25%'},

        {field: 'createdAt', header: 'Date de soumission', type: 'string', filter: true, width: '25%'}
    ];
    colsDetail: any[] = [
        {field: 'nomProcessus', header: 'Titre', type: 'string'},
        {field: 'justification', header: 'Description', type: 'string'},
        {field: 'createdAt', header: 'Date création', type: 'dateTime'},
        {field: 'dueDate', header: 'Date expiration', type: 'date'},
        {field: 'tags', header: 'Tags', type: 'tags'},
        {field: 'pieceJointes', header: 'Pièces Jointes', type: 'file'}

    ];

    constructor(private actualityService: NonConformiteService,
                private messageService: MessageService,
                private location: Location,
                private featureService: FeaturesService
    ) {
    }

    ngOnInit() {
        this.userStructure = getCurrentUserStructure();
        this.fetchNc();
    }

    goBack() {
        this.location.back();
    }

    fetchNc() {
        this.loading = true;
        this.actualityService
            .findAllNc(NonConformStatus.DRAFT,this.userStructure.id)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (data) => {
                    this.actualities = data.body!;
                    this.loading = false;
                },
                error: (error) => {
                    this.loading = false;
                }
            });
    }

    ngOnDestroy() {
        this.destroy$.next(true);
        this.destroy$.unsubscribe();
    }

    publish(rowdata: any) {
        this.actualityService.updateStatus(rowdata.id!, NonConformStatus.PUBLISHED).subscribe({
            next: (data) => {
                this.fetchNc();
                showToast(StatusEnum.success, data.status, 'Opération succès', this.messageService);
                this.goBack();
                this.featureService.onReloadRequested(true);
            },
            error: error => {
                showToast(StatusEnum.error, error.status, 'Une erreur est survenue', this.messageService, error);
            }
        });
    }

    delete(rowdata: any) {
        this.actualityService.delete(rowdata.id!).subscribe({
            next: (data) => {
                this.fetchNc();
                this.featureService.onReloadRequested(true);

                showToast(StatusEnum.success, data.status, null, this.messageService);
                this.goBack();
            },
            error: error => {
                showToast(StatusEnum.error, error.status, null, this.messageService, error);
            }
        });
    }


    protected readonly NonConformStatus = NonConformStatus;
}
