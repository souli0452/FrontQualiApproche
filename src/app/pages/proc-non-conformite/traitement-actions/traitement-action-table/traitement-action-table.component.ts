import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Router } from '@angular/router';
import { ConfirmationService, MenuItem, MessageService } from 'primeng/api';
import { Table } from 'primeng/table';

import { Location } from '@angular/common';
import { NonConformStatus } from '../../../../enums';
import { FeaturesService } from '../../../../services/feature-service';
import { NonConformiteService } from '../../../../services/non-conformite.service';
import { convertFilesToBase64, showToast, StatusEnum } from '../../../../utils';
import { ProcNonConformiteService } from '../../proc-non-conformite.service';


@Component({
    selector: 'app-traitement-action-table',
    templateUrl: './traitement-action-table.component.html',
    standalone:false
})
export class TraitementActionTableComponent implements OnInit {

    @Input() actualities!: any[];
    @Input() status!: NonConformStatus;
    @Input() cols!: any[];
    @Input() colDetails!: any[];
    @Output() publish = new EventEmitter<any>();
    @Output() delete = new EventEmitter<any>();
    @Output() archive = new EventEmitter<any>();
    menuItems: MenuItem[] = [];
    uploadedFiles: any[] = [];
    confirmKey = 'confirmKey';
    selectedActualities: any[] = [];
    planAction:any={};
    displayDialog:boolean=false;
    constructor(private router: Router, private messageService: MessageService,
                private actualityService: NonConformiteService,
                private featureService: FeaturesService,
                private nonConformiteService: ProcNonConformiteService,
                private confirmationService: ConfirmationService,
                private location: Location
    ) {
    }

    ngOnInit(): void {
        this.menuItems = [
            {
                label: 'Soumettre', icon: 'pi pi-fw pi-ban',
                visible: this.status == NonConformStatus.NON_TRAITER,
                command: () => this.onPublishMultiple()
            },
        ];
    }

    goBack() {
        this.location.back();
    }

    onDeleteMultiple() {
        if (this.selectedActualities && this.selectedActualities.length > 0) {
            this.confirmationService.confirm({
                message: `Voulez-vous supprimer la sélection ? `,
                key: this.confirmKey,
                accept: () => {
                    this.actualityService.deleteMany(this.selectedActualities).subscribe({
                        next: (data) => {
                            this.featureService.onReloadRequested(true);
                            showToast(StatusEnum.success, data.status, 'Opération succès', this.messageService);
                            this.goBack();
                        },
                        error: error => {
                            showToast(StatusEnum.error, error.status, 'Une erreur est survenue', this.messageService, error);
                        }
                    });
                },
                reject: () => {
                    this.goBack();
                }
            });
        }
    }

    onArchiveMultiple() {
        if (this.selectedActualities && this.selectedActualities.length > 0) {
            this.confirmationService.confirm({
                message: `Voulez-vous archiver la sélection ? `,
                key: this.confirmKey,
                accept: () => {
                    this.actualityService.updateManyStatus(this.selectedActualities, NonConformStatus.ARCHIVED).subscribe({
                        next: (data) => {
                            this.featureService.onReloadRequested(true);
                            showToast(StatusEnum.success, data.status, 'Opération succès', this.messageService);
                            this.goBack();
                        },
                        error: error => {
                            showToast(StatusEnum.error, error.status, 'Une erreur est survenue', this.messageService, error);
                        }
                    });

                },
                reject: () => {
                    this.goBack();
                }
            });
        }
    }

    private onPublishMultiple() {
        if (this.selectedActualities && this.selectedActualities.length > 0) {
            this.confirmationService.confirm({
                message: `Voulez-vous publier la sélection ? `,
                key: this.confirmKey,
                accept: () => {
                    this.actualityService.updateManyStatus(this.selectedActualities, NonConformStatus.PUBLISHED).subscribe({
                        next: (data) => {
                            this.featureService.onReloadRequested(true);
                            showToast(StatusEnum.success, data.status, 'Opération succès', this.messageService);
                            this.goBack();
                        },
                        error: error => {
                            showToast(StatusEnum.error, error.status, 'Une erreur est survenue', this.messageService, error);
                        }
                    });
                },
                reject: () => {
                    this.goBack();
                }
            });
        }
    }

    onArchive(event: Event, rowdata: any) {
        event.stopPropagation();
        this.confirmationService.confirm({
            message: `Voulez-vous archiver la non conformité N° ${rowdata.numeroReference} ? `,
            key: this.confirmKey,
            accept: () => {
                this.archive.emit(rowdata);
                event.stopPropagation();
            },
            reject:()=>{
                this.goBack();

            }
        });
    }

    onDelete(event: Event, rowdata: any) {
        event.stopPropagation();
        this.confirmationService.confirm({
            message: `Voulez-vous supprimer la non conformité N° ${rowdata.numeroReference} ? `,
            key: this.confirmKey,
            accept: () => {
                this.delete.emit(rowdata);
                event.stopPropagation();
            },
            reject:()=>{
                this.goBack();
            }
        });
    }

    onPublish(event: Event, rowdata: any) {
        event.stopPropagation();
        this.planAction=rowdata;
        this.displayDialog=true;

    }

    toggleOptions(event: Event, opt: HTMLElement, date: HTMLElement) {
        if (event.type === 'mouseenter') {
            opt.style.display = 'flex';
            date.style.display = 'none';
        } else {
            opt.style.display = 'none';
            date.style.display = 'flex';
        }

    }

    onRowSelect(id: number) {

    }


    onGlobalFilter(table: Table, event: Event) {
        table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
    }


    protected readonly NonConformStatus = NonConformStatus;

    soumettre(event:any) {
        event.stopPropagation();
        this.confirmationService.confirm({
            message: `Voulez-vous soummettre le plan d'action N° ${this.planAction.numeroOdre} ? `,
            key: this.confirmKey,
            accept: () => {

                this.publish.emit(this.planAction);
                event.stopPropagation();
            },
            reject:()=>{
                this.goBack();
            }
        });
    }
    async handleFileUpload(files: any[]) {
        this.uploadedFiles = files;
        this.planAction.fichiers = await convertFilesToBase64(this.uploadedFiles);


    }
}
