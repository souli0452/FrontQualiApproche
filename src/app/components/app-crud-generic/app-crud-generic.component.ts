import {
    AfterContentChecked,
    ChangeDetectorRef,
    Component,
    EventEmitter,
    Input,
    OnChanges, OnInit, OnDestroy,
    Output,
    SimpleChanges,
    ViewChild
} from '@angular/core';
import {UntypedFormGroup} from "@angular/forms";
import { Table } from 'primeng/table';
import { Subject, takeUntil } from 'rxjs';
import {ConfirmationService, MessageService} from "primeng/api";
import {patternToDate, toFormatFromDate} from "../../utils";
import { DropdownSelector, FormGroupColumn, MultiSelectSelector, TableColumn} from "../../models";
import { NgPrimeModule } from '../../../prime-ng.module';
import { FormInputTemplateComponent } from '../form-input-template/form-input-template.component';
import { DetailTemplateComponent } from '../detail-template/detail-template.component';
import { MenuItem } from 'primeng/api';
import { MenuModule } from 'primeng/menu';
import { GlobalSearchService } from '../../services/non-conformite/global-search.service';

@Component({
    selector: 'app-crud-generic',
    standalone: true,
    templateUrl: './app-crud-generic.component.html',
    styleUrl: './app-crud-generic.component.scss',
    imports: [NgPrimeModule, FormInputTemplateComponent, DetailTemplateComponent, MenuModule]
})
export class AppCrudGenericComponent implements OnInit, AfterContentChecked, OnChanges, OnDestroy {
    @Input() pageLabel!: string;
    actionMenuItems: MenuItem[] = [];
    @Input() loading: boolean = false;
    @Input() asRoleEdit: boolean = false;
    @Input() tableCols!: TableColumn[];
    @Input() formCols!: FormGroupColumn[];
    @Input() formGroup!: UntypedFormGroup;
    @Output() newItemEvent = new EventEmitter<any>();
    @Output() removeEvent = new EventEmitter<any>();
    @Output() filterEvent = new EventEmitter<any>();
    @Input() listeObject!: any[];
    @Input() dropdownList!: DropdownSelector[];
    @Input() multiSelectList!: MultiSelectSelector[];
    @Input() closeDialog!: boolean;
    @Input() formHeader!: string;
    @Input() notModif!: boolean;
    @Input() notDelete!: boolean;
    @Input() searchField!: any[];
    @Input() addFilter!: boolean;
    @Input() isAffich!: boolean;
    @Input() cols!: any[];
    @Input() consultation!: boolean;
    @Input() dialogWidth = '50rem';
    @Input() detailTitle!: string;
    displayDetails: boolean = false;
    display!: boolean;
    filterFiels!: any[];
    @Input() dropDownObject: any = {};
    @Input() multiselectObject: any = {};
    position: any = 'top';
    value: any;
    rowData: any;
    lastTarget: any;

    @Input() customButtons: { label: string; icon: string; action: string; color?: string; tooltip?: string; tooltipPosition?: string }[] = [];
    @Input() isPagination: boolean = true;
    @Input() addButtonLabel: string = 'Ajouter';
    @Input() minWidth: string = '50rem';
    @Input() loadingRows: number = 10;
    @Output() customActionEvent = new EventEmitter<{ action: string; user: any }>();

    @ViewChild('dt') table!: Table;
    private destroy$: Subject<boolean> = new Subject<boolean>();

    constructor(
        protected confirmationService: ConfirmationService,
        protected changeDet: ChangeDetectorRef,
        private globalSearchService: GlobalSearchService
    ) {}

    ngOnInit(): void {
        this.filterFiels = this.tableCols.map((c) => c.field);
        if (this.dropdownList) {
            this.dropdownList.forEach((v) => {
                this.dropDownObject[v.field] = v.dropdownEntries;
            });
        }

        if (this.multiSelectList) {
            this.multiSelectList.forEach((v) => {
                this.multiselectObject[v.field] = v.multiselectEntries;
            });
        }

        // Écouter la barre de recherche globale
        this.globalSearchService.searchQuery$.pipe(takeUntil(this.destroy$)).subscribe((query) => {
            if (this.table) {
                this.table.filterGlobal(query, 'contains');
            }
        });
    }

    ngOnDestroy(): void {
        this.destroy$.next(true);
        this.destroy$.complete();
    }

