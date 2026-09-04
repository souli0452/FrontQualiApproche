import {Component, ViewChild, Input} from '@angular/core';
import {MessageService} from "primeng/api";
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { EtapeTraitement } from '../../../../enums/enums';
import { Router } from '@angular/router';
import { TraitementTableComponent } from '../../../../components/non-conformite/table-traitement/traitement-table';
import { NgPrimeModule } from '../../../../../prime-ng.module';
import { FeaturesService } from '../../../../services/feature-service';
import { Structure } from '../../../parametrages/structure/structure-config/structure';
import { ProcNonConformiteService } from '../../../../services/non-conformite/proc-non-conformite.service';
import { NonConformiteService } from '../../../../services/non-conformite/non-conformite.service';
import { ApiResponse } from '../../../../models/response.model';

@Component({
    selector: 'app-nc-reception',
    templateUrl: './nc-reception.html',
    standalone: true,
    imports: [
        CommonModule,
        NgPrimeModule,
        TraitementTableComponent
    ],
    providers: [MessageService]
})
export class ReceptionComponent {

    @Input() demandeList: any = [];
    title = 'Réceptions des non-conformités';
    destroy$ = new Subject<boolean>();
    userStructure:Structure={};
    cols: any[] = [];
    protected demande: any;
    loading: boolean = false;
    
    constructor(protected messageService: MessageService,
                private  featureService:FeaturesService,
                private service:ProcNonConformiteService,
                private nonConformiteService:NonConformiteService,
                private router: Router) {
        this.cols = [
            { field: 'numeroReference', header: 'N° ref', type: 'string', filter: true, width: '150px', centered: false },
            { field: 'structureSoumissionLibelle', header: 'Processus Emetteur', type: 'string', filter: true, width: '150px', centered: false },
            {
                field: 'currentUserfullName',
                header: 'Initateur',
                type: 'string',
                filter: true,
                width: '150px',
                centered: false
            },
            { field: 'status', header: 'Statut', type: 'enum', filter: true, width: '250px', centered: false },
            { field: 'niveauNonConformiteLibelle', header: 'Gravité', type: 'badge', filter: false, width: '150px', centered: false },
            { field: 'createdAt', header: 'Date soumission', type: 'date', filter: true, width: '150px', centered: false }
        ];
    }
    @ViewChild(TraitementTableComponent) dmdTraitement!: TraitementTableComponent;

    protected readonly BtnActions = EtapeTraitement;
    
    ngOnInit() {
    }

    onSuccess(res: ApiResponse<any>) {
        this.featureService.onReloadRequested(true);
        this.messageService.add({ severity: 'success', summary: 'Succès', detail: "L'opération a réussie !", life: 5000 });
        this.dmdTraitement.closeDetailsDialog();
    }
    reception(dmd:any) {
        this.nonConformiteService.nonConformiteUpdate(dmd).subscribe({
            next: (data) => {
                this.onSuccess(data);
            },
            error: (error) => {
                this.messageService.add({ severity: 'error', summary: 'Erreur', detail: "L'oppération à échouée ! Veuillez réessayer 11 Nc Reception", life: 3000 });
            }
        })
    }
    ngOnDestroy() {
        this.destroy$.next(true);
        this.destroy$.unsubscribe();
    }
    hideDialog(event: any) {
        if (event) {
            this.dmdTraitement.displayDetails();
            this.featureService.onReloadRequested(true);
        }
    }
}
