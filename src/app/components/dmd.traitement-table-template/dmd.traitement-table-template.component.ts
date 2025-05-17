import { Component, ComponentRef, EventEmitter, Input, Output, ViewChild, ViewContainerRef } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { CommonModule, DatePipe } from '@angular/common';
import {FeaturesService} from "../../services/feature-service";
import {  TypeDemande} from "../../utils";
import { EtapeTraitement, StatusEnum } from '../../enums';
import { NgPrimeModule } from '../../../prime-ng.module';

@Component({
    selector: 'app-dmd-traitement-table-template',
    templateUrl: './dmd.traitement-table-template.component.html',
    styleUrl: './dmd.traitement-table-template.component.scss',
    providers: [DatePipe],
    standalone: true,
    imports:[
        CommonModule,
        NgPrimeModule,
    ]
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
    @Output() onRejet = new EventEmitter<any>();
    @Output() onEditResult = new EventEmitter<any>();
    @Output() onCloture = new EventEmitter<any>();

    @ViewChild('detailContainer', {read: ViewContainerRef, static: true}) detailContainer?: ViewContainerRef;

    protected readonly BtnActions = EtapeTraitement;

    imputationKey = 'imputationKey';
    cols: any[] = [];
    colsFilter: any[] = [];
    searchedAgent:any;
    selectedDemandes: Array<any> = [];
    display: boolean = false;
    agentSeachError: boolean = false;
    isAgentSeach: boolean = false;
    numerMatricule?: string;
    displayDetail = false;
    selectedDemande: any;
    componentRef: ComponentRef<any> | undefined;
    afficherBoutonEdit: boolean = true;

    constructor(private messageService: MessageService,
                private confirmationService: ConfirmationService,
                private featureService: FeaturesService, private datePipe: DatePipe) {
        this.cols = [
            {field: 'numero', header: 'Numero', type: 'string', filter: true, width: '10%', centered: false},
            {field: 'intitule', header: 'Libellé', type: 'string', filter: true, width: '30%', centered: false},
            {
                field: 'currentUserfullName',
                header: 'Nom & prénom',
                type: 'string',
                filter: true,
                width: '20%',
                centered: false
            },
            {field: 'status', header: 'Statut', type: 'enum', filter: true, width: '15%', centered: false},
            {field: 'createdAt', header: 'Date soumission', type: 'string', filter: true, width: '15%', centered: false}
        ];

        this.colsFilter = this.cols.map(value => value.field);
    }

    closeDetailsDialog() {
        this.detailContainer?.clear();
        this.displayDetail = false;
        this.selectedDemandes = [];
    }
    displayDetails(rowData?: any) {
        if (this.displayDetail) {
            this.closeDetailsDialog();
        } else {
            this.selectedDemande = rowData;
            this.displayDetail = true;
            let componentRef: any;
            if (this.btnActions === EtapeTraitement.TRAITEMENT) {
                componentRef = this.detailContainer?.createComponent(
                    this.featureService.getDynamicFormComponent(this.selectedDemande.typeDemande));
            } else {
                componentRef = this.detailContainer?.createComponent(
                    this.featureService.getDynamicDetailComponent(this.selectedDemande.typeDemande));
            }

            componentRef!.instance.demande = this.selectedDemande;
            this.componentRef = componentRef;
        }
    }

    onDisplay() {
        this.agentSeachError = false;
        if (this.display) {

            this.display = false;
            //  this.searchedAgent = undefined;
            this.numerMatricule = undefined;
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
        }

        return undefined;
    }

    doAction() {
        if (this.btnActions === EtapeTraitement.RECEPTION) {
            this.receptionner();
        } else {
            this.validate();
        }
    }

    protected validate() {
        this.confirmationService.confirm({
            message: 'Voulez-vous valider la sélection ?',
            key: this.imputationKey,
            accept: () => {
                if (this.selectedDemandes.length == 0) {
                    this.selectedDemande.rejeter = false;
                    this.selectedDemandes.push(this.selectedDemande);
                }
                this.selectedDemandes.map(item => {

                });
                this.onValidation.emit(this.selectedDemandes);
                this.selectedDemandes = [];
            }
        });
    }


    imputer() {
        this.confirmationService.confirm({
            message: 'Voulez-vous imputer la sélection ?',
            key: this.imputationKey,
            accept: () => {

                this.onImputation.emit(this.selectedDemandes);

            }
        });
    }

    rejet() {
        this.confirmationService.confirm({
            message: `Voulez-vous réjeter la demande n°: ${this.selectedDemande?.numero} ?`,
            key: this.imputationKey,
            accept: () => {
                this.onRejet.emit(this.selectedDemande);
            }
        });
    }

    editFinalResult() {
        this.onEditResult.emit(this.selectedDemande);
    }

    edition() {
        this.selectedDemande.edited = true;
        this.onEdition.emit(this.selectedDemande);
    }



    receptionner() {
        let message = `Voulez-vous soumettre la demande n°: ${this.selectedDemande?.numero} pour validation ?`;
        this.confirmationService.confirm({
            message: message,
            key: this.imputationKey,
            accept: () => {
                this.selectedDemandes.map(item => {
                    item.etapeTraitement=this.BtnActions.RECEPTION
                });
                this.onReceptionner.emit(this.selectedDemandes);
            }
        });
    }
    soumettre() {
        let message = `Voulez-vous soumettre la demande n°: ${this.selectedDemande?.numero} pour validation ?`;
        this.confirmationService.confirm({
            message: message,
            key: this.imputationKey,
            accept: () => {
                this.selectedDemandes.map(item => {
                    item.etapeTraitement=this.BtnActions.TRAITEMENT
                });
                this.onSubmission.emit(this.selectedDemandes);
            }
        });
    }


    saveEntity() {
        this.confirmationService.confirm({
            message: `Voulez-vous réceptionner  la demande n°: ${this.selectedDemande?.numero} ?`,
            key: this.imputationKey,
            accept: () => {
                this.selectedDemande.status=StatusEnum.IN_PROGRESS
                this.onSaveEntity.emit(this.selectedDemande);
            }
        });
    }

    cloture() {
        let message=""
        if(this.selectedDemandes.length>0){
            message = `Voulez-vous cloturer la sélection?`;
        }else {
            message = `Voulez-vous cloturer la demande n°: ${this.selectedDemande?.numero}  ?`;
        }

        this.confirmationService.confirm({
            message: message,
            key: this.imputationKey,
            accept: () => {
                if (this.selectedDemande!=null){
                    this.selectedDemandes.push(this.selectedDemande);
                }
                this.selectedDemandes.map(item => {
                    item.etapeTraitement=this.BtnActions.CLOTURE
                    item.status=StatusEnum.APPROVED
                });
                this.onCloture.emit(this.selectedDemandes);
            }
        });
    }
    protected readonly TypeDemande = TypeDemande;
}
