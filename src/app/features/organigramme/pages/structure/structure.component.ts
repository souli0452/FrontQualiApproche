import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UntypedFormGroup } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { Structure } from '../../models/structure.model';
import { StructureService } from '../../services/structure.service';
import { CategorieProcessus } from '../../models/categorie-processus.model';
import { TableColumn, FormGroupColumn, DropdownSelector } from '../../../../models/generique.model';
import { NgPrimeModule } from '../../../../../prime-ng.module';
import { HeaderPage } from '../../../../shared/header-page/header-page';

import { Router } from '@angular/router';
import { AlertService } from '../../../../shared/alert-message/alert-message.service';
import { BasePaginationComponent } from '../../../../shared/pagination/pagination';
import { TypeStructure } from '@core/enums/type-structure.enum';
import { AppCrudGenericComponent } from '@shared/app-crud-generic/app-crud-generic.component';

@Component({
    selector: 'app-structure',
    standalone: true,
    imports: [
        CommonModule,
        NgPrimeModule,
        AppCrudGenericComponent,
        HeaderPage
    ],
    template: `
        <app-header-page
            [title]="pageLabel"
            [subtitle]="'Ajoutez ou modifiez les ' + pageLabel + 's.'"
            [breadcrumbs]="breadcrumbs"
            [buttonText]="'Nouveau ' + pageLabel"
            buttonIcon="pi pi-plus"
            (actionClick)="onAjoutDemande()"
        />
        <div class="page-layout">
            <div class="card-first overflow-hidden border-none premium-hub transition-colors duration-300">
                <app-crud-generic #crudGeneric
                    [showAddButton]="false"
                    [requireRqPassword]="true"
                    [detailLongDescription]="detailLongDescription"
                    [showItemDescriptionOnTop]="false"
                    [notModif]="true"
                    [asRoleEdit]="true"
                    [customButtons]="customButtons"
                    (customActionEvent)="onCustomAction($event)"
                    [loading]="loading"
                    [pageLabel]="pageLabel"
                    [tableCols]="tableCols"
                    [listeObject]="structures"
                    [isAffich]="true"
                    [totalElements]="totalElements"
                    [isPagination]="true"
                    [currentPage]="currentPage"
                    [pageSize]="pageSize"
                    (pageChangeEvent)="onPageChange($event)"
                    (removeEvent)="onDelete($event)">
                </app-crud-generic>
            </div>
        </div>
    `
})
export class StructureComponent extends BasePaginationComponent implements OnInit, OnDestroy {

    destroy$: Subject<boolean> = new Subject<boolean>();
    readonly detailLongDescription = "Consultez ci-dessous les informations détaillées relatives à cette entité organisationnelle. Les structures définissent l'organigramme opérationnel de votre établissement et servent de socle pour l'attribution des responsabilités, la gestion des accès, ainsi que l'affectation et le suivi des non-conformités, actions et documents qualité.";

    structures: Structure[] = [];
    categoriesProcessus: CategorieProcessus[] = [];
    dropdownList: DropdownSelector[] = [];

    editForm?: UntypedFormGroup;
    closeDialog: boolean = false;

    pageLabel: string = 'Structure';
    typeStructure: TypeStructure = TypeStructure.SERVICE;

    protected readonly TypeStructure = TypeStructure;

    tableCols: TableColumn[] = [
        { field: 'libelleCourt', header: 'Sigle', type: 'string', filter: true, width: '10%' },
        { field: 'libelleLong', header: 'Libellé', type: 'string', filter: true, width: '30%' },
        { field: 'typeProcessusLibelle', header: 'Catégorie', type: 'string', filter: true, width: '20%' },
        { field: 'ville', header: 'Ville', type: 'string', filter: true, width: '12%' },
        { field: 'email', header: 'Email', type: 'string', filter: true, width: '20%' }
    ];

    formCols: FormGroupColumn[] = [];

    constructor(
        private structureService: StructureService,
        private activatedRoute: ActivatedRoute,
        private router: Router,
        private alertService: AlertService,
    ) { super() }

    breadcrumbs = [
        { label: 'Tableau de bord', routerLink: '/' },
        { label: 'Paramétrages', routerLink: '/parametrage-organigramme/processus' }
    ];

    customButtons = [
        { label: 'Modifier', icon: 'pi pi-pencil', action: 'edit_page' }
    ];

    ngOnInit() {
        this.activatedRoute.data.pipe(takeUntil(this.destroy$)).subscribe(data => {
            if (data && data['typeStructure']) {
                this.typeStructure = data['typeStructure'];
                this.pageLabel = this.typeStructure === TypeStructure.DIRECTION ? 'Direction' : 'Processus';

                this.breadcrumbs = [
                    { label: 'Tableau de bord', routerLink: '/' },
                    { label: 'Categories', routerLink: '/parametrage-organigramme/categorie-processus' },
                    { label: this.pageLabel + 's', routerLink: this.typeStructure === TypeStructure.DIRECTION ? '/parametrage-organigramme/direction' : '/parametrage-organigramme/processus' }
                ];
            }
        });

        this.fetchObject();
    }

    onAjoutDemande() {
        const path = this.typeStructure === TypeStructure.DIRECTION ? '/parametrage-organigramme/direction/create' : '/parametrage-organigramme/processus/create';
        this.router.navigate([path]);
    }

    onCustomAction(event: any) {
        if (event.action === 'edit_page') {
            const structure = event.user;
            const path = this.typeStructure === TypeStructure.DIRECTION ? `/parametrage-organigramme/direction/edit/${structure.id}` : `/parametrage-organigramme/processus/edit/${structure.id}`;
            this.router.navigate([path], { state: { structureData: structure } });
        }
    }

    fetchObject() {
        this.loading = true;
        this.structureService.getAllStructure(this.typeStructure, undefined, this.currentPage, this.pageSize)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (resp: any) => {
                    this.structures = resp?.content || [];
                    this.applyPagination(resp);
                },
                error: () => {
                    this.loading = false;
                }
            });
    }

    onSuccess(res?: any) {
        this.alertService.showSuccess('Opération réussie');
        this.fetchObject()
    }

    onDelete(structure: Structure) {
        this.structureService.deleteStructure(structure.id!).pipe(takeUntil(this.destroy$)).subscribe({
            next: (res) => this.onSuccess(res),
            error: (error) => this.alertService.showError(error.error?.message || 'Erreur lors de la suppression')
        });
    }

    ngOnDestroy(): void {
        this.destroy$.next(true);
        this.destroy$.unsubscribe();
    }
}
