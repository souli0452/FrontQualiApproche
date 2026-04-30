import { Component, ViewChild } from '@angular/core';
import {
    DmdTraitementTableTemplateComponent
} from '../../../components/dmd.traitement-table-template/dmd.traitement-table-template.component';
import { Toast } from 'primeng/toast';
import { Structure } from '../../structure/structure';
import { EtapeTraitement } from '../../../enums';
import { MessageService } from 'primeng/api';
import { ProcNonConformiteService } from '../proc-non-conformite.service';
import { getCurrentUserStructure, showToast, StatusEnum } from '../../../utils';
import { HttpResponse } from '@angular/common/http';
import { AuthService } from '../../../services/auth-services/auth.service';
import { takeUntil } from 'rxjs/operators';

@Component({
    selector: 'app-plan-action',
    imports: [DmdTraitementTableTemplateComponent, Toast],
    templateUrl: './plan-action.component.html',
    styleUrl: './plan-action.component.scss'
})
export class PlanActionComponent {
    demandeList: any = [];
    loading: boolean = false;
    title = "Mise en oeuvres des plans d'actions";
    @ViewChild(DmdTraitementTableTemplateComponent) dmdTraitement!: DmdTraitementTableTemplateComponent;
    userStructure:Structure={};
    protected readonly BtnActions = EtapeTraitement;
    cols: any[] = [];
    user:any;
    users:any[]=[];
    constructor(private authService: AuthService,protected messageService: MessageService,private service:ProcNonConformiteService) {
        this.cols = [
            { field: 'numeroOdre', header: 'N° ordre', type: 'string', filter: true, width: '10%', centered: false },
            { field: 'numeroNc', header: 'N° non conformité', type: 'string', filter: true, width: '30%', centered: false },
            {
                field: 'procEmetteur',
                header: 'Processus emetteur',
                type: 'string',
                filter: true,
                width: '20%',
                centered: false
            },
            { field: 'status', header: 'Statut', type: 'enum', filter: true, width: '15%', centered: false },
            { field: 'dateEcheance', header: 'Date écheance', type: 'string', filter: true, width: '15%', centered: false }
        ];
    }
    ngOnInit() {
        this.userStructure = getCurrentUserStructure();
        this.user = this.authService.getUser();
        this.getDemandeList()
    }

    getDemandeList() {

    }
    onSuccess(res: HttpResponse<any>) {
        showToast(StatusEnum.success, res.status, null, this.messageService);
    }
    imputation(selectedDemandes: any) {
        this.service.updateNomConformites(selectedDemandes).subscribe({
            next: (data) => {
                this.getDemandeList();
                this.messageService.add({ severity: 'success', summary: 'Réussi', detail: 'Demandes imputées avec succès', life: 3000 });
                this.dmdTraitement.closeDetailsDialog();

            },
            error: () => {
                this.messageService.add({ severity: 'error', summary: 'ERREUR', detail: "L'oppération à échouée ! Veuillez réessayer", life: 3000 });
            }
        });
    }
}
