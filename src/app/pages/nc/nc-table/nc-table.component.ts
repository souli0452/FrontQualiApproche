import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { ConfirmationService, MenuItem, MessageService } from 'primeng/api';
import { Table } from 'primeng/table';
import { FeaturesService } from '../../../services/feature-service';
import { Location } from '@angular/common';
import { NonConformStatus } from '../../../enums';
import { showToast, StatusEnum, StatusEnumShow } from '../../../utils';
import { Subject, takeUntil } from 'rxjs';
import { NonConformiteService } from '../../../services/non-conformite/non-conformite.service';
import { GlobalSearchService } from '../../../services/non-conformite/global-search.service';

@Component({
    selector: 'app-nc-table',
    templateUrl: './nc-table.component.html',
    standalone:false
})
export class NcTableComponent implements OnInit {

    @Input() brouillonData: any[] = [];
    @Input() loading: boolean = false;
    @Input() status!: NonConformStatus;
    @Input() cols!: any[];
    @Input() balanceFrozen: boolean = false;
    @Input() colDetails!: any[];
    @Input() showColumnFilters: boolean = false; 
    @Output() publish = new EventEmitter<any>();
    @Output() delete = new EventEmitter<any>();
    @Output() archive = new EventEmitter<any>();
    menuItems: MenuItem[] = [];
    confirmKey = 'confirmKey';
    selectedActualities: any[] = [];

    @ViewChild('dt') table!: Table;
    private destroy$: Subject<boolean> = new Subject<boolean>();

    constructor(private router: Router, private messageService: MessageService,
                private actualityService: NonConformiteService,
                private featureService: FeaturesService,
                private confirmationService: ConfirmationService,
                private location: Location,
                private globalSearchService: GlobalSearchService
    ) {
    }

    ngOnInit(): void {
        // Écouter la barre de recherche globale
        this.globalSearchService.searchQuery$
            .pipe(takeUntil(this.destroy$))
            .subscribe(query => {
                if (this.table) {
                    this.table.filterGlobal(query, 'contains');
                }
            });

        this.menuItems = [
            {
                label: 'Publier', icon: 'pi pi-fw pi-ban',
                visible: this.status == NonConformStatus.PENDIND,
                command: () => this.onPublishMultiple()
            },
            {
                label: 'Archiver', icon: 'pi pi-fw pi-file',
                visible: this.status == NonConformStatus.PUBLISHED,
                command: () => this.onArchiveMultiple()
            },
            {label: 'Supprimer', icon: 'pi pi-fw pi-trash', command: () => this.onDeleteMultiple()}
        ];
    }

    goBack() {
        this.location.back();
    }

    onDeleteMultiple() {
        if (this.selectedActualities && this.selectedActualities.length > 0) {
            this.confirmationService.confirm({
                message: `Voulez-vous supprimer la sélection ? `,
                accept: () => {
                    this.actualityService.deleteMany(this.selectedActualities).subscribe({
                        next: (data) => {
                            this.featureService.onReloadRequested(true);
                            showToast(StatusEnum.success, data.status, 'Opération succès', this.messageService);
                            this.selectedActualities = [];
                        },
                        error: error => {
                            showToast(StatusEnum.error, error.status, 'Une erreur est survenue', this.messageService, error);
                        }
                    });
                }
            });
        }
    }

    onArchiveMultiple() {
        if (this.selectedActualities && this.selectedActualities.length > 0) {
            this.confirmationService.confirm({
                message: `Voulez-vous archiver la sélection ? `,
                accept: () => {
                    this.actualityService.updateManyStatus(this.selectedActualities, NonConformStatus.ARCHIVED).subscribe({
                        next: (data) => {
                            this.featureService.onReloadRequested(true);
                            showToast(StatusEnum.success, data.status, 'Opération succès', this.messageService);
                            this.selectedActualities = [];
                        },
                        error: error => {
                            showToast(StatusEnum.error, error.status, 'Une erreur est survenue', this.messageService, error);
                        }
                    });
                }
            });
        }
    }

    private onPublishMultiple() {
        if (this.selectedActualities && this.selectedActualities.length > 0) {
            this.confirmationService.confirm({
                message: `Voulez-vous publier la sélection ? `,
                accept: () => {
                    this.actualityService.updateManyStatus(this.selectedActualities, NonConformStatus.PUBLISHED).subscribe({
                        next: (data) => {
                            this.featureService.onReloadRequested(true);
                            showToast(StatusEnum.success, data.status, 'Opération succès', this.messageService);
                            this.selectedActualities = [];
                        },
                        error: error => {
                            showToast(StatusEnum.error, error.status, 'Une erreur est survenue', this.messageService, error);
                        }
                    });
                }
            });
        }
    }

    onArchive(event: Event, rowdata: any) {
        event.stopPropagation();
        this.confirmationService.confirm({
            target: event.target as EventTarget,
            message: `Voulez-vous archiver la non conformité N° ${rowdata.numeroReference} ? `,
            key: this.confirmKey,
            accept: () => {
                this.archive.emit(rowdata);
                event.stopPropagation();
            },
            reject:()=>{
            // this.goBack();
            }
        });
    }

    onDelete(event: Event, rowdata: any) {
        event.stopPropagation();
        this.confirmationService.confirm({
            target: event.target as EventTarget,
            message: `Voulez-vous supprimer la non conformité N° ${rowdata.numeroReference} ? `,
            key: this.confirmKey,
            accept: () => {
                this.delete.emit(rowdata);
                event.stopPropagation();
            },
            reject:()=>{
                // this.goBack();
            }
        });
    }

    onPublish(event: Event, rowdata: any) {
        event.stopPropagation();
        this.confirmationService.confirm({
            target: event.target as EventTarget,
            message: `Voulez-vous publier la non conformité N° ${rowdata.numeroReference} ? `,
            key: this.confirmKey,
            accept: () => {
                this.publish.emit(rowdata);
                event.stopPropagation();
            },
            reject:()=>{
                // this.goBack();
            }
        });
    }

    // 💡 Retourne le style de couleur adapté selon la gravité de la non-conformité
    getSeverity(gravity: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
        if (!gravity) return 'secondary';
        
        const val = gravity.toLowerCase().trim();
        if (val.includes('critique') || val.includes('danger')) {
            return 'danger';  // 🔴 Rouge pour Critique
        }
        if (val.includes('majeur') || val.includes('warn')) {
            return 'warn'; // 🟡 Orange pour Majeur
        }
        if (val.includes('mineur') || val.includes('info')) {
            return 'info';    // 🔵 Bleu pour Mineur
        }
        
        return 'secondary';   // 🔘 Gris par défaut
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

    editDialogVisible: boolean = false;
    selectedNcId: any = null;

    detailDialogVisible: boolean = false;
    selectedDetailId: any = null;


    onRowSelect(id: number) {
        this.selectedDetailId = id;
        this.detailDialogVisible = true;
    }
    update(nc: any) {
        this.router.navigate(['/non-conformite/declaration', nc.id]);
    }

    onGlobalFilter(table: Table, event: Event) {
        table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
    }

    ngOnDestroy(): void {
        this.destroy$.next(true);
        this.destroy$.complete();
    }

    protected readonly NonConformStatus = NonConformStatus;
}
