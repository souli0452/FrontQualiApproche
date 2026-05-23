import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';

import { takeUntil } from 'rxjs/operators';
import { getCurrentUserStructure, showToast, StatusEnum, StatusEnumShow } from '../../../utils';
import { MessageService } from 'primeng/api';
import { FeaturesService } from '../../../services/feature-service';
import { Location } from '@angular/common';
import { NonConformiteService } from '../../../services/non-conformite.service';
import { NonConformStatus } from '../../../enums';
import { Structure } from '../../structure/structure-config/structure';
import { ProcNonConformiteService } from '../../proc-non-conformite/proc-non-conformite.service';
import { AuthService } from '../../../services/auth-services/auth.service';

@Component({
    selector: 'app-nc-draft',
    templateUrl: './nc-draft.component.html',
    standalone:false
})
export class NcDraftComponent implements OnInit, OnDestroy {
    // actualities: any[] = [];
    @Input() brouillonData: any[] = [];
    loading: boolean = false;
    userStructure:Structure={};
    destroy$: Subject<boolean> = new Subject<boolean>();
    cols: any[] = [
        {field: 'numeroReference', header: 'N° ref', type: 'string', filter: true, width: '220px'},
        {field: 'typeProcessusLibelle', header: 'Processus concerné', type: 'string', filter: true, width: '300px'},
        {field: 'niveauNonConformiteLibelle', header: 'Gravité', type: 'badge', filter: true, width: '150px'},
        {field: 'createdAt', header: 'Date de soumission', type: 'date', filter: true, width: '200px'}
    ];

    colsDetail: any[] = [
        {field: 'nomProcessus', header: 'Titre', type: 'string'},
        {field: 'justification', header: 'Description', type: 'string'},
        {field: 'createdAt', header: 'Date création', type: 'dateTime'},
        {field: 'dueDate', header: 'Date expiration', type: 'date'},
        {field: 'tags', header: 'Tags', type: 'tags'},
        {field: 'pieceJointes', header: 'Pièces Jointes', type: 'file'}

    ];

    constructor(
        private actualityService: NonConformiteService,
        private messageService: MessageService,
        private location: Location,
        private featureService: FeaturesService,
        private procService: ProcNonConformiteService, 
        private authService: AuthService
    ) {
    }

    ngOnInit() {
        // this.userStructure = getCurrentUserStructure();
        // this.fetchUserDrafts();
        // this.getUserDrafts();
    }

    goBack() {
        this.location.back();
    }

    // fetchUserDrafts() {
    // const user = this.authService.getUser();
    // if (!user || !user.userId) return;

    // this.loading = true;

    // this.procService.getNCByUser(user.userId)
    //     .pipe(takeUntil(this.destroy$))
    //     .subscribe({
    //     next: (res) => {
    //         const allNcs = res.body;

    //         if (allNcs && Array.isArray(allNcs)) {
    //         // Filtrer uniquement les Brouillons (DRAFT)
    //         this.actualities = allNcs.filter((nc: any) => nc.status === 'DRAFT');
    //         console.log('Brouillons (DRAFT) filtrés :', this.draftsData);
    //         }
            
    //         this.loading = false;
    //     },
    //     error: (err) => {
    //         console.error('Erreur lors de la récupération des données NC :', err);
    //         this.loading = false;
    //     }
    //     });
    // }

    // fetchNc() {
    //     this.loading = true;
    //     this.actualityService
    //         .findAllNc(NonConformStatus.DRAFT,this.userStructure.id)
    //         .pipe(takeUntil(this.destroy$))
    //         .subscribe({
    //             next: (data) => {
    //                 this.actualities = data.body!;
    //                 this.loading = false;
    //                 console.log("DONNÉES DRAFT REÇUES :", this.actualities);
    //             },
    //             error: (error) => {
    //                 this.loading = false;
    //             }
    //         });
    // }

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

                showToast(StatusEnum.success, data.status, 'Succès', this.messageService);
                // this.goBack();
            },
            error: error => {
                showToast(StatusEnum.error, error.status, 'Une erreur est survenue', this.messageService, error);
            }
        });
    }


    protected readonly NonConformStatus = NonConformStatus;
}
