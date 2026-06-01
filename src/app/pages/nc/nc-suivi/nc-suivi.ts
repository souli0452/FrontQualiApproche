import { Component, ViewChild } from '@angular/core';
import { MessageService } from 'primeng/api';
import { EtapeTraitement } from '../../../enums';
import { HttpResponse } from '@angular/common/http';
import {
    generateReportFile,
    getCurrentUserStructure,
    isUserInRoles,
    ReportFormat,
    ReportingInput,
    showToast,
    StatusEnum
} from '../../../utils';
import { CommonModule } from '@angular/common';
import { NgPrimeModule } from '../../../../prime-ng.module';
import { FeaturesService } from '../../../services/feature-service';
import { TraitementTableComponent } from '../../../components/non-conformite/table-traitement/traitement-table';
import { NcFilter, NcFilterBarComponent } from '../nc-filter-bar/nc-filter-bar';
import { ProcNonConformiteService } from '../../proc-non-conformite/proc-non-conformite.service';
import { AuthService } from '../../../services/auth-services/auth.service';
import { Subject, takeUntil } from 'rxjs';
import { hasAnyPermission } from '../../../utils';

@Component({
    selector: 'app-nc-suivi',
    templateUrl: './nc-suivi.html',
    styleUrl: './nc-suivi.scss',
    standalone: true,
    imports:[
        CommonModule,
        NgPrimeModule,
        NcFilterBarComponent,
        TraitementTableComponent
    ]
})
export class NCSuiviComponent {
    demandeList: any = [];
    rawDemandeList: any[] = [];
    currentFilters: NcFilter | undefined;

    title = 'Consultations des non-conformités';
    loading: boolean = false;
    cols: any[] = [];
    userStructure:any={};

    isRQ: boolean = false;
    isChef: boolean = false;
    isAgent: boolean = false;

    private destroy$ = new Subject<void>();

