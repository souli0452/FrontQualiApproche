import { Component, OnDestroy, OnInit, ViewChild, TemplateRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil, forkJoin, of, switchMap, map, catchError } from 'rxjs';
import { NgPrimeModule } from '@prime-ng';
import { showToast, StatusEnum } from '../../../../utils/global/global-utils';
import { MessageService, MenuItem } from 'primeng/api';
import { SharedDocumentDto } from '@features/gestion-documentaire/models/document.model';
import { QmsDocumentService } from '@features/gestion-documentaire/services/document.service';
import { TableauAffichageComponent } from '../../../../shared/tableau-affichage/tableau-affichage';
import { TableColumn } from '../../../../models/generique.model';
import { LightboxComponent } from '../../../non-conformite/components/lightbox/lightbox';

@Component({
    selector: 'app-qms-documents-partages',
    standalone: true,
    imports: [CommonModule, NgPrimeModule, TableauAffichageComponent, LightboxComponent],
    providers: [MessageService],
    templateUrl: './qms-documents-partages.component.html',
    styleUrl: './qms-documents-partages.component.scss'
})
export class QmsDocumentsPartagesComponent implements OnInit, AfterViewInit, OnDestroy {
    @ViewChild('lightbox') lightbox?: LightboxComponent;
    @ViewChild('versionTemplate', { static: true }) versionTemplate!: TemplateRef<any>;
    @ViewChild('structureTemplate', { static: true }) structureTemplate!: TemplateRef<any>;
    @ViewChild('partageTemplate', { static: true }) partageTemplate!: TemplateRef<any>;

    loading: boolean = true;
    sharedDocuments: (SharedDocumentDto & { nomFichier?: string; currentObjectName?: string })[] = [];
    pageSize: number = 10;
    currentPage: number = 0;

    tableCols: TableColumn[] = [
        { field: 'titre', header: 'Document', type: 'file', subField: 'documentNumber', fileNameField: 'nomFichier' },
        { field: 'versionLabel', header: 'Version', type: 'string', align: 'center', width: '6.5rem' },
        { field: 'serviceLibelle', header: 'Structure émettrice', type: 'string' },
        { field: 'redacteur', header: 'Rédacteur', type: 'string' },
        { field: 'partageInfo', header: 'Partagé', type: 'string', width: '13rem' }
    ];

    filterFields: string[] = ['titre', 'documentNumber', 'serviceSigle', 'serviceLibelle', 'redacteur', 'partagePar'];
    cellTemplates: { [field: string]: TemplateRef<any> } = {};

    private destroy$ = new Subject<void>();

    constructor(
        private qmsService: QmsDocumentService,
        private messageService: MessageService
    ) {}

    ngOnInit(): void {
        this.loadSharedDocuments();
    }

    ngAfterViewInit(): void {
        this.cellTemplates = {
            versionLabel: this.versionTemplate,
            serviceLibelle: this.structureTemplate,
            partageInfo: this.partageTemplate
        };
    }

    /**
     * Charge les documents partagés et résout les métadonnées de fichier réelles (extension, nom de fichier)
     * pour garantir un affichage exact des icônes (Word vs PDF) et conditionner l'aperçu.
     */
    loadSharedDocuments(): void {
        this.loading = true;
        this.qmsService.getMySharedDocuments()
            .pipe(
                takeUntil(this.destroy$),
                switchMap((docs) => {
                    const sharedList = docs || [];
                    if (sharedList.length === 0) {
                        return of([]);
                    }
                    const enrichObservables = sharedList.map((doc) =>
                        this.qmsService.getDocumentById(doc.documentId).pipe(
                            map((fullDoc) => ({
                                ...doc,
                                currentObjectName: fullDoc?.currentObjectName,
                                nomFichier: fullDoc?.currentObjectName || (doc.documentNumber ? `${doc.documentNumber}` : '')
                            })),
                            catchError(() => of({
                                ...doc,
                                nomFichier: (doc as any).nomFichier || doc.documentNumber || ''
                            }))
                        )
                    );
                    return forkJoin(enrichObservables);
                })
            )
            .subscribe({
                next: (enrichedDocs) => {
                    this.sharedDocuments = enrichedDocs;
                    this.loading = false;
                },
                error: (err: any) => {
                    this.loading = false;
                    showToast(StatusEnum.error, err.status, 'Erreur de chargement des documents partagés', this.messageService, err);
                }
            });
    }

    isVisualisable(nomFichier?: string): boolean {
        if (!nomFichier) return false;
        const lower = nomFichier.toLowerCase().trim();
        return lower.endsWith('.pdf') ||
               lower.endsWith('.png') ||
               lower.endsWith('.jpg') ||
               lower.endsWith('.jpeg') ||
               lower.endsWith('.webp');
    }

    ouvrirApercu(shared: SharedDocumentDto): void {
        this.messageService.add({
            severity: 'info',
            summary: 'Visualisation',
            detail: "Chargement de l'aperçu..."
        });

        this.qmsService.exportSecuredPdf(shared.documentId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (blob: Blob) => {
                    const nomFichier = `${shared.documentNumber || 'document'}.pdf`;
                    this.lightbox?.openBlob(blob, nomFichier, shared.titre || shared.documentNumber);
                },
                error: (err: any) => {
                    showToast(StatusEnum.error, err.status,
                        "Aperçu indisponible", this.messageService, err);
                }
            });
    }

    telecharger(shared: SharedDocumentDto): void {
        this.qmsService.exportSecuredPdf(shared.documentId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (blob) => {
                    const url = URL.createObjectURL(blob);
                    const lien = document.createElement('a');
                    lien.href = url;
                    lien.download = `${shared.documentNumber || 'document'}.pdf`;
                    lien.click();
                    URL.revokeObjectURL(url);
                },
                error: (err: any) => {
                    showToast(StatusEnum.error, err.status,
                        'Téléchargement impossible', this.messageService, err);
                }
            });
    }

    getActionMenuItems = (row: SharedDocumentDto & { nomFichier?: string }): MenuItem[] => {
        const items: MenuItem[] = [];

        // L'aperçu ne s'affiche QUE pour les documents visualisables (PDF, images)
        if (this.isVisualisable(row.nomFichier)) {
            items.push({
                label: 'Aperçu du document',
                icon: 'pi pi-eye',
                command: () => this.ouvrirApercu(row)
            });
        }

        items.push({
            label: 'Télécharger le document',
            icon: 'pi pi-download',
            command: () => this.telecharger(row)
        });

        return items;
    };

    onRowClick(row: SharedDocumentDto & { nomFichier?: string }): void {
        if (this.isVisualisable(row.nomFichier)) {
            this.ouvrirApercu(row);
        } else {
            this.telecharger(row);
        }
    }

    onPageChange(event: { page: number; size: number }): void {
        this.currentPage = event.page;
        this.pageSize = event.size;
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }
}
