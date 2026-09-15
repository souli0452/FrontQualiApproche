import { Component, EventEmitter, Input, OnInit, Output, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgPrimeModule } from '@prime-ng';
import { SelectInputComponent } from '@shared/ui/select-input/select-input.component';
import { TableauAffichageComponent } from '@shared/tableau-affichage/tableau-affichage';
import { TableColumn } from '../../../../../models/generique.model';
import { DocumentQms } from '@features/gestion-documentaire/models/document.model';
import { OptionsLoader } from '@shared/ui/lazy-options.model';
import { DomaineApplication, NiveauConfidentialite, PrioriteDocument, QmsDocumentType } from '@features/gestion-documentaire/models/referentiel.model';
import { MenuItem } from 'primeng/api';

/**
 * Liste des documents : recherche, filtres et tableau universel.
 */
@Component({
    selector: 'app-qms-document-list',
    standalone: true,
    imports: [CommonModule, FormsModule, NgPrimeModule, SelectInputComponent, TableauAffichageComponent],
    templateUrl: './qms-document-list.component.html'
})
export class QmsDocumentListComponent implements OnInit {
    @Input() documents: DocumentQms[] = [];
    @Input() loading = false;

    @Input() totalDocuments = 0;
    @Input() premiereLigne = 0;
    @Input() taillePage = 10;
    @Output() pageChange = new EventEmitter<{ first: number; rows: number }>();

    @Input() chargerTypes?: OptionsLoader<QmsDocumentType>;
    @Input() chargerStructures?: OptionsLoader<any>;
    @Input() chargerPriorites?: OptionsLoader<PrioriteDocument>;
    @Input() chargerNiveauxConfidentialite?: OptionsLoader<NiveauConfidentialite>;
    @Input() chargerDomaines?: OptionsLoader<DomaineApplication>;

    @Input() peutFiltrerParProcessusEmetteur = false;

    @Input() searchQuery = '';
    @Input() selectedType = '';
    @Input() selectedService = '';
    @Input() selectedPriorite = '';
    @Input() selectedNiveauConfidentialite = '';
    @Input() selectedDomaine = '';

    @Output() searchQueryChange = new EventEmitter<string>();
    @Output() selectedTypeChange = new EventEmitter<string>();
    @Output() selectedServiceChange = new EventEmitter<string>();
    @Output() selectedPrioriteChange = new EventEmitter<string>();
    @Output() selectedNiveauConfidentialiteChange = new EventEmitter<string>();
    @Output() selectedDomaineChange = new EventEmitter<string>();

    @Output() refresh = new EventEmitter<void>();
    @Output() open = new EventEmitter<DocumentQms>();
    @Output() apercu = new EventEmitter<DocumentQms>();
    @Output() modifier = new EventEmitter<DocumentQms>();
    @Output() telecharger = new EventEmitter<DocumentQms>();

    @Input() statusLabel: (doc: DocumentQms) => string = () => '';
    @Input() statusSeverity: (doc: DocumentQms) => string = () => 'info';

    @Input() etapeDeCircuit: (doc: DocumentQms) => string | undefined = () => undefined;
    @Input() aUneDecisionAttendue: (doc: DocumentQms) => boolean = () => false;
    @Input() circuitTermine: (doc: DocumentQms) => boolean = () => false;

    @ViewChild('versionTpl', { static: true }) versionTpl!: TemplateRef<any>;
    @ViewChild('statusTpl', { static: true }) statusTpl!: TemplateRef<any>;

    cellTemplates: { [field: string]: TemplateRef<any> } = {};

    tableCols: TableColumn[] = [
        {
            field: 'titre',
            header: 'Document',
            type: 'file',
            fileNameField: 'currentObjectName',
            subField: 'documentNumber',
            width: '32%'
        },
        {
            field: 'redacteur',
            header: 'Rédacteur',
            type: 'string',
            width: '18%'
        },
        {
            field: 'numeroVersion',
            header: 'Version',
            type: 'custom',
            align: 'center',
            width: '10%'
        },
        {
            field: 'status',
            header: 'État',
            type: 'custom',
            width: '24%'
        },
        {
            field: 'createdAt',
            header: 'Créé le',
            type: 'date',
            dateFormat: 'dd/MM/yyyy',
            width: '16%'
        }
    ];

    ngOnInit(): void {
        this.cellTemplates = {
            'numeroVersion': this.versionTpl,
            'status': this.statusTpl
        };
    }

    onPageChange(event: { page: number; size: number }): void {
        this.pageChange.emit({
            first: event.page * event.size,
            rows: event.size
        });
    }

    getActionMenuItems = (doc: DocumentQms): MenuItem[] => {
        const items: MenuItem[] = [
            {
                label: 'Consulter la fiche',
                icon: 'pi pi-eye',
                command: () => this.open.emit(doc)
            }
        ];

        if (this.isVisualisable(doc.currentObjectName || doc.titre)) {
            items.push({
                label: 'Aperçu du document',
                icon: 'pi pi-search',
                command: () => this.apercu.emit(doc)
            });
        }

        items.push({
            label: 'Demander une modification',
            icon: 'pi pi-pencil',
            command: () => this.modifier.emit(doc)
        });

        items.push({
            label: 'Télécharger le document',
            icon: 'pi pi-download',
            command: () => this.telecharger.emit(doc)
        });

        return items;
    };

    isVisualisable(nomFichier?: string): boolean {
        if (!nomFichier) return false;
        const lower = nomFichier.toLowerCase().trim();
        return lower.endsWith('.pdf') ||
               lower.endsWith('.png') ||
               lower.endsWith('.jpg') ||
               lower.endsWith('.jpeg') ||
               lower.endsWith('.webp') ||
               lower.endsWith('.svg') ||
               lower.endsWith('.gif');
    }

    hasActiveFilters(): boolean {
        return !!(this.selectedType || this.selectedService || this.selectedPriorite || this.selectedNiveauConfidentialite || this.selectedDomaine);
    }

    reinitialiserFiltres(): void {
        this.selectedType = '';
        this.selectedTypeChange.emit('');
        this.selectedService = '';
        this.selectedServiceChange.emit('');
        this.selectedPriorite = '';
        this.selectedPrioriteChange.emit('');
        this.selectedNiveauConfidentialite = '';
        this.selectedNiveauConfidentialiteChange.emit('');
        this.selectedDomaine = '';
        this.selectedDomaineChange.emit('');
        this.searchQuery = '';
        this.searchQueryChange.emit('');
        this.refresh.emit();
    }
}
