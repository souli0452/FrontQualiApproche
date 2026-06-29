import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { ConfirmationService, MenuItem, MessageService } from 'primeng/api';
import { Table } from 'primeng/table';

import { Location } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { NonConformStatus } from '../../../enums/enums';
import { FeaturesService } from '../../../services/feature-service';
import { showToast, StatusEnum } from '../../../utils/global/global-utils';


import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgPrimeModule } from '../../../../prime-ng.module';
import { FileUploadComponent } from '../file-upload/file-upload.component';
import { NonConformiteService } from '../../../services/non-conformite/non-conformite.service';
import { GlobalSearchService } from '../../../services/non-conformite/global-search.service';
import { convertFilesToBase64 } from '../../../utils/fichier/fichier-utils';

@Component({
    selector: 'app-traitement-action',
    templateUrl: './traitement-action-table.html',
    styleUrl: './traitement-action-table.scss',
    standalone: true,
    imports: [CommonModule, FormsModule, NgPrimeModule, FileUploadComponent]
})
export class TraitementActionTable implements OnInit {

    @Input() nonTraiterData!: any[];
    @Input() loading: boolean = false;
    @Input() status!: NonConformStatus;
    @Input() cols!: any[];
    @Input() colDetails!: any[];
    @Output() publish = new EventEmitter<any>();
    @Output() delete = new EventEmitter<any>();
    @Output() archive = new EventEmitter<any>();
    @Input() paginator: boolean = true;
    @Input() showGridlines: boolean = true;

    @Input() totalElements: number = 0;
    @Input() pageSize: number = 10;
    @Input() currentPage: number = 0;
    @Output() pageChangeEvent = new EventEmitter<{ page: number, size: number }>();


    menuItems: MenuItem[] = [];
    uploadedFiles: any[] = [];
    confirmKey = 'confirmKey';
    selectedNonConformite: any[] = [];
    planAction:any={};
    displayDialog:boolean=false;

    @ViewChild('dt') table!: Table;
    private destroy$: Subject<boolean> = new Subject<boolean>();

