import { CommonModule } from '@angular/common';
import {
    Component,
    EventEmitter,
    Input,
    Output,
    ViewChild,
    AfterViewInit,
    OnDestroy,
    TemplateRef
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MenuItem } from 'primeng/api';
import { Table } from 'primeng/table';
import { TableColumn } from '../../models/generique.model';
import { NgPrimeModule } from '../../../prime-ng.module';
import { GlobalSearchService } from '../recherche-globale/global-search.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { formatDateTodd } from '../../utils/formatage/formatage-utils';

@Component({
    selector: 'app-tableau-affichage',
    standalone: true,
    imports: [CommonModule, FormsModule, NgPrimeModule],
    templateUrl: './tableau-affichage.html',
    styleUrl: './tableau-affichage.scss'
})
export class TableauAffichageComponent implements AfterViewInit, OnDestroy {
    @Input() tableCols: TableColumn[] = [];
    @Input() listeObject: any[] = [];
    @Input() loading: boolean = false;
    @Input() consultation: boolean = false;
    @Input() isPagination: boolean = true;
    @Input() totalElements: number = 0;
    @Input() pageSize: number = 10;
    @Input() currentPage: number = 0;
    @Input() loadingRows: number = 10;
    @Input() minWidth: string = '50rem';
    @Input() filterFields: string[] = [];
    @Input() actionMenuItems: MenuItem[] = [];

    // Nouveautés pour le composant universel
    @Input() title?: string;
    @Input() titleIcon?: string;
    @Input() titleIconClass: string = 'text-primary';
    @Input() subtitle?: string;
    @Input() badgeCount?: number | string;
    @Input() hasFilters: boolean = false;
    @Input() lazy: boolean = false;
    @Input() clickableRows: boolean = false;
    @Input() customRowClass?: (rowData: any) => string;
    @Input() cellTemplates: { [field: string]: TemplateRef<any> } = {};
    @Input() getActionMenuItems?: (rowData: any) => MenuItem[];
    @Input() rowsPerPageOptions: number[] = [5, 10, 20, 50];

    // Options de customisation de la barre supérieure
    @Input() showTopBar: boolean = true;
    @Input() showSearch: boolean = true;
    @Input() searchPosition: 'left' | 'right' = 'right';
    @Input() placeholderRecherche: string = 'Rechercher...';
    @Input() showAddButton: boolean = false;
    @Input() addButtonLabel: string = 'Ajouter';
    @Input() recordName: string = 'éléments';

    @Output() pageChangeEvent = new EventEmitter<{ page: number; size: number }>();
    @Output() lazyLoad = new EventEmitter<any>();
    @Output() actionClick = new EventEmitter<{ event: any; menu: any; rowData: any }>();
    @Output() addClick = new EventEmitter<void>();
    /**
     * Des cases à cocher pour agir sur plusieurs lignes à la fois.
     *
     * <p>Fermée par défaut : les écrans qui ne la réclament pas gardent exactement la table
     * qu'ils avaient, sans colonne supplémentaire ni changement de comportement.</p>
     */
    @Input() selectionMultiple: boolean = false;

    /** Les lignes cochées. Vidées par l'écran porteur après chaque action de lot. */
    @Input() lignesSelectionnees: any[] = [];
    @Output() selectionChange = new EventEmitter<any[]>();

    @Output() rowClick = new EventEmitter<any>();
    @Output() searchValueChange = new EventEmitter<string>();

    @ViewChild('dt') table!: Table;

    @Input() searchValue: string = '';
    activeActionMenuItems: MenuItem[] = [];
    private destroy$ = new Subject<void>();

    constructor(private globalSearchService: GlobalSearchService) {}

    ngAfterViewInit() {
        this.globalSearchService.searchQuery$
            .pipe(takeUntil(this.destroy$))
            .subscribe((query: string) => {
                this.searchValue = query || '';
                if (this.table && !this.lazy) {
                    this.table.filterGlobal(this.searchValue, 'contains');
                }
            });
    }

