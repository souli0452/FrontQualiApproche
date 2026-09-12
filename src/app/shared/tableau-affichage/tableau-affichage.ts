import { CommonModule } from '@angular/common';
import {
    Component,
    EventEmitter,
    Input,
    Output,
    ViewChild,
    AfterViewInit,
    OnDestroy
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MenuItem } from 'primeng/api';
import { Table } from 'primeng/table';
import { TableColumn } from '../../models/generique.model';
import { NgPrimeModule } from '../../../prime-ng.module';
import { GlobalSearchService } from '../recherche-globale/global-search.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

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

    // Options de customisation de la barre supérieure
    @Input() showSearch: boolean = true;
    @Input() placeholderRecherche: string = 'Rechercher...';
    @Input() showAddButton: boolean = false;
    @Input() addButtonLabel: string = 'Ajouter';
    @Input() recordName: string = 'éléments';

    @Output() pageChangeEvent = new EventEmitter<{ page: number; size: number }>();
    @Output() actionClick = new EventEmitter<{ event: any; menu: any; rowData: any }>();
    @Output() addClick = new EventEmitter<void>();

    @ViewChild('dt') table!: Table;

    searchValue: string = '';
    private destroy$ = new Subject<void>();

    constructor(private globalSearchService: GlobalSearchService) {}

    ngAfterViewInit() {
        this.globalSearchService.searchQuery$
            .pipe(takeUntil(this.destroy$))
            .subscribe((query: string) => {
                this.searchValue = query || '';
                if (this.table) {
                    this.table.filterGlobal(this.searchValue, 'contains');
                }
            });
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    onPageChange(event: any) {
        this.pageChangeEvent.emit({
            page: event.page !== undefined ? event.page : (event.first / this.pageSize),
            size: event.rows || this.pageSize
        });
    }

    onActionClick(event: any, menu: any, rowData: any) {
        this.actionClick.emit({ event, menu, rowData });
    }

    onAddClick() {
        this.addClick.emit();
    }

    filterGlobal(value: string) {
        this.searchValue = value;
        this.globalSearchService.updateSearchQuery(value);
        if (this.table) {
            this.table.filterGlobal(value, 'contains');
        }
    }
}
