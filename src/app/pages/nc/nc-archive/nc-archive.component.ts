import { Component, OnDestroy, OnInit } from '@angular/core';

import { Subject } from 'rxjs';

import { takeUntil } from 'rxjs/operators';
import { NonConformiteService } from '../../../services/non-conformite.service';
import { NonConformStatus } from '../../../enums';
import { getCurrentUserStructure } from '../../../utils';
import { Structure } from '../../structure/structure';

@Component({
    selector: 'app-nc-archive',
    templateUrl: './nc-archive.component.html',
    standalone:false
})
export class NcArchiveComponent implements OnInit, OnDestroy {
    actualities: any[] = [];
    loading: boolean = false;
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
        {field: 'publicationDate', header: 'Date publication', type: 'dateTime'},
        {field: 'archivageDate', header: 'Date archivage', type: 'dateTime'},
        {field: 'fichiers', header: 'Pièces Jointes', type: 'file'}

    ];
    userStructure:Structure={};
    constructor(private actualityService: NonConformiteService) {
    }

    ngOnInit() {
        this.userStructure = getCurrentUserStructure();
        this.loading = true;
        this.actualityService
            .findAllNc(NonConformStatus.ARCHIVED,this.userStructure.id)
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


    protected readonly NonConformStatus = NonConformStatus;
}
