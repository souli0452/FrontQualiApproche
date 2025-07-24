import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';

import { takeUntil } from 'rxjs/operators';

import { MessageService } from 'primeng/api';

import { Location } from '@angular/common';
import { NonConformiteService } from '../../../../services/non-conformite.service';
import { FeaturesService } from '../../../../services/feature-service';
import { NonConformStatus } from '../../../../enums';
import { showToast, StatusEnum } from '../../../../utils';
import { ProcNonConformiteService } from '../../proc-non-conformite.service';
import { AuthService } from '../../../../services/auth-services/auth.service';


@Component({
    selector: 'app-traitement-action-draft',
    templateUrl: './traiter.component.html',
    standalone:false
})
export class TraiterComponent implements OnInit, OnDestroy {
    actualities: any[] = [];
    destroy$: Subject<boolean> = new Subject<boolean>();
    cols: any[] = [
        { field: 'numeroOdre', header: 'N° ordre', type: 'string', filter: true, width: '20%', centered: false },
        { field: 'numeroNc', header: 'N° non conformité', type: 'string', filter: true, width: '30%', centered: false },
        {
            field: 'procEmetteur',
            header: 'Processus emetteur',
            type: 'string',
            filter: true,
            width: '20%',
            centered: false
        },
        { field: 'dateEcheance', header: 'Date écheance', type: 'string', filter: true, width: '15%', centered: false }
    ];
    colsDetail: any[] = [
        {field: 'nomProcessus', header: 'Titre', type: 'string'},
        {field: 'justification', header: 'Description', type: 'string'},
        {field: 'createdAt', header: 'Date création', type: 'dateTime'},
        {field: 'dueDate', header: 'Date expiration', type: 'date'},
        {field: 'tags', header: 'Tags', type: 'tags'},
        {field: 'pieceJointes', header: 'Pièces Jointes', type: 'file'}

    ];
    user:any;

    constructor(private actualityService: ProcNonConformiteService,
                private messageService: MessageService,
                private location: Location,
                private featureService: FeaturesService,
                private  authService: AuthService,
    ) {
    }

    ngOnInit() {
        this.user = this.authService.getUser();
        this.fetchPlanActions();
    }

    goBack() {
        this.location.back();
    }

    fetchPlanActions() {
        this.actualityService
            .getPlanActions(this.user.email,"TRAITER")
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (data) => {
                    this.actualities = data.body!;
                }
            });
    }

    ngOnDestroy() {
        this.destroy$.next(true);
        this.destroy$.unsubscribe();
    }

    publish(rowdata: any) {

    }

    delete(rowdata: any) {


    }


    protected readonly NonConformStatus = NonConformStatus;
}
