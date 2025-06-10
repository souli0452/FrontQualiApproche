import { Component, OnDestroy, OnInit } from '@angular/core';
import { Table } from 'primeng/table';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { StructureService } from './structure-service';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ActivatedRoute } from '@angular/router';
import { Structure } from './structure';
import { TypeStructure } from '../../enums';
import { handleHttpErrors, showToast } from '../../utils';
import { CommonModule } from '@angular/common';
import { NgPrimeModule } from '../../../prime-ng.module';
import {
    DmdTraitementTableTemplateComponent
} from '../../components/dmd.traitement-table-template/dmd.traitement-table-template.component';
import { CreationComponent } from './creation/creation.component';
@Component({
    selector: 'app-structure',
    templateUrl: './structure.component.html',
    styleUrl: './structure.component.scss',
    standalone: true,
    imports:[
        CommonModule,
        NgPrimeModule,
        CreationComponent
    ]
})
export class StructureComponent implements OnInit, OnDestroy {
    cols: any[] = [];
    rowsPerPageOptions = [5, 10, 20];
    editForm?: UntypedFormGroup;
    display = false;
    destroy$: Subject<boolean> = new Subject<boolean>();
    colsFilter: any[] = [];
    structures: Array<Structure> = [];
    directions: Array<Structure> = [];
    search: any;
    currentStructure?: Structure;
    demandeKey = 'demandeKey';
    typeStructure: TypeStructure = TypeStructure.SERVICE;

    constructor(
        private structureService: StructureService,
        private activatedRoute: ActivatedRoute,
        private messageService: MessageService,
        private confirmationService: ConfirmationService,
        protected fb: UntypedFormBuilder
    ) {

        this.typeStructure = this.activatedRoute.snapshot.data['typeStructure'];

        this.cols = [
            { field: 'libelleCourt', header: 'Sigle', type: 'string', filter: true, width: '10%', center: false },
            { field: 'libelleLong', header: 'Libellé', type: 'string', filter: true, width: '40%', center: false },
            { field: 'ville', header: 'Ville', type: 'string', filter: true, width: '20%', center: false },
        ];

        this.colsFilter = this.cols.map((value) => value.field);

        this.editForm = this.fb.group({
            id: [],
            libelleCourt: [null, Validators.required],
            libelleLong: [null, Validators.required],
            description: [],
            directionId: [],
            typeStructure: [],
            createdById: [],
            createdAt: [],
            updateById: [],
            UpdateAt: [],
            titreAutoriteSignataire: [null, Validators.required],
            autoriteSignataire: [null, Validators.required],
            titreHonorifiqueSignataire: [],
            typeStructureComptableId: [],
            region: [null, Validators.required],
            email: [null, [Validators.required, Validators.email]],
            ville: [null, Validators.required],
        });
    }

    ngOnInit() {
        if (this.typeStructure === TypeStructure.DIRECTION) {
            this.loadStuctures();
        } else {
            this.directionChange();
            this.loadDirections();
        }
    }

    loadDirections() {
        this.structureService.getAllDirections(TypeStructure.DIRECTION).subscribe({
            next: (resp) => {
                this.directions = resp.body || [];
            },
            error: (error) => {}
        });
    }

    onGlobalFilter(table: Table, event: Event) {
        table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
    }

    directionChange(structure?: Structure) {
        if (structure) {
            this.currentStructure = structure;
            this.loadStuctures();
        } else if (this.currentStructure) {
            this.loadStuctures();
        } else {
            this.structures = [];
            this.editForm?.reset();
        }
    }

    loadStuctures() {
        if (this.typeStructure) {
            this.structureService
                .getAllStructure(this.typeStructure, this.currentStructure?.id)
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: (resp) => {
                        this.structures = resp.body || [];
                    },
                    error: (error) => {}
                });
        }
    }

    onDisplay(structure?: Structure) {
        if (this.display) {
            this.display = false;
            this.editForm?.reset();
        } else {
            if (structure) {
                this.editForm?.patchValue(structure!);
            }

            this.display = true;
        }
    }

    saveEntity() {
        const structure = this.editForm?.getRawValue() as Structure;
        structure.typeStructure = this.typeStructure;
        if (structure.id) {
            this.structureService.updateStructure(structure).subscribe({
                next: (resp) => {
                    this.onSuccess('Modification');
                },
                error: (error) => {}
            });
        } else {
            structure.directionId = this.currentStructure?.id;
            this.structureService.createStructure(structure).subscribe({
                next: (resp) => {
                    this.onSuccess('Enregistrement');
                },
                error: (error) => {}
            });
        }
    }

    onDelete(id: string) {
        this.confirmationService.confirm({
            key: this.demandeKey,
            header: 'Confirmation',
            message: `Voulez-vous supprimer ${this.typeStructure === TypeStructure.DIRECTION ? 'la direction' : 'le service'} ?`,
            accept: () => {
                this.structureService
                    .deleteStructure(id)
                    .pipe(takeUntil(this.destroy$))
                    .subscribe({
                        next: (res) => {
                            this.loadStuctures();
                        },
                        error: (error) => {}
                    });
            }
        });
    }

    onSuccess(summary: string) {
        this.onDisplay();
        //  showToast(handleHttpSuccess('success', summary, this.demandeKey), this.messageService);
        this.loadStuctures();
    }

    ngOnDestroy() {
        this.destroy$.next(true);
        this.destroy$.unsubscribe();
    }

    protected readonly TypeStructure = TypeStructure;
}
