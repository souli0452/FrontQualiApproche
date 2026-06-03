import {Component, ViewChild, Input} from '@angular/core';
import {MessageService} from "primeng/api";
import {HttpResponse} from "@angular/common/http";
import { CommonModule } from '@angular/common';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { EtapeTraitement } from '../../../../enums';
import { TraitementTableComponent } from '../../../../components/non-conformite/table-traitement/traitement-table';
import { NgPrimeModule } from '../../../../../prime-ng.module';
import { RejetFormsComponent } from '../../../proc-non-conformite/forms/rejet.forms/rejet.forms.component';
import { Structure } from '../../../structure/structure-config/structure';
import { FeaturesService } from '../../../../services/feature-service';
import { ProcNonConformiteService } from '../../../proc-non-conformite/proc-non-conformite.service';
import { generateReportFile, ReportFormat, ReportingInput, showToast, StatusEnum, TypeDemande } from '../../../../utils';
import { NCRejetComponent } from '../../nc-rejet/nc-rejet';

@Component({
    selector: 'app-vue-ensemble-reception',
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
                private service:ProcNonConformiteService) {
        this.cols = [
            { field: 'numeroReference', header: 'N° ref', type: 'string', filter: true, width: '220px', centered: false },
            { field: 'structureSoumissionLibelle', header: 'Processus Emetteur', type: 'string', filter: true, width: '300px', centered: false },
            {
                field: 'currentUserfullName',
                header: 'Initateur',
                type: 'string',
                filter: true,
                width: '150px',
                centered: false
            },
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

    edition(demandes: any) {
        this.service.updateNomConformites(demandes).subscribe({
            next: (data) => {

                this.editer(demandes[0], data);
                this.dmdTraitement.closeDetailsDialog();
            },
            error: () => {
                this.messageService.add({ severity: 'error', summary: 'ERREUR', detail: "L'oppération à échouée ! Veuillez réessayer 10", life: 3000 });
            }
            });
    }
    // getDemandeList() {
    //     this.loading = true;
    //     this.service.getNonConformiteByEtapeAndSumit(EtapeTraitement.RECEPTION,this.userStructure.id!).subscribe({
    //         next: (data) => {
    //             this.demandeList = data.body;
    //             this.loading = false;
    //             console.log("demandeList : ",this.demandeList);
                
    //         },
    //         error: (error) => {
    //             this.loading = false;
    //             //showToastDm(handleHttpErrors(error, 'error', 'Récupération', 'demandeKey'), this.messageService)
    //         }
    //     });
    // }
      onSuccess(res: HttpResponse<any>) {
         this.featureService.onReloadRequested(true);
        showToast(StatusEnum.success, res.status, null, this.messageService);
          this.dmdTraitement.closeDetailsDialog();
    }
    rejet(demande: any) {
        this.demande = demande;
        this.motifRejetDialog = true;
    }
    reception(dmd:any) {
        console.log("dmd : ",dmd);
        
        this.service.updateNomConformites(dmd).subscribe({
            next: (data) => {
                this.featureService.onReloadRequested(true);
                this.dmdTraitement.closeDetailsDialog();
                this.messageService.add({ severity: 'success', summary: 'SUCCÈS', detail: "L'opération a réussie !", life: 3000 });
            },
            error: (error) => {
                console.log("ERREUR : ", error);
                
                this.messageService.add({ severity: 'error', summary: 'ERREUR', detail: "L'oppération à échouée ! Veuillez réessayer 11 Nc Reception", life: 3000 });
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
