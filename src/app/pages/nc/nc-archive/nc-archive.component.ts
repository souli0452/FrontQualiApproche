import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { NonConformStatus } from '../../../enums';
import { getCurrentUserStructure } from '../../../utils';
import { NonConformiteService } from '../../../services/non-conformite/non-conformite.service';
import { Structure } from '../../parametrages/structure/structure-config/structure';
import { ApiResponse } from '../../../models';

@Component({
    selector: 'app-nc-archive',
    templateUrl: './nc-archive.component.html',
    standalone: false
})
export class NcArchiveComponent implements OnInit, OnDestroy {
    brouillonData: any[] = [];
    loading: boolean = false;
    destroy$: Subject<boolean> = new Subject<boolean>();
    cols: any[] = [
        { field: 'numeroReference', header: 'N° ref', type: 'string', filter: true, width: '28%' },
        { field: 'structureSoumissionLibelle', header: 'Processus Emetteur', type: 'string', filter: true, width: '30%' },
        { field: 'currentUserfullName', header: 'Responsable', type: 'string', filter: true, width: '25%' },
        { field: 'createdAt', header: 'Date de soumission', type: 'string', filter: true, width: '25%' }
    ];
    colsDetail: any[] = [
        { field: 'nomProcessus', header: 'Titre', type: 'string' },
        { field: 'justification', header: 'Description', type: 'string' },
        { field: 'createdAt', header: 'Date création', type: 'dateTime' },
        { field: 'dueDate', header: 'Date expiration', type: 'date' },
        { field: 'publicationDate', header: 'Date publication', type: 'dateTime' },
        { field: 'archivageDate', header: 'Date archivage', type: 'dateTime' },
        { field: 'fichiers', header: 'Pièces Jointes', type: 'file' }
    ];
    userStructure:Structure={};
    constructor(private nonConformiteService: NonConformiteService) {
    }

    ngOnInit() {
        this.userStructure = getCurrentUserStructure();
        this.loading = true;

        // this.nonConformiteService
        //     .findAllNc(0, 10, NonConformStatus.ARCHIVED, this.userStructure.id) // ✅ ordre corrigé
        //     .pipe(takeUntil(this.destroy$))
        //     .subscribe({
        //         next: (res: ApiResponse<any>) => {
        //             this.brouillonData = res.data.content || []; // ✅ CORRECT
        //             this.loading = false;
        //         },
        //         error: (error) => {
        //             this.loading = false;
        //             console.error(error);
        //         }
        //     });
    }

    ngOnDestroy() {
        this.destroy$.next(true);
        this.destroy$.unsubscribe();
    }

    protected readonly NonConformStatus = NonConformStatus;
}
