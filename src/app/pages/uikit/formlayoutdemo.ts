import { Component } from '@angular/core';
import { FluidModule } from 'primeng/fluid';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { FormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { TextareaModule } from 'primeng/textarea';
import { Subject, takeUntil } from 'rxjs';
import { Formation, FormGroupColumn, TableColumn } from '../../models';
import { MessageService } from 'primeng/api';
import { FormationService } from '../../services/formation.service';
import { showToast, StatusEnum } from '../../utils';
import { HttpResponse } from '@angular/common/http';
import { NgPrimeModule } from '../../../prime-ng.module';
import { AppCrudGenericComponent } from '../../components/app-crud-generic/app-crud-generic.component';

@Component({
    selector: 'app-formlayout-demo',
    standalone: true,
    imports: [NgPrimeModule, AppCrudGenericComponent],
    template: `<p-fluid>
        <ng-template>
    <app-crud-generic
        [dialogWidth]="'50vw'"
        [pageLabel]="pageLabel"
        [tableCols]="tableCols"
        [listeObject]="dataList"
        [formGroup]="formGroup"
        [formCols]="formCols"
        [isAffich]="true"
        [closeDialog]="closeDialog"
        [formHeader]="formHeader"
        (newItemEvent)="onSave($event)"
        (removeEvent)="onDelete($event)">
    </app-crud-generic>
</ng-template>
        <div class="flex flex-col md:flex-row gap-8">
            <div class="md:w-1/2">
                <div class="card flex flex-col gap-4">
                    <div class="font-semibold text-xl">Vertical</div>
                    <div class="flex flex-col gap-2">
                        <label for="name1">Name</label>
                        <input pInputText id="name1" type="text" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label for="email1">Email</label>
                        <input pInputText id="email1" type="text" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label for="age1">Age</label>
                        <input pInputText id="age1" type="text" />
                    </div>
                </div>

                <div class="card flex flex-col gap-4">
                    <div class="font-semibold text-xl">Vertical Grid</div>
                    <div class="flex flex-wrap gap-6">
                        <div class="flex flex-col grow basis-0 gap-2">
                            <label for="name2">Name</label>
                            <input pInputText id="name2" type="text" />
                        </div>
                        <div class="flex flex-col grow basis-0 gap-2">
                            <label for="email2">Email</label>
                            <input pInputText id="email2" type="text" />
                        </div>
                    </div>
                </div>
            </div>
            <div class="md:w-1/2">
                <div class="card flex flex-col gap-4">
                    <div class="font-semibold text-xl">Horizontal</div>
                    <div class="grid grid-cols-12 gap-4 grid-cols-12 gap-2">
                        <label for="name3" class="flex items-center col-span-12 mb-2 md:col-span-2 md:mb-0">Name</label>
                        <div class="col-span-12 md:col-span-10">
                            <input pInputText id="name3" type="text" />
                        </div>
                    </div>
                    <div class="grid grid-cols-12 gap-4 grid-cols-12 gap-2">
                        <label for="email3" class="flex items-center col-span-12 mb-2 md:col-span-2 md:mb-0">Email</label>
                        <div class="col-span-12 md:col-span-10">
                            <input pInputText id="email3" type="text" />
                        </div>
                    </div>
                </div>

                <div class="card flex flex-col gap-4">
                    <div class="font-semibold text-xl">Inline</div>
                    <div class="flex flex-wrap items-start gap-6">
                        <div class="field">
                            <label for="firstname1" class="sr-only">Firstname</label>
                            <input pInputText id="firstname1" type="text" placeholder="Firstname" />
                        </div>
                        <div class="field">
                            <label for="lastname1" class="sr-only">Lastname</label>
                            <input pInputText id="lastname1" type="text" placeholder="Lastname" />
                        </div>
                        <p-button label="Submit" [fluid]="false"></p-button>
                    </div>
                </div>
                <div class="card flex flex-col gap-4">
                    <div class="font-semibold text-xl">Help Text</div>
                    <div class="flex flex-wrap gap-2">
                        <label for="username">Username</label>
                        <input pInputText id="username" type="text" />
                        <small>Enter your username to reset your password.</small>
                    </div>
                </div>
            </div>
        </div>

        <div class="flex mt-8">
            <div class="card flex flex-col gap-6 w-full">
                <div class="font-semibold text-xl">Advanced</div>
                <div class="flex flex-col md:flex-row gap-6">
                    <div class="flex flex-wrap gap-2 w-full">
                        <label for="firstname2">Firstname</label>
                        <input pInputText id="firstname2" type="text" />
                    </div>
                    <div class="flex flex-wrap gap-2 w-full">
                        <label for="lastname2">Lastname</label>
                        <input pInputText id="lastname2" type="text" />
                    </div>
                </div>

                <div class="flex flex-wrap">
                    <label for="address">Address</label>
                    <textarea pTextarea id="address" rows="4"></textarea>
                </div>

                <div class="flex flex-col md:flex-row gap-6">
                    <div class="flex flex-wrap gap-2 w-full">
                        <label for="state">State</label>
                        <p-select id="state" [(ngModel)]="dropdownItem" [options]="dropdownItems" optionLabel="name" placeholder="Select One" class="w-full"></p-select>
                    </div>
                    <div class="flex flex-wrap gap-2 w-full">
                        <label for="zip">Zip</label>
                        <input pInputText id="zip" type="text" />
                    </div>
                </div>
            </div>
        </div>
    </p-fluid>`
})
export class FormLayoutDemo {
    dropdownItems = [
        { name: 'Option 1', code: 'Option 1' },
        { name: 'Option 2', code: 'Option 2' },
        { name: 'Option 3', code: 'Option 3' }
    ];

    dropdownItem = null;

    loading: boolean = true;
        destroy$: Subject<boolean> = new Subject<boolean>();
        dataList: Formation[] = [];
        closeDialog = false;
        formGroup: UntypedFormGroup;
        tableCols: TableColumn[];
        formCols: FormGroupColumn[];
        pageLabel = 'Formations';
        formHeader = 'Création et mise à jour d\'une formation';

        constructor(protected fb: UntypedFormBuilder,
                    protected messageService: MessageService,
                    protected formationService: FormationService) {
            this.formCols = [
                {field: 'id', label: "", header: 'Id', type: 'number', visible: false, required: false},
                {field: 'libelle', label: "", header: 'Libellé', type: 'string', visible: true, required: true},
                {field: 'description', label: "", header: 'Description', type: 'text', visible: true, required: true},
                {field: 'objectif', label: "", header: 'Objectif', type: 'string', visible: true, required: true},
                {field: 'prerequis', label: "", header: 'Prérequis', type: 'string', visible: true, required: true},
                {field: 'competence', label: "", header: 'Compétence', type: 'string', visible: true, required: true},
               // {field: 'statut', header: 'Statut', type: 'dropdown', visible: true, required: false},



            ];

            this.tableCols = [
                {field: 'libelle', header: 'Libellé', type: 'string', filter: true},
                {field: 'description', header: 'Description', type: 'string', filter: true},
                {field: 'objectif', header: 'Objectif', type: 'string', filter: true},
                {field: 'prerequis', header: 'Prérequis', type: 'string', filter: true},
                {field: 'competence', header: 'Compétence', type: 'string', filter: true},
                {field: 'statut', header: 'Statut', type: 'enum', filter: true},
                // {field: 'createdAt', header: 'Date de création', type: 'string', filter: true},
                // {field: 'updatedAt', header: 'Date de modification', type: 'string', filter: true},
            ];

            this.formGroup = this.fb.group({
                id: [null],
                libelle: [null, Validators.required],
                description: [],
                objectif: [null, Validators.required],
                prerequis: [null, Validators.required],
                competence: [null, Validators.required],
            });
        }

        ngOnInit(): void {
            this.fetchFormation();
        }

        fetchFormation() {
            this.formationService.findAll().pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: res => {
                        this.dataList = res.body || [];
                    },
                    error: error => {
                        showToast(StatusEnum.error, error.status, null, this.messageService, error);
                    }
                });
        }

        onSuccess(res: HttpResponse<any>) {
            this.closeDialog = true;
            this.fetchFormation();
            showToast(StatusEnum.success, res.status, null, this.messageService);
        }

        onSave(object: Formation) {
            if (object.id != null || undefined) {
                this.formationService.update(object).pipe(takeUntil(this.destroy$))
                    .subscribe({
                        next: res => {
                            this.onSuccess(res);
                        }, error: error => {
                            showToast(StatusEnum.error, error.status, null, this.messageService, error);
                        }
                    });
            } else {
                this.formationService.save(object).pipe(takeUntil(this.destroy$))
                    .subscribe({
                        next: res => {
                            this.onSuccess(res);
                        }, error: error => {
                            showToast(StatusEnum.error, error.status, null, this.messageService, error);
                        }
                    });
            }
        }

        onDelete(formation: Formation) {
            this.formationService.delete(formation.id!).pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: res => {
                        this.onSuccess(res);
                    }, error: error => {
                        showToast(StatusEnum.error, error.status, null, this.messageService, error);
                    }
                });

        }

        ngOnDestroy(): void {
            this.destroy$.next(true);
            this.destroy$.unsubscribe();
        }
    }

