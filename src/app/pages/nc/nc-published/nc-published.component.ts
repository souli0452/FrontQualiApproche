import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { getCurrentUserStructure, showToast, StatusEnum } from '../../../utils';
import { MessageService } from 'primeng/api';
import { FeaturesService } from '../../../services/feature-service';
import { Location } from '@angular/common';
import { NonConformiteService } from '../../../services/non-conformite.service';
import { NonConformStatus } from '../../../enums';
import { Structure } from '../../structure/structure';

@Component({
    selector: 'app-nc-published',
    templateUrl: './nc-published.component.html',
    standalone:false
})
export class NcPublishedComponent implements OnInit, OnDestroy {
    actualities: any[] = [];
    loading: boolean = false;
    destroy$: Subject<boolean> = new Subject<boolean>();
    cols: any[] = [
        {field: 'numeroReference', header: 'N° ref', type: 'string', filter: true, width: '28%'},
        {field: 'origineService', header: 'Popcessus Destinataire', type: 'string', filter: true, width: '30%'},
        {field: 'currentUserfullName', header: 'Responsable', type: 'string', filter: true, width: '25%'},
        {
            field: 'publicationDate',
            header: 'Date publication',
            type: 'string',
            filter: true,
            width: '20%',
            skip: true
        }
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
    constructor(private actualityService: NonConformiteService,
                private messageService: MessageService,
                private featureService: FeaturesService,
                private location: Location) {
    }

    ngOnInit() {
        this.userStructure = getCurrentUserStructure();
        this.fetchActuality();
    }

    fetchActuality() {
        this.loading = true;
        this.actualityService
            .findAllNc(NonConformStatus.PUBLISHED,this.userStructure.id)
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

    goBack() {
        this.location.back();
    }

    ngOnDestroy() {
        this.destroy$.next(true);
        this.destroy$.unsubscribe();
    }

    archive(rowdata: any): void {
        this.actualityService.updateStatus(rowdata.id, NonConformStatus.ARCHIVED).subscribe({
            next: (data) => {
                this.fetchActuality();
                this.featureService.onReloadRequested(true);
                this.goBack();
                showToast(StatusEnum.success, data.status, 'Opération succès', this.messageService);
            },
            error: error => {
                showToast(StatusEnum.error, error.status, 'Une erreur est survenue', this.messageService, error);
            }
        });
    }

    delete(rowdata: any) {
        this.actualityService.delete(rowdata.id!).subscribe({
            next: (data) => {
                this.fetchActuality();
                this.featureService.onReloadRequested(true);
                showToast(StatusEnum.success, data.status, 'Opération succès', this.messageService);
            },
            error: error => {
                showToast(StatusEnum.error, error.status, 'Une erreur est survenue', this.messageService, error);
            }
        });
    }
    protected readonly NonConformStatus = NonConformStatus;
}