    constructor(
      private featureService:FeaturesService,
      protected messageService: MessageService,
      private service:ProcNonConformiteService,
      private authService: AuthService) 
      {
        this.userStructure = getCurrentUserStructure();
        this.cols = [
            { field: 'numeroReference', header: 'N° Ref', type: 'string', filter: true, width: '250px', centered: false },
            { field: 'structureSoumissionLibelle', header: 'Processus Emetteur', type: 'string', filter: true, width: '150px', centered: false },
            { field: 'status', header: 'Statut', type: 'enum', filter: true, width: '250px', centered: false },
            {
                field: 'typeNonConformiteLibelle',
                header: 'Source',
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

    handleFilter(event: NcFilter) {
        this.currentFilters = event;
        this.applyLocalFilters();
    }

    ngOnInit() {
        this.loadSuiviData();
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    loadSuiviData() {
        this.loading = true;
        const user = this.authService.getUser();
        
        if (!user || !user.permissions) {
            console.warn("Utilisateur non connecté ou sans permissions.");
            this.loading = false;
            return;
        }
    
        const currentUserId = user.id || user.userId;
        
    
        // 1. Détermination stricte des rôles
        const hasRQ = hasAnyPermission(['VALIDATION_RQ']);
        const hasChef = hasAnyPermission(['VALIDATION_CHEF']);
    
        if (hasRQ) {
            this.isRQ = true;
            this.isChef = false;
            this.isAgent = false;
        } else if (hasChef) {
            this.isChef = true;
            this.isRQ = false;
            this.isAgent = false;
        } else {
            this.isAgent = true;
            this.isRQ = false;
            this.isChef = false;
        }
    
        // 2. Récupération des données selon le rôle
        if (this.isRQ) {
            this.getDemandeList();
        } 
        else if (this.isChef) {
            this.getDemandeListStructure();
        }
        else if (this.isAgent) {
            this.getDemandeListUser(currentUserId!);
        }
    }

    applyLocalFilters() {
        const filters = this.currentFilters || {} as any;
        const { dateDebut, dateFin, process, gravite, origine } = filters;

        const filterFn = (item: any) => {
            if (!item) return false;
            let isValid = true;

            if (dateDebut || dateFin) {
                const itemDateStr = item.dateCreation || item.createdAt || item.date;
                if (itemDateStr) {
                    const itemDate = new Date(itemDateStr);
                    itemDate.setHours(0,0,0,0);
                    
                    if (dateDebut) {
                        const start = new Date(dateDebut);
                        start.setHours(0,0,0,0);
                        if (itemDate < start) isValid = false;
                    }
                    if (dateFin) {
                        const end = new Date(dateFin);
                        end.setHours(23,59,59,999);
                        if (itemDate > end) isValid = false;
                    }
                }
            }
            if (process && process.id) {
                if (item.typeProcessusId !== process.id) isValid = false;
            }
            if (gravite && gravite.id) {
                if (item.niveauNonConformiteId !== gravite.id) isValid = false;
            }
            if (origine && origine.id) {
                if (item.typeNonConformiteId !== origine.id) isValid = false;
            }
            return isValid;
        };

        this.demandeList = this.rawDemandeList.filter(filterFn);
    }


    getDemandeList() {
        this.loading = true;
        this.service.getNonConformiteAll().subscribe({
            next: (data) => {
                this.rawDemandeList = data.body || [];
                this.applyLocalFilters();
                this.featureService.onReloadRequested(true);
                this.loading = false;
            },
            error: (error) => {
                this.loading = false;
            }
        });
    }

    getDemandeListStructure() {
        this.loading = true;
        this.service.getNonConformiteAllStructure(this.userStructure.id).subscribe({
            next: (data) => {
                this.rawDemandeList = data.body || [];
                this.applyLocalFilters();
                this.featureService.onReloadRequested(true);
                this.loading = false;
            },
            error: (error) => {
                this.loading = false;
            }
        });
    }

    getDemandeListUser(userId: string) {
        console.log('UTILISATEUR ID : ', userId);
        this.loading = true;
        this.service.getNCByUser(userId).subscribe({
            next: (data) => {
                console.log("Demande list : ", data);
                this.rawDemandeList = data.body || [];
                this.applyLocalFilters();
                this.featureService.onReloadRequested(true);
                this.loading = false;
            },
            error: (error) => {
                this.loading = false;
            }
        });
    }

    onSuccess(res: HttpResponse<any>) {
        this.getDemandeList()
        showToast(StatusEnum.success, res.status, null, this.messageService);
        this.dmdTraitement.closeDetailsDialog();
    }

    cloture(dmd:any) {
        this.service.updateNomConformite(dmd,dmd.id).subscribe({
            next: (data) => {
                this.onSuccess(data);
            },
            error: (error) => {

            }
        })
    }

    private editer(rowData: any, resp: HttpResponse<any>) {
        const reportingInput: ReportingInput = {
            reportFormat: ReportFormat.PDF,
            reportType: rowData.typeDemande,
            entityId: rowData.id!,
        };
        this.featureService.printReport(reportingInput).pipe()
            .subscribe({
                next: arrayBytes => {
                    if (arrayBytes.byteLength) {
                        generateReportFile(arrayBytes, reportingInput);
                        this.dmdTraitement.displayDetails(resp.body);
                        this.messageService.add({ severity: 'success', summary: 'Succès', detail: "L'oppération à réussie !", life: 3000 });
                    }
                },
                error: () => {
                    this.messageService.add({ severity: 'error', summary: 'ERREUR', detail: "L'oppération à échouée ! Veuillez réessayer 2", life: 3000 });
                    //showToast(handleHttpErrors(err, 'error', 'Impression correspondance', 'demandeCodeKey'), this.messageService);
                }
            });
    }

    edition(demandes: any) {
        this.editer(demandes[0], demandes[0]);}
}
