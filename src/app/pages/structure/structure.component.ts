import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Table } from 'primeng/table';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { StructureService } from './structure-service';
import { GlobalSearchService } from '../../services/global-search.service';
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
import { MenuItem } from 'primeng/api';
import { MenuModule } from 'primeng/menu';
@Component({
    selector: 'app-structure',
    templateUrl: './structure.component.html',
    styleUrl: './structure.component.scss',
    standalone: true,
    imports:[
        CommonModule,
        NgPrimeModule,
        CreationComponent,
        MenuModule
    ]
})
export class StructureComponent implements OnInit, OnDestroy {
    actionMenuItems: MenuItem[] = [];
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
    loading: boolean = false;
    typeStructure: TypeStructure = TypeStructure.SERVICE;

    @ViewChild('dt') table!: Table;

    constructor(
        private structureService: StructureService,
        private globalSearchService: GlobalSearchService,
        private activatedRoute: ActivatedRoute,
        private messageService: MessageService,
        private confirmationService: ConfirmationService,
        protected fb: UntypedFormBuilder
    ) {

        this.typeStructure = this.activatedRoute.snapshot.data['typeStructure'];

        this.cols = [
            { field: 'libelleCourt', header: 'Sigle', type: 'string', filter: true, width: '10%', center: false },
            { field: 'libelleLong', header: 'Libellé', type: 'string', filter: true, width: '40%', center: false },
            { field: 'ville', header: 'Ville', type: 'string', filter: true, width: '20%', center: false }
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
    ngOnDestroy(): void {
        this.destroy$.next(true);
        this.destroy$.complete();
    }

    ngOnInit() {
        if (this.typeStructure === TypeStructure.DIRECTION) {
            this.loadStuctures();
        } else {
            this.directionChange();
            this.loadDirections();
        }

        // Écouter la barre de recherche globale
        this.globalSearchService.searchQuery$
            .pipe(takeUntil(this.destroy$))
            .subscribe(query => {
                if (this.table) {
                    this.table.filterGlobal(query, 'contains');
                }
            });
    }

    loadDirections() {
        this.loading = true;
        this.structureService.getAllDirections(TypeStructure.DIRECTION).subscribe({
            next: (resp) => {
                this.directions = resp.body || [];
                this.loading = false;
            },
            error: (error) => {
                this.loading = false;
            }
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
            this.loading = true;
            this.structureService
                .getAllStructure(this.typeStructure, this.currentStructure?.id)
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: (resp) => {
                        this.structures = resp.body || [];
                        this.loading = false;
                    },
                    error: (error) => {
                        this.loading = false;
                    }
                });
        }
    }

    onDisplay(structure?: Structure) {
        if (this.display) {
            this.display = false;
            this.editForm?.reset();
        } else {
            // AJOUT: On vide toujours le formulaire avant d'ouvrir le tiroir !
            this.editForm?.reset(); 
            
            if (structure) {
                this.editForm?.patchValue(structure!);
            }
            this.display = true;
        }
    }


    saveEntity() {
        const structure = this.editForm?.getRawValue() as Structure;
        structure.typeStructure = this.typeStructure;
        console.log("Tentative d'enregistrement de :", structure);
        if (structure.id) {
            this.structureService.updateStructure(structure).subscribe({
                next: (resp) => {
                    console.log("Succès de la modification :", resp);
                    this.onSuccess('Modification');
                },
                error: (error) => {
                    console.error("ERREUR lors de la modification :", error);
                }
            });
        } else {
            structure.directionId = this.currentStructure?.id;
            this.structureService.createStructure(structure).subscribe({
                next: (resp) => {
                    console.log("Succès de la création :", resp);
                    this.onSuccess('Enregistrement');
                },
                error: (error) => {
                    console.error("ERREUR lors de la création :", error);
                }
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
        //showToast(handleHttpSuccess('success', summary, this.demandeKey), this.messageService);
        this.loadStuctures();
    }

    setActionMenu(event: any, menu: any, rowData: any) {
        this.actionMenuItems = [
            {
                label: 'Modifier',
                icon: 'pi pi-pencil',
                styleClass: 'text-black-500 menu-style',
                command: () => this.onDisplay(rowData)
            },
            {
                label: 'Supprimer',
                icon: 'pi pi-trash',
                styleClass: 'text-red-500 menu-style',
                command: () => this.onDelete(rowData.id)
            }
        ];
        menu.toggle(event);
    }

    protected readonly TypeStructure = TypeStructure;
}
