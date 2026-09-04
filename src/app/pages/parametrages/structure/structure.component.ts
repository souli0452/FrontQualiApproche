import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { MessageService } from 'primeng/api';

import { Structure } from './structure.model';
import { StructureService } from './structure.service';
import { TypeStructure } from '../../../enums/enums';
import { CategorieProcessusService } from '../../../services/non-conformite/type-processus.service';
import { CategorieProcessus } from '../../../models/categore-processus.model';
import { TableColumn, FormGroupColumn, DropdownSelector } from '../../../models/generique.model';
import { REGION_LIST, showToast, StatusEnum } from '../../../utils/global/global-utils';
import { NgPrimeModule } from '../../../../prime-ng.module';
import { AppCrudGenericComponent } from '../../../components/app-crud-generic/app-crud-generic.component';
import { HeaderPage } from '../../../shared/header-page/header-page';

import { Router } from '@angular/router';
import { AlertService } from '../../../shared/alert-message/alert-message.service';

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
export class StructureComponent implements OnInit, OnDestroy {

    loading: boolean = true;
    destroy$: Subject<boolean> = new Subject<boolean>();
    readonly detailLongDescription = "Consultez ci-dessous les informations détaillées relatives à cette entité organisationnelle. Les structures définissent l'organigramme opérationnel de votre établissement et servent de socle pour l'attribution des responsabilités, la gestion des accès, ainsi que l'affectation et le suivi des non-conformités, actions et documents qualité.";
    
    structures: Structure[] = [];
    categoriesProcessus: CategorieProcessus[] = [];
    dropdownList: DropdownSelector[] = [];
    
    totalElements: number = 0;
    currentPage: number = 0;
    pageSize: number = 10;
    totalPages: number = 0;
    
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
        private categorieProcessusService: CategorieProcessusService,
        private activatedRoute: ActivatedRoute,
        private router: Router,
        private alertService: AlertService,
        
    ) {}

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

        this.loadStructures(this.currentPage, this.pageSize);
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

    loadStructures(page: number, size: number) {
        this.loading = true;
        this.structureService.getAllStructure(this.typeStructure).pipe(takeUntil(this.destroy$)).subscribe({
            next: (resp) => {
                setTimeout(() => {
                    this.structures = resp.content || [];
                    this.totalElements = resp.totalElements || this.structures.length;
                    this.loading = false;
                }, 500);
            },
            error: () => {
                this.loading = false;
            }
        });
    }

    onPageChange(event: { page: number, size: number }) {
        this.currentPage = event.page;
        this.pageSize = event.size;
        this.loadStructures(this.currentPage, this.pageSize);
    }

    onSuccess(res?: any) {
        this.alertService.showSuccess('Opération réussie');
        this.loadStructures(this.currentPage, this.pageSize);
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