   constructor(
    private router: Router, 
    private messageService: MessageService,
    private nonConformiteService: NonConformiteService,
    private featureService: FeaturesService,
    private confirmationService: ConfirmationService,
    private location: Location,
    private globalSearchService: GlobalSearchService
    ) {}

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
                label: 'Soumettre', icon: 'pi pi-fw pi-ban',
                visible: this.status == NonConformStatus.NON_TRAITER,
                command: () => this.onPublishMultiple()
            },
        ];
    }

    goBack() {
        this.location.back();
    }

    onPageChange(event: any) {
        // PrimeNG renvoie : 
        // event.page : l'index de la page (0, 1, 2...)
        // event.rows : le nombre de lignes par page
        this.pageChangeEvent.emit({ 
            page: event.page, 
            size: event.rows 
        });
    }

    onDeleteMultiple() {
        if (this.selectedNonConformite && this.selectedNonConformite.length > 0) {
            this.confirmationService.confirm({
                message: `Voulez-vous supprimer la sélection 1? `,
                key: this.confirmKey,
                accept: () => {
                    this.nonConformiteService.deleteMany(this.selectedNonConformite).subscribe({
                        next: (data) => {
                            this.featureService.onReloadRequested(true);
                            showToast(StatusEnum.success, data.statusCode, 'Opération succès', this.messageService);
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
        if (this.selectedNonConformite && this.selectedNonConformite.length > 0) {
            this.confirmationService.confirm({
                message: `Voulez-vous archiver la sélection ? `,
                key: this.confirmKey,
                accept: () => {
                    this.nonConformiteService.updateManyStatus(this.selectedNonConformite, NonConformStatus.ARCHIVED).subscribe({
                        next: (data) => {
                            this.featureService.onReloadRequested(true);
                            showToast(StatusEnum.success, data.statusCode, 'Opération succès', this.messageService);
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
        if (this.selectedNonConformite && this.selectedNonConformite.length > 0) {
            this.confirmationService.confirm({
                message: `Voulez-vous publier la sélection ? `,
                key: this.confirmKey,
                accept: () => {
                    this.nonConformiteService.updateManyStatus(this.selectedNonConformite, NonConformStatus.PUBLISHED).subscribe({
                        next: (data) => {
                            this.featureService.onReloadRequested(true);
                            showToast(StatusEnum.success, data.statusCode, 'Opération succès', this.messageService);
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
        console.log( this.planAction);
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
        this.router.navigate(['/traitement-action/detail/', id]);
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
        if (this.uploadedFiles && this.uploadedFiles.length > 0) {
            try {
                const base64Files = await convertFilesToBase64(this.uploadedFiles);
                this.planAction.fichiers = base64Files.map(fileData => ({
                    fichier: fileData.fichierBase64,
                    nom: fileData.nomFichier,
                    type: fileData.typeFichier
                }));
            } catch (error) {
                this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Erreur lors de la conversion des fichiers.' });
                return;
            }
        } else {
            this.planAction.fichiers = [];
        }
    }

    getSeverity(gravity: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
        if (!gravity) return 'secondary';
        
        const val = gravity.toLowerCase().trim();
        if (val.includes('critique') || val.includes('danger')) {
            return 'danger';  // 🔴 Rouge
        }
        if (val.includes('majeur')) { // <-- Sans le 'e'
            return 'warn'; // 🟡 Orange
        }
        if (val.includes('mineur')) { // <-- Sans le 'e'
            return 'info';    // 🔵 Bleu
        }
        
        return 'secondary';
    }

    getFieldValue(row: any, field: string): any {
        if (!row) return null;
        
        // 1. Chercher directement à la racine (ex: niveauNonConformiteLibelle)
        if (row[field] !== undefined && row[field] !== null) return row[field];
        
        // 2. Si l'objet est une NonConformite qui contient un tableau planActions
        if (row.planActions && Array.isArray(row.planActions) && row.planActions.length > 0) {
            if (row.planActions[0][field] !== undefined && row.planActions[0][field] !== null) {
                return row.planActions[0][field];
            }
        }
        
        // 3. Fallbacks et mappings spécifiques
        if (field === 'procEmetteur') {
            return row.origineService || row.origineServiceLibelleCourt;
        }
        if (field === 'numeroNc') {
            return row.numeroReference || row.numeroNc;
        }
        
        return null;
    }

    isEcheanceProcheOuDepassee(dateStr: string): boolean {
        if (!dateStr) return false;
        
        // Supposons que le format soit DD-MM-YYYY ou YYYY-MM-DD
        let echeanceDate: Date;
        
        if (dateStr.includes('-')) {
            const parts = dateStr.split('-');
            if (parts.length === 3) {
                // Si l'année est en dernier (DD-MM-YYYY)
                if (parts[2].length === 4) {
                    echeanceDate = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
                } 
                // Si l'année est en premier (YYYY-MM-DD)
                else if (parts[0].length === 4) {
                    echeanceDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                } else {
                    echeanceDate = new Date(dateStr);
                }
            } else {
                echeanceDate = new Date(dateStr);
            }
        } else {
            echeanceDate = new Date(dateStr);
        }

        if (isNaN(echeanceDate.getTime())) return false;

        const now = new Date();
        // On remet "now" à 00:00:00 pour comparer des jours entiers si besoin, ou on garde l'heure exacte.
        // Ici, on garde l'heure exacte pour la règle stricte de 24h
        const diffMs = echeanceDate.getTime() - now.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        
        return diffHours <= 24;
    }

    getKeys(obj: any): string[] {
        if (!obj) return [];
        return Object.keys(obj);
    }

    ngOnDestroy(): void {
        this.destroy$.next(true);
        this.destroy$.complete();
    }

}
