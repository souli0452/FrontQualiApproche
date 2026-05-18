import {Component, ViewChild} from '@angular/core';
import {MessageService} from "primeng/api";
import {ProcNonConformiteService} from "../proc-non-conformite.service";
import {HttpResponse} from "@angular/common/http";
import {
    DmdTraitementTableTemplateComponent
} from "../../../components/dmd.traitement-table-template/dmd.traitement-table-template.component";
import { EtapeTraitement } from '../../../enums';
import {
    generateReportFile,
    getCurrentUserStructure,
    ReportFormat,
    ReportingInput,
    showToast,
    StatusEnum
} from '../../../utils';
import { CommonModule } from '@angular/common';
import { NgPrimeModule } from '../../../../prime-ng.module';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { FeaturesService } from '../../../services/feature-service';
import { RejetFormsComponent } from '../forms/rejet.forms/rejet.forms.component';
import { Structure } from '../../structure/structure-config/structure';

@Component({
  selector: 'app-reception',
  templateUrl: './reception.component.html',
  styleUrl: './reception.component.scss',
    standalone: true,
    imports: [
        CommonModule,
        NgPrimeModule,
        DmdTraitementTableTemplateComponent,
        RejetFormsComponent
    ],
    providers: [MessageService]
})
export class ReceptionComponent {
    demandeList: any = [];
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
            { field: 'numeroReference', header: 'N° ordre', type: 'string', filter: true, width: '10%', centered: false },
            { field: 'origineService', header: 'Nom processus', type: 'string', filter: true, width: '30%', centered: false },
            {
                field: 'currentUserfullName',
                header: 'Responsable',
                type: 'string',
                filter: true,
                width: '20%',
                centered: false
            },
            { field: 'status', header: 'Statut', type: 'enum', filter: true, width: '15%', centered: false },
            { field: 'createdAt', header: 'Date soumission', type: 'string', filter: true, width: '15%', centered: false }
        ];
    }
    @ViewChild(DmdTraitementTableTemplateComponent) dmdTraitement!: DmdTraitementTableTemplateComponent;

    protected readonly BtnActions = EtapeTraitement;
    motifRejetDialog: boolean=false;
ngOnInit() {
    this.userStructure = getCurrentUserStructure();
    this.getDemandeList()
}

    private editer(rowData: any, resp: HttpResponse<any>) {
        const reportingInput: ReportingInput = {
            reportFormat: ReportFormat.PDF,
            reportType: rowData.typeDemande,
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
    getDemandeList() {
        this.loading = true;
        this.service.getNonConformiteByEtapeAndSumit(EtapeTraitement.RECEPTION,this.userStructure.id!).subscribe({
            next: (data) => {
                this.demandeList = data.body;
                this.loading = false;
                console.log("demandeList : ",this.demandeList);
                
            },
            error: (error) => {
                this.loading = false;
                //showToastDm(handleHttpErrors(error, 'error', 'Récupération', 'demandeKey'), this.messageService)
            }
        });
    }
      onSuccess(res: HttpResponse<any>) {
         this.getDemandeList()
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
             this.getDemandeList()
             this.dmdTraitement.closeDetailsDialog();
             this.messageService.add({ severity: 'success', summary: 'SUCCES', detail: "L'oppération à réussie !", life: 3000 });
         },
         error: (error) => {
            console.log("ERREUR : ", error);
            
             this.messageService.add({ severity: 'error', summary: 'ERREUR', detail: "L'oppération à échouée ! Veuillez réessayer 11", life: 3000 });
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
            this.getDemandeList();
        }
    }
}
