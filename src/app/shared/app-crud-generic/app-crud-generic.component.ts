import {
    AfterContentChecked,
    ChangeDetectorRef,
    Component,
    EventEmitter,
    Input,
    OnChanges, OnInit, OnDestroy,
    Output,
    SimpleChanges,
    ViewChild,
    ContentChild,
    TemplateRef
} from '@angular/core';
import {UntypedFormGroup} from "@angular/forms";
import { Table } from 'primeng/table';
import { Subject, takeUntil } from 'rxjs';
import {ConfirmationService, MessageService} from "primeng/api";
import { NgPrimeModule } from '@prime-ng';
import { FormInputTemplateComponent } from '../form-input-template/form-input-template.component';
import { MenuItem } from 'primeng/api';
import { MenuModule } from 'primeng/menu';
import { DropdownSelector, FormGroupColumn, MultiSelectSelector, TableColumn } from '../../models/generique.model';
import { patternToDate, toFormatFromDate } from '../../utils/formatage/formatage-utils';
import { TableauAffichageComponent } from '../tableau-affichage/tableau-affichage';
import { FormModal } from '../form-modal/form-modal';
import { DetailModal } from '../detail-modal/detail-modal';
import { DetailTemplateComponent } from '../detail-content/detail-content';
import { RequestPasswordComponent } from '../request-password/request-password';
import { GlobalSearchService } from '@shared/recherche-globale/global-search.service';

@Component({
    selector: 'app-crud-generic',
    standalone: true,
    templateUrl: './app-crud-generic.component.html',
    styleUrl: './app-crud-generic.component.scss',
    imports: [
        NgPrimeModule, 
        FormInputTemplateComponent, 
        MenuModule, 
        TableauAffichageComponent, 
        FormModal,
        DetailModal,
        DetailTemplateComponent,
        RequestPasswordComponent
    ]
})
export class AppCrudGenericComponent implements OnInit, AfterContentChecked, OnChanges, OnDestroy {
    @ContentChild('customDetail') customDetailTemplate?: TemplateRef<any>;
    @Input() pageLabel!: string;
    actionMenuItems: MenuItem[] = [];
    @Input() loading: boolean = false;
    @Input() formLongDescription: string = '';
    @Input() detailLongDescription: string = '';
    @Input() detailImagePath: string = 'assets/logo-quali-sira.svg';
    @Input() asRoleEdit: boolean = false;
    @Input() tableCols!: TableColumn[];
    @Input() formCols!: FormGroupColumn[];
    @Input() formGroup!: UntypedFormGroup;
    @Output() newItemEvent = new EventEmitter<any>();
    @Output() removeEvent = new EventEmitter<any>();
    @Output() filterEvent = new EventEmitter<any>();
    @Input() requireRqPassword: boolean = false;

    @Input() detailCols?: any[];
    
    @Input() showItemDescriptionOnTop: boolean = true;

    @Input() totalElements: number = 0;
    @Input() pageSize: number = 10;
    @Input() currentPage: number = 0;
    @Output() pageChangeEvent = new EventEmitter<{ page: number, size: number }>();

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
    @Input() deleteConfirmField?: string; // optionnel, pour forcer 'code' par exemple
    deleteExpectedValue: string = '';
    deleteTargetLabel: string = 'le libellé';

    displayPasswordDialog: boolean = false;
    itemToDelete: any = null;
    passwordLoading: boolean = false;

    /**
     * Actions propres à l'écran, ajoutées au menu de chaque ligne.
     *
     * <p>`visible` permet de n'en proposer une que sur les lignes concernées : sans elle, une
     * action qui ne vaut que pour quelques enregistrements devait être sortie du tableau, ou
     * proposée partout pour n'aboutir nulle part.</p>
     */
    @Input() customButtons: {
        label: string; icon: string; action: string;
        color?: string; tooltip?: string; tooltipPosition?: string;
        visible?: (rowData: any) => boolean;
    }[] = [];
    @Input() isPagination: boolean = true;
    @Input() addButtonLabel?: string;
    @Input() showAddButton?: boolean;

    get canShowAddButton(): boolean {
        if (this.consultation) return false;
        if (this.showAddButton !== undefined) return this.showAddButton;
        return !!this.addButtonLabel;
    }
    /**
     * Confie l'ajout à l'écran appelant plutôt qu'au formulaire intégré.
     *
     * <p>Certains objets ne se décrivent pas dans un `formCols` — un circuit de validation a des
     * étapes, des transitions et des champs de saisie. Sans cette option, ces écrans devaient
     * renoncer à la barre de titre du tableau et se dessiner un en-tête à part, ce qui les faisait
     * diverger du reste de l'application.</p>
     */
    @Input() ajoutExterne = false;
    @Output() ajoutDemande = new EventEmitter<void>();
    @Output() editDemande = new EventEmitter<any>();
    @Input() minWidth: string = '50rem';
    @Input() loadingRows: number = 10;
    @Output() customActionEvent = new EventEmitter<{ action: string; user: any }>();

