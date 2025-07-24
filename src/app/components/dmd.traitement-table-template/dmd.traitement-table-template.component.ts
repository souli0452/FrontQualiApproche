import { Component, ComponentRef, EventEmitter, Input, Output, ViewChild, ViewContainerRef } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { CommonModule, DatePipe } from '@angular/common';
import {FeaturesService} from "../../services/feature-service";
import {  TypeDemande} from "../../utils";
import { EtapeTraitement, StatusEnum } from '../../enums';
import { NgPrimeModule } from '../../../prime-ng.module';
import { BadgeModule } from 'primeng/badge';
import { SearchAgentComponent } from '../search-agent-component/search-agent.component';

@Component({
    selector: 'app-dmd-traitement-table-template',
    templateUrl: './dmd.traitement-table-template.component.html',
    styleUrl: './dmd.traitement-table-template.component.scss',
    providers: [DatePipe],
    standalone: true,
    imports: [CommonModule, NgPrimeModule, SearchAgentComponent]
})
export class DmdTraitementTableTemplateComponent {
    @Input() demandeList: Array<any> = [];
    @Input() btnActions?: EtapeTraitement = EtapeTraitement.RECEPTION;
    @Input() title?: string;
    @Output() onImputation = new EventEmitter<any>();
    @Output() onValidation = new EventEmitter<any>();
    @Output() onStructureValidation = new EventEmitter<any>();
    @Output() onEdition = new EventEmitter<any>();
    @Output() onSignature = new EventEmitter<any>();
    @Output() onSaveEntity = new EventEmitter<any>();
    @Output() onSubmission = new EventEmitter<any>();
    @Output() onReceptionner = new EventEmitter<any>();
    @Output() onValidationRS = new EventEmitter<any>();
    @Output() onRejet = new EventEmitter<any>();
    @Output() onEditResult = new EventEmitter<any>();
    @Output() onCloture = new EventEmitter<any>();

    @ViewChild('detailContainer', { read: ViewContainerRef, static: true }) detailContainer?: ViewContainerRef;

    protected readonly BtnActions = EtapeTraitement;

    imputationKey = 'imputationKey';
    @Input() cols: any[] = [];
    colsFilter: any[] = [];
    searchedAgent: any;
    selectedDemandes: Array<any> = [];
    display: boolean = false;
    agentSeachError: boolean = false;
    isAgentSeach: boolean = false;
    numerMatricule?: string;
    displayDetail = false;
    selectedDemande: any;
    componentRef: ComponentRef<any> | undefined;
    hasNonTraiter: boolean = true;
    totalActions:number = 0;
    nombreTraites:number = 0;
    constructor(
        private messageService: MessageService,
        private confirmationService: ConfirmationService,
        private featureService: FeaturesService,
        private datePipe: DatePipe
    ) {


        this.colsFilter = this.cols.map((value) => value.field);
    }



    closeDetailsDialog() {
        this.displayDetail = false;
        this.detailContainer?.clear();

        this.selectedDemandes = [];
    }
    displayDetails(rowData?: any) {
        if (this.displayDetail) {
            this.closeDetailsDialog();
        } else {
            this.selectedDemande = rowData;
            this.totalActions = this.selectedDemande.planActions.length;
            this.hasNonTraiter = this.selectedDemande.planActions.some((action: { status: string }) => action.status === 'NON_TRAITER');

            this.nombreTraites = this.selectedDemande.planActions.filter((action: { status: string }) => action.status === 'TRAITER').length;

            this.displayDetail = true;
            let componentRef: any;
            if (this.btnActions !== EtapeTraitement.CLOTURE&&this.btnActions !== EtapeTraitement.IMPUTATION) {
                componentRef = this.detailContainer?.createComponent(this.featureService.getDynamicFormComponent(this.selectedDemande.typeDemande));
            } else {
                componentRef = this.detailContainer?.createComponent(this.featureService.getDynamicDetailComponent(this.selectedDemande.typeDemande));
            }

            componentRef!.instance.demande = this.selectedDemande;
            this.componentRef = componentRef;
        }
    }