    // Permet de lever l'exception
    // ExpressionChangedAfterItHasBeenCheckedError
    ngAfterContentChecked(): void {
        this.changeDet.detectChanges();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['dropdownList'] && this.dropdownList) {
            this.dropdownList.forEach((v) => {
                this.dropDownObject[v.field] = v.dropdownEntries;
            });
        }
        if (changes['multiSelectList'] && this.multiSelectList) {
            this.multiSelectList.forEach((v) => {
                this.multiselectObject[v.field] = v.multiselectEntries;
            });
        }
        if (this.closeDialog) {
            this.hidDialog();
        }
    }

    save() {
        if (this.formGroup.valid) {
            const data: any = { ...this.formGroup.value };
            // Extraire la valeur unique pour les dropdowns (gérés via p-multiSelect)
            if (this.formCols) {
                const dropdownCols = this.formCols.filter((col) => col.type === 'dropdown');
                dropdownCols.forEach((col) => {
                    const field = col.field;
                    if (field && Array.isArray(data[field])) {
                        data[field] = data[field].length > 0 ? data[field][0] : null;
                    }
                });
            }
            this.newItemEvent.emit(data);
        }
    }

    delele(data: any, event: any) {
        this.confirmationService.confirm({
            key: 'crudPopup',
            target: this.lastTarget || event?.originalEvent?.target || event?.target,
            header: 'CONFIRMATION',
            message: 'Voulez-vous vraiment supprimer cet enregistrement ?',
            icon: 'pi pi-exclamation-triangle',
            rejectButtonProps: {
                label: 'Annuler',
                severity: 'secondary',
                outlined: true,
                size: 'small'
            },
            acceptButtonProps: {
                label: 'Supprimer',
                severity: 'danger',
                size: 'small'
            },
            accept: () => {
                this.removeEvent.emit(data);
            }
        });
    }

    openNew() {
        this.rowData = null;
        this.formGroup.reset();
        // On force chaque champ à null pour être certain de vider les éditeurs/sélecteurs
        Object.keys(this.formGroup.controls).forEach(key => {
            this.formGroup.get(key)?.setValue(null);
        });
        this.display = true;
    }

    edit(rowData: any) {
        this.rowData = rowData;
        this.display = true;
        setTimeout(() => {
            this.formGroup.patchValue(rowData);
            
            // Gérer les dates
            const cols = this.tableCols.filter((col) => col.type === 'date');
            if (cols?.length > 0) {
                cols.forEach((col) => {
                    const date = rowData[col.field] ? patternToDate(toFormatFromDate(rowData[col.field]), 'DD/MM/YYYY') : null;
                    this.formGroup.get(col.field)?.setValue(date);
                });
            }

            // Gérer les dropdowns (puisqu'ils sont rendus via p-multiSelect à choix unique, on enveloppe la valeur dans un tableau)
            if (this.formCols) {
                const dropdownCols = this.formCols.filter((col) => col.type === 'dropdown');
                if (dropdownCols?.length > 0) {
                    dropdownCols.forEach((col) => {
                        const field = col.field;
                        if (field) {
                            const val = rowData[field];
                            if (val != null && val !== undefined) {
                                const idValue = typeof val === 'object' ? (val.id || val.value) : val;
                                this.formGroup.get(field)?.setValue([idValue]);
                            } else {
                                this.formGroup.get(field)?.setValue([]);
                            }
                        }
                    });
                }
            }
        });
    }

    hidDialog() {
        this.rowData = null;
        this.formGroup.reset();
        Object.keys(this.formGroup.controls).forEach(key => {
            this.formGroup.get(key)?.setValue(null);
        });
        this.display = false;
    }

    onFilterChange(field: string) {
        if (field) {
            const elem = this.searchField.find((res) => res.field === field);
            if (elem) {
                elem.value = this.value;
                this.filterEvent.emit(elem);
            }
        }
    }
    onCustomAction(action: string, user: any, event?: Event): void {
        if(this.asRoleEdit){
            this.customActionEvent.emit({ action, user });
        }else {
            this.confirmationService.confirm({
                key: 'crudPopup',
                target: this.lastTarget || (event?.target as EventTarget),
                header: 'CONFIRMATION',
                message: 'Voulez-vous vraiment valider cette action ? ',
                icon: 'pi pi-exclamation-triangle',
                rejectButtonProps: {
                    label: 'Annuler',
                    severity: 'secondary',
                    outlined: true,
                    size: 'small'
                },
                acceptButtonProps: {
                    label: 'Confirmer',
                    severity: 'info',
                    size: 'small'
                },
                accept: () => {
                    this.customActionEvent.emit({ action, user });
                }
            });
        }

    }
    affich(rowData: any) {
        this.displayDetails = true;
        this.rowData = rowData;
    }

    setActionMenu(event: any, menu: any, rowData: any) {
        this.lastTarget = event.currentTarget || event.target;
        this.actionMenuItems = [];

        // Bouton Détails
        if (this.isAffich) {
            this.actionMenuItems.push({
                label: 'Détails',
                icon: 'pi pi-eye',
                styleClass: 'menu-style',
                command: () => this.affich(rowData)
            });
        }

        // Bouton Modifier
        if (!this.notModif && !this.consultation) {
            this.actionMenuItems.push({
                label: 'Modifier',
                icon: 'pi pi-pencil',
                styleClass: 'menu-style',
                command: () => this.edit(rowData)
            });
        }

        // Bouton Supprimer
        if (!this.notDelete && !this.consultation) {
            this.actionMenuItems.push({
                label: 'Supprimer',
                icon: 'pi pi-trash',
                styleClass: 'text-red-500 menu-style',
                command: (event: any) => this.delele(rowData, event.originalEvent)
            });
        }

        // Actions personnalisées
        if (this.customButtons && this.customButtons.length > 0) {
            this.customButtons.forEach((btn) => {
                this.actionMenuItems.push({
                    label: btn.label,
                    icon: btn.icon,
                    command: (event: any) => this.onCustomAction(btn.action, rowData, event.originalEvent)
                });
            });
        }

        menu.toggle(event);
    }
}
