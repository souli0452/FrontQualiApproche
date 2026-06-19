import {Component, ViewChild, Input} from '@angular/core';
import {MessageService} from "primeng/api";
import {HttpResponse} from "@angular/common/http";
import { CommonModule } from '@angular/common';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { EtapeTraitement } from '../../../../enums';
import { Router } from '@angular/router';
import { TraitementTableComponent } from '../../../../components/non-conformite/table-traitement/traitement-table';
import { NgPrimeModule } from '../../../../../prime-ng.module';
import { FeaturesService } from '../../../../services/feature-service';
import { generateReportFile, ReportFormat, ReportingInput, showToast, StatusEnum, TypeDemande } from '../../../../utils';
import { NCRejetComponent } from '../../nc-rejet/nc-rejet';
import { Structure } from '../../../parametrages/structure/structure-config/structure';
import { ProcNonConformiteService } from '../../../../services/non-conformite/proc-non-conformite.service';
import { NonConformiteService } from '../../../../services/non-conformite/non-conformite.service';
import { ApiResponse } from '../../../../models';

@Component({
    selector: 'app-nc-reception',
    templateUrl: './nc-reception.html',
    standalone: true,
    imports: [
        CommonModule,
        NgPrimeModule,
        TraitementTableComponent,
        NCRejetComponent
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
    motifRejetDialog: boolean=false;
    
    ngOnInit() {
    }

    private editer(rowData: any, resp: HttpResponse<any>) {
        const reportingInput: ReportingInput = {
            reportFormat: ReportFormat.PDF,
            reportType: TypeDemande.NON_CONFORMITE,
            entityId: rowData.id!,
        };
        this.featureService.printReport(reportingInput).pipe(takeUntil(this.destroy$))
            .subscribe({
                next: arrayBytes => {
                    if (arrayBytes.byteLength) {
                        generateReportFile(arrayBytes, reportingInput);
                        this.dmdTraitement.displayDetails(resp.body);
                        this.messageService.add({ severity: 'success', summary: 'Succès', detail: "L'oppération à réussie !", life: 3000 });
                    }
                },
                error: () => {
                    this.messageService.add({ severity: 'error', summary: 'ERREUR', detail: "L'oppération à échouée ! Veuillez réessayer 9", life: 3000 });
                    //showToast(handleHttpErrors(err, 'error', 'Impression correspondance', 'demandeCodeKey'), this.messageService);
                }
            });
    }

    // edition(demandes: any) {
    //     this.service.updateNomConformites(demandes).subscribe({
    //         next: (data) => {

    //             this.editer(demandes[0], data);
    //             this.dmdTraitement.closeDetailsDialog();
    //         },
    //         error: () => {
    //             this.messageService.add({ severity: 'error', summary: 'ERREUR', detail: "L'oppération à échouée ! Veuillez réessayer 10", life: 3000 });
    //         }
    //         });
    // }

    onSuccess(res: ApiResponse<any>) {
        this.featureService.onReloadRequested(true);
        this.messageService.add({ severity: 'success', summary: 'Succès', detail: "L'opération a réussie !", life: 5000 });
        this.dmdTraitement.closeDetailsDialog();
    }
    rejet(demande: any) {
        this.demande = demande;
        this.motifRejetDialog = true;
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