    onDisplay() {
        if (this.display) {

            this.display = false;
            this.searchedAgent = undefined;
        } else {
            this.display = true;
        }
    }

    rechercher() {
        this.isAgentSeach = true;
        this.agentSeachError = false;
        if (this.numerMatricule) {
        }
    }

    get btnObject() {
        if (this.btnActions === EtapeTraitement.TRAITEMENT||this.btnActions == EtapeTraitement.CLOTURE||this.btnActions == EtapeTraitement.SUIVI_RQ|| this.btnActions === EtapeTraitement.VALIDATION_RS) {
            return  null;
        }
        if (this.btnActions === EtapeTraitement.VALIDATION) {
            return {
                label: 'Valider',
                icon: 'pi pi-check',
                tooltip: 'Valider la sélection'
            };
        } else if (this.btnActions === EtapeTraitement.RECEPTION) {
            return {
                label: 'Réception',
                icon: 'pi pi-telegram',
                tooltip: 'Imputer la sélection à un agent'
            };
        }else
            return {
                label: 'Imputer',
                icon: 'pi pi-telegram',
                tooltip: 'Imputer la sélection à un agent'
            };



    }

    doAction() {
        if (this.btnActions === EtapeTraitement.RECEPTION) {
            this.receptionner();
        } else if (this.btnActions === EtapeTraitement.VALIDATION || this.btnActions === EtapeTraitement.VALIDATION_RS) {
            this.validate();
        }else {
            this.onDisplay();
        }
    }

    protected validate() {
        this.confirmationService.confirm({
            message: 'Voulez-vous valider la sélection ?',
            key: this.imputationKey,
            accept: () => {
                if (this.btnActions==EtapeTraitement.VALIDATION) {
                    if (this.selectedDemandes.length > 0) {
                        this.selectedDemandes.map((item) => {
                            item.etatTraitement = this.BtnActions.SUIVI_RQ;
                        });
                    } else {
                        this.selectedDemande.etatTraitement = this.BtnActions.SUIVI_RQ;

                        this.selectedDemandes.push(this.selectedDemande);
                    }

                    this.onValidation.emit(this.selectedDemandes);
                }else {
                    if (this.selectedDemandes.length > 0) {
                        this.selectedDemandes.map((item) => {
                            item.etatTraitement = this.BtnActions.IMPUTATION;
                        });
                    } else {
                        this.selectedDemande.etatTraitement = this.BtnActions.IMPUTATION;

                        this.selectedDemandes.push(this.selectedDemande);}
                }
            }
        });
    }

    rejet() {
        this.confirmationService.confirm({
            message: `Voulez-vous réjeter la demande n°: ${this.selectedDemande?.numeroReference} ?`,
            key: this.imputationKey,
            accept: () => {
                this.onRejet.emit(this.selectedDemande);
            }
        });
    }
    imputer() {
        this.confirmationService.confirm({
            message: 'Voulez-vous imputer la sélection ?',
            key: this.imputationKey,
            accept: () => {
                if (this.selectedDemandes.length == 0) {
                    this.selectedDemandes.push(this.selectedDemande);
                }
                this.selectedDemandes.map((item) => {
                    item.status=StatusEnum.IN_PROGRESS
                    item.userImputId = this.searchedAgent?.id;
                    item.userImputeEmail=this.searchedAgent?.email;
                    item.userImputFullName = this.searchedAgent.lastName + ' ' + this.searchedAgent.firstName;
                    item.etatTraitement = EtapeTraitement.TRAITEMENT;
                });

                this.onImputation.emit(this.selectedDemandes);
                this.onDisplay();
            }
        });
    }

