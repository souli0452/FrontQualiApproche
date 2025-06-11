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
import { Structure } from '../../structure/structure';

@Component({
  selector: 'app-reception',
  templateUrl: './reception.component.html',
  styleUrl: './reception.component.scss',
    standalone: true,
    imports:[
        CommonModule,
        NgPrimeModule,
        DmdTraitementTableTemplateComponent
    ],
    providers: [MessageService]
})
export class ReceptionComponent {
    demandeList: any = [];
    title = 'Réceptions des non-conformités';
    destroy$ = new Subject<boolean>();
    userStructure:Structure={};
    constructor(protected messageService: MessageService,
                private  featureService:FeaturesService,
                private service:ProcNonConformiteService) {
    }
    @ViewChild(DmdTraitementTableTemplateComponent) dmdTraitement!: DmdTraitementTableTemplateComponent;

    protected readonly BtnActions = EtapeTraitement;
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
                        this.messageService.add({ severity: 'success', summary: 'ERREUR', detail: "L'oppération à réussie !", life: 3000 });
                    }
                },
                error: () => {
                    this.messageService.add({ severity: 'error', summary: 'ERREUR', detail: "L'oppération à échouée ! Veuillez réessayer", life: 3000 });
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
                this.messageService.add({ severity: 'error', summary: 'ERREUR', detail: "L'oppération à échouée ! Veuillez réessayer", life: 3000 });
            }
            });
    }
    getDemandeList() {
        this.service.getNonConformiteByEtapeAndSumit(EtapeTraitement.RECEPTION,this.userStructure.id!).subscribe({
            next: (data) => {
                this.demandeList = data.body;
            },
            error: (error) => {
                //showToastDm(handleHttpErrors(error, 'error', 'Récupération', 'demandeKey'), this.messageService)
            }
        });
    }
      onSuccess(res: HttpResponse<any>) {
         this.getDemandeList()
        showToast(StatusEnum.success, res.status, null, this.messageService);
          this.dmdTraitement.closeDetailsDialog();
    }

    reception(dmd:any) {
     this.service.updateNomConformites(dmd).subscribe({
         next: (data) => {
             this.getDemandeList()
             this.dmdTraitement.closeDetailsDialog();
             this.messageService.add({ severity: 'success', summary: 'ERREUR', detail: "L'oppération à réussie !", life: 3000 });
         },
         error: (error) => {
             this.messageService.add({ severity: 'error', summary: 'ERREUR', detail: "L'oppération à échouée ! Veuillez réessayer", life: 3000 });
         }
     })
    }
    ngOnDestroy() {
        this.destroy$.next(true);
        this.destroy$.unsubscribe();
    }
}