    @ViewChild(TableauAffichageComponent) tableauAffichage!: TableauAffichageComponent;
    @ViewChild('dt') table!: Table;
    private destroy$: Subject<boolean> = new Subject<boolean>();

    constructor(
        protected confirmationService: ConfirmationService,
        protected changeDet: ChangeDetectorRef,
        private globalSearchService: GlobalSearchService
    ) {}

    ngOnInit(): void {
        this.filterFiels = this.tableCols ? this.tableCols.map((c) => c.field) : [];
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
            if (this.tableauAffichage) {
                this.tableauAffichage.filterGlobal(query);
            } else if (this.table) {
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

    onPageChange(event: any) {
        // PrimeNG renvoie : 
        // event.page : l'index de la page (0, 1, 2...)
        // event.rows : le nombre de lignes par page
        this.pageChangeEvent.emit({ 
            page: event.page, 
            size: event.size 
        });
    }

    // Calcul automatique du nombre de pages
    get totalPages(): number {
        return Math.ceil(this.totalElements / this.pageSize);
    }

    // Gestion du clic
    onPageNumberClick(pageIndex: number) {
        if (pageIndex >= 0 && pageIndex < this.totalPages) {
            this.pageChangeEvent.emit({ page: pageIndex, size: this.pageSize });
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
        if (this.requireRqPassword) {
            this.itemToDelete = data;
            
            // Priorité au champ explicitement configuré, sinon Libellé par défaut, sinon Code, etc.
            if (this.deleteConfirmField && data[this.deleteConfirmField]) {
                this.deleteExpectedValue = String(data[this.deleteConfirmField]);
                this.deleteTargetLabel = this.deleteConfirmField === 'code' ? 'le code' : 'la valeur';
            } else if (data.libelle) {
                this.deleteExpectedValue = String(data.libelle);
                this.deleteTargetLabel = 'le libellé';
            } else if (data.libelleLong) {
                this.deleteExpectedValue = String(data.libelleLong);
                this.deleteTargetLabel = 'le libellé';
            } else if (data.code) {
                this.deleteExpectedValue = String(data.code);
                this.deleteTargetLabel = 'le code';
            } else if (data.reference || data.numeroRef) {
                this.deleteExpectedValue = String(data.reference || data.numeroRef);
                this.deleteTargetLabel = 'la référence';
            } else {
                this.deleteExpectedValue = String(data.id || 'CONFIRMER');
                this.deleteTargetLabel = 'la confirmation';
            }

            this.displayPasswordDialog = true;
            return;
        }

        this.confirmationService.confirm({
            key: 'crudPopup',
            target: this.lastTarget || event?.originalEvent?.target || event?.target,
            header: 'CONFIRMATION',
            message: 'Voulez-vous vraiment supprimer cet enregistrement ?',
            icon: 'pi pi-exclamation-triangle',
            rejectButtonProps: { label: 'Annuler', severity: 'secondary', outlined: true, size: 'small' },
            acceptButtonProps: { label: 'Supprimer', severity: 'danger', size: 'small' },
            accept: () => {
                this.removeEvent.emit(data);
            }
        });
    }


    onConfirmDeleteWithPassword() {
        this.displayPasswordDialog = false;
        if (this.itemToDelete) {
            this.removeEvent.emit(this.itemToDelete);
            this.itemToDelete = null;
        }
    }


    openNew() {
        if (this.ajoutExterne) {
            this.ajoutDemande.emit();
            return;
        }
        this.rowData = null;
        this.formGroup.reset();
        // On force chaque champ à null pour être certain de vider les éditeurs/sélecteurs
        Object.keys(this.formGroup.controls).forEach(key => {
            this.formGroup.get(key)?.setValue(null);
        });
        this.display = true;
    }

    edit(rowData: any) {
        if (this.ajoutExterne) {
            this.editDemande.emit(rowData);
            return;
        }
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

        // Actions personnalisées, celles qui valent pour cette ligne.
        if (this.customButtons && this.customButtons.length > 0) {
            this.customButtons
                .filter((btn) => !btn.visible || btn.visible(rowData))
                .forEach((btn) => {
                    this.actionMenuItems.push({
                        label: btn.label,
                        icon: btn.icon,
                        styleClass: 'menu-style',
                        command: (event: any) => this.onCustomAction(btn.action, rowData, event.originalEvent)
                    });
                });
        }

        // Bouton Supprimer à la fin
        if (!this.notDelete && !this.consultation) {
            this.actionMenuItems.push({
                label: 'Supprimer',
                icon: 'pi pi-trash',
                styleClass: 'delete-menu-item menu-style',
                command: (event: any) => this.delele(rowData, event.originalEvent)
            });
        }

        menu.toggle(event);
    }
}
