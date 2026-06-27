import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { MessageService } from 'primeng/api';
import { Location } from '@angular/common';
import { FeaturesService } from '../../../../services/feature-service';
import { NonConformStatus } from '../../../../enums';
import { showToast, StatusEnum } from '../../../../utils';
import { AuthService } from '../../../../services/auth-services/auth.service';
import { TraitementActionTable } from '../../../../components/non-conformite/action-traitement/traitement-action-table';
import { NonConformiteService } from '../../../../services/non-conformite/non-conformite.service';
import { currentUserState } from '../../../../services/auth-services/auth.state';
import { AuthData } from '../../../../models';

@Component({
    selector: 'app-nc-non-traiter',
    templateUrl: './nc-non-traiter.html',
    standalone: true,
    imports: [TraitementActionTable]
})
export class NcNonTraiterComponent implements OnInit, OnDestroy {
    @Input() nonTraiterData: any[] = [];
    loading: boolean = false;
    destroy$: Subject<boolean> = new Subject<boolean>();
    cols: any[] = [
        { field: 'numeroOdre', header: 'N° Ordre', type: 'string', filter: true, centered: false },
        { field: 'numeroNc', header: 'N° Ref', type: 'string', filter: true, width: '200px', centered: false },
        {field: 'niveauNonConformiteLibelle', header: 'Gravité', type: 'badge', filter: true, width: '20%', centered: false },
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
    constructor(private nonConformiteService: NonConformiteService,
                private authService: AuthService,
                private messageService: MessageService,
                private featureService: FeaturesService,
                private location: Location) {
    }

    ngOnInit() {
        this.user = currentUserState.value as AuthData | any;
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
      this.nonConformiteService.nonConformiteUpdatePlanAction(rowdata).pipe().subscribe({
          next: (data) => {
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