    get filteredList(): any[] {
        if (!this.listeObject) return [];
        if (!this.searchValue || this.lazy) return this.listeObject;
        const query = this.searchValue.toLowerCase().trim();
        return this.listeObject.filter(item => {
            if (this.filterFields && this.filterFields.length > 0) {
                return this.filterFields.some(field => {
                    const val = item[field];
                    return val !== null && val !== undefined && String(val).toLowerCase().includes(query);
                });
            }
            return Object.values(item).some(val => 
                val !== null && val !== undefined && String(val).toLowerCase().includes(query)
            );
        });
    }

    get actualTotalElements(): number {
        if (this.lazy) return this.totalElements;
        if (this.totalElements > 0 && this.totalElements > (this.listeObject?.length || 0)) {
            return this.totalElements;
        }
        return this.filteredList.length;
    }

    get displayedObjects(): any[] {
        if (this.lazy || !this.isPagination || !this.listeObject) {
            return this.listeObject;
        }
        if (this.totalElements > 0 && this.totalElements > this.listeObject.length) {
            return this.listeObject;
        }
        const start = this.currentPage * this.pageSize;
        return this.filteredList.slice(start, start + this.pageSize);
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    onPageChange(event: any) {
        const page = event.page !== undefined ? event.page : Math.floor((event.first || 0) / (event.rows || this.pageSize));
        const size = event.rows || this.pageSize;
        this.currentPage = page;
        this.pageSize = size;
        this.pageChangeEvent.emit({ page, size });
    }

    onLazyLoad(event: any) {
        if (this.lazy) {
            this.lazyLoad.emit(event);
            this.pageChangeEvent.emit({
                page: event.first !== undefined ? Math.floor(event.first / (event.rows || this.pageSize)) : 0,
                size: event.rows || this.pageSize
            });
        }
    }

    onActionClick(event: any, menu: any, rowData: any) {
        if (this.getActionMenuItems) {
            this.activeActionMenuItems = this.getActionMenuItems(rowData);
            if (menu) {
                menu.model = this.activeActionMenuItems;
                menu.toggle(event);
            }
        } else if (this.actionClick.observed) {
            this.actionClick.emit({ event, menu, rowData });
        } else {
            this.activeActionMenuItems = this.actionMenuItems;
            if (menu) {
                menu.model = this.activeActionMenuItems;
                menu.toggle(event);
            }
        }
    }

    onRowClick(rowData: any) {
        if (this.clickableRows) {
            this.rowClick.emit(rowData);
        }
    }

    onAddClick() {
        this.addClick.emit();
    }

    filterGlobal(value: string) {
        this.searchValue = value;
        this.searchValueChange.emit(value);
        this.globalSearchService.updateSearchQuery(value);
        if (!this.lazy) {
            this.currentPage = 0;
            if (this.table) {
                this.table.filterGlobal(value, 'contains');
            }
        }
    }

    getFileIcon(fileName?: string): string {
        if (!fileName) return 'assets/images/doc-file.png';
        const lower = fileName.toLowerCase().trim();
        if (lower.endsWith('.pdf')) return 'assets/images/pdf-file.png';
        if (lower.endsWith('.doc') || lower.endsWith('.docx')) return 'assets/images/doc-file.png';
        if (lower.endsWith('.xls') || lower.endsWith('.xlsx')) return 'assets/images/xls-file.png';
        if (lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png') || lower.endsWith('.webp') || lower.endsWith('.svg')) return 'assets/images/jpeg-file.png';
        if (lower.endsWith('.txt')) return 'assets/images/txt-file.png';
        return 'assets/images/doc-file.png';
    }

    formatDateVal(value: any, pattern?: string): string {
        if (!value) return '—';
        try {
            const d = new Date(value);
            if (isNaN(d.getTime())) return String(value);
            return formatDateTodd(d);
        } catch {
            return String(value);
        }
    }
}
