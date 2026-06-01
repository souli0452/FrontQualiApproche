import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MessageService } from 'primeng/api';
import { Location } from '@angular/common';
import { FeaturesService } from '../../../../services/feature-service';
import { NonConformStatus } from '../../../../enums';
import { showToast, StatusEnum } from '../../../../utils';
import { ProcNonConformiteService } from '../../proc-non-conformite.service';
import { AuthService } from '../../../../services/auth-services/auth.service';

@Component({
    selector: 'app-traitement-action-published',
    templateUrl: './non-traiter.component.html',
    standalone:false
})
export class NonTraiterComponent implements OnInit, OnDestroy {
    actualities: any[] = [];
    loading: boolean = false;
    destroy$: Subject<boolean> = new Subject<boolean>();
    cols: any[] = [
        { field: 'numeroOdre', header: 'N° ordre', type: 'string', filter: true, width: '20%', centered: false },
        { field: 'numeroNc', header: 'N° non conformité', type: 'string', filter: true, width: '30%', centered: false },
        {
            field: 'procEmetteur',
            header: 'Processus emetteur',
            type: 'string',
            filter: true,
            width: '30%',
            centered: false
        },
        { field: 'dateEcheance', header: 'Date écheance', type: 'string', filter: true, width: '18%', centered: false }
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
user: any = {};
    constructor(private actualityService: ProcNonConformiteService,
                private authService: AuthService,
                private messageService: MessageService,
                private featureService: FeaturesService,
                private location: Location) {
    }

    ngOnInit() {
        this.user = this.authService.getUser();
        this.fetchPlanActions();
    }

    fetchPlanActions() {
        this.loading = true;
        this.actualityService
            .getPlanActions(this.user.email,"NON_TRAITER")
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

    traiter(rowdata: any): void {
        rowdata.status=NonConformStatus.TRAITER
      this.actualityService.updatePlanAction(rowdata).pipe().subscribe({
          next: (data) => {
              this.fetchPlanActions();
              this.featureService.onReloadRequested(true);
              showToast(StatusEnum.success, data.status, null, this.messageService);
                 this.goBack();
          },
          error:(error)=>{
              showToast(StatusEnum.error,error.status, null, this.messageService, error);

          }
      })
    }

    delete(rowdata: any) {
    }
    protected readonly NonConformStatus = NonConformStatus;
}