    receptionner() {
        let message = `Voulez-vous réceptionner la demande n°: ${this.selectedDemande?.numeroReference} pour validation ?`;
        this.confirmationService.confirm({
            message: message,
            key: this.imputationKey,
            accept: () => {
                if (this.selectedDemandes.length > 0) {
                    this.selectedDemandes.map((item) => {
                        item.status=StatusEnum.IN_PROGRESS;
                        item.etatTraitement = this.BtnActions.VALIDATION_RS;
                    });
                } else {
                    this.selectedDemande.etatTraitement = this.BtnActions.VALIDATION_RS;
                    this.selectedDemande.status=StatusEnum.IN_PROGRESS;
                    this.selectedDemandes.push(this.selectedDemande);
                }

                this.onReceptionner.emit(this.selectedDemandes);
            }
        });
    }
    validationRS() {
        let message = `Voulez-vous valider la demande n°: ${this.selectedDemande?.numeroReference} pour validation ?`;
        this.confirmationService.confirm({
            message: message,
            key: this.imputationKey,
            accept: () => {
                if (this.selectedDemandes.length > 0) {
                    this.selectedDemandes.map((item) => {
                        item.etatTraitement = this.BtnActions.IMPUTATION;
                    });
                } else {
                    this.selectedDemande.etatTraitement = this.BtnActions.IMPUTATION;

                    this.selectedDemandes.push(this.selectedDemande);
                }

                this.onValidationRS.emit(this.selectedDemandes);
            }
        });
    }
    soumettre() {
        let message = `Voulez-vous soumettre la demande n°: ${this.selectedDemande?.numeroReference} pour validation ?`;
        this.confirmationService.confirm({
            message: message,
            key: this.imputationKey,
            accept: () => {
                if (this.selectedDemandes.length > 0) {
                    this.selectedDemandes.map((item) => {
                        item.etatTraitement = this.BtnActions.VALIDATION;
                    });
                } else {
                    this.selectedDemande.etatTraitement = this.BtnActions.VALIDATION;

                    this.selectedDemandes.push(this.selectedDemande);
                }
                this.onSubmission.emit(this.selectedDemandes);
            }
        });
    }

    saveEntity() {
        this.confirmationService.confirm({
            message: `Voulez-vous réceptionner  la demande n°: ${this.selectedDemande?.numeroReference} ?`,
            key: this.imputationKey,
            accept: () => {
                if (this.selectedDemandes.length > 0) {
                    this.selectedDemandes.map((item) => {
                        item.status = StatusEnum.IN_PROGRESS;
                    });
                } else {
                    this.selectedDemande.status = StatusEnum.IN_PROGRESS;

                    this.selectedDemandes.push(this.selectedDemande);
                }
                console.log(this.selectedDemandes);
                this.onSaveEntity.emit(this.selectedDemandes);
            }
        });
    }

    cloture() {
        let message = '';
        if (this.selectedDemandes.length > 0) {
            message = `Voulez-vous cloturer la sélection?`;
        } else {
            message = `Voulez-vous cloturer la demande n°: ${this.selectedDemande?.numeroReference}  ?`;
        }

        this.confirmationService.confirm({
            message: message,
            key: this.imputationKey,
            accept: () => {
                if (this.selectedDemande != null) {
                    this.selectedDemande.etatTraitement = this.BtnActions.CLOTURE;
                    this.selectedDemandes.push(this.selectedDemande);
                }
                this.selectedDemandes.map((item) => {
                    item.etapeTraitement = this.BtnActions.CLOTURE;
                    item.status = StatusEnum.APPROVED;
                });
                this.onCloture.emit(this.selectedDemandes);
            }
        });
    }
    editionNew() {
        this.selectedDemandes.push(this.selectedDemande);
        this.onEdition.emit(this.selectedDemandes);
    }

    validation() {
        let message = `Voulez-vous valider la demande n°: ${this.selectedDemande?.numeroReference} pour validation ?`;
        this.confirmationService.confirm({
            message: message,
            key: this.imputationKey,
            accept: () => {
                if (this.selectedDemandes.length > 0) {
                    this.selectedDemandes.map((item) => {
                        item.etatTraitement = this.BtnActions.SUIVI_RQ;
                    });
                } else {
                    this.selectedDemande.etatTraitement = this.BtnActions.SUIVI_RQ;

                    this.selectedDemandes.push(this.selectedDemande);
                }

                this.onValidation.emit(this.selectedDemandes);
            }
        });
    }

    protected readonly TypeDemande = TypeDemande;
}
