import {
    AfterContentChecked,
    ChangeDetectorRef,
    Component,
    EventEmitter,
    Input,
    OnChanges, OnInit,
    Output,
    SimpleChanges
} from '@angular/core';
import {UntypedFormGroup} from "@angular/forms";
import {ConfirmationService, MessageService} from "primeng/api";
import {patternToDate, toFormatFromDate} from "../../utils";
import {DropdownSelector, FormGroupColumn, MultiSelectSelector, TableColumn} from "../../models";
import { NgPrimeModule } from '../../../prime-ng.module';
import { FormInputTemplateComponent } from '../form-input-template/form-input-template.component';
import { DetailTemplateComponent } from '../detail-template/detail-template.component';

@Component({
  selector: 'app-crud-generic',
  standalone: true,
  templateUrl: './app-crud-generic.component.html',
  styleUrl: './app-crud-generic.component.scss',
  imports: [
    NgPrimeModule, 
    FormInputTemplateComponent,
    DetailTemplateComponent
    ]
})
export class AppCrudGenericComponent implements OnInit, AfterContentChecked, OnChanges {
    @Input() pageLabel!: string;
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
    dropDownObject: any = {};
    multiselectObject: any = {};
    position: any = 'top';
    value: any;
    rowData:any;
    @Input() customButtons: {label: string; icon: string; action: string; color?: string; tooltip?: string; tooltipPosition?: string; }[] = [];
    @Output() customActionEvent = new EventEmitter<{ action: string; user: any }>();

    constructor(protected confirmationService: ConfirmationService, protected changeDet: ChangeDetectorRef) {
    }

    ngOnInit(): void {
        this.filterFiels = this.tableCols.map(c => c.field);
        if (this.dropdownList) {
            this.dropdownList.forEach(v => {
                this.dropDownObject[v.field] = v.dropdownEntries;
            });
        }

        if (this.multiSelectList) {
            this.multiSelectList.forEach(v => {
                this.multiselectObject[v.field] = v.multiselectEntries;
            });
        }
    }

    // Permet de lever l'exception
    // ExpressionChangedAfterItHasBeenCheckedError
    ngAfterContentChecked(): void {
        this.changeDet.detectChanges();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (this.closeDialog) {
            this.hidDialog();
        }
    }

    save() {
        if (this.formGroup.valid) {
            const data: any = this.formGroup.value;
            this.newItemEvent.emit(data);
        }
    }

    delele(data: any) {
        this.confirmationService.confirm({
            header: 'CONFIRMATION',
            message: 'Voulez-vous vraiment supprimer cet enregistrement ',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                this.removeEvent.emit(data);
            }
        });
    }

    openNew() {
        this.formGroup.reset();
        this.display = true;
    }

    edit(rowData: any) {
        this.formGroup.patchValue(rowData);
        const cols = this.tableCols.filter(col => col.type === 'date');
        if (cols?.length > 0) {
            cols.forEach(col => {
                const date = rowData[col.field] ? patternToDate(toFormatFromDate(rowData[col.field]),
                    'DD/MM/YYYY') : null;
                this.formGroup.get(col.field)?.setValue(date);
            });
        }
        this.display = true;
    }

    hidDialog() {
        this.formGroup.reset();
        this.display = false;
    }

    onFilterChange(field: string) {
        if (field) {
            const elem = this.searchField.find(res => res.field === field);
            if (elem) {
                elem.value = this.value;
                this.filterEvent.emit(elem);
            }
        }
    }
    onCustomAction(action: string, user: any): void {
        this.confirmationService.confirm({
            header: 'CONFIRMATION',
            message: 'Voulez-vous vraiment valider cette action ? ',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                this.customActionEvent.emit({ action, user });
            }
        });

    }
affich(rowData:any){
        this.displayDetails=true;
this.rowData=rowData;
}
}
