import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { MessageService } from 'primeng/api';

import { StructureService } from '../structure.service';
import { CategorieProcessusService } from '../../../../services/non-conformite/type-processus.service';
import { Structure } from '../structure.model';
import { CategorieProcessus } from '../../../../models/categore-processus.model';
import { TypeStructure } from '../../../../enums/enums';
import { FormGroupColumn } from '../../../../models/generique.model';
import { DropdownSelector } from '../../../../models/generique.model';
import { REGION_LIST } from '../../../../utils/global/global-utils';
import { FormPageComponent, QuickTip } from '../../../../shared/form-page/form-page.component';

import { HeaderPage } from '../../../../shared/header-page/header-page';
import { AlertService } from '../../../../shared/alert-message/alert-message.service';

@Component({
    selector: 'app-structure-form',
    standalone: true,
    imports: [CommonModule, FormPageComponent, HeaderPage],
    template: `
        <app-header-page 
            [title]="pageLabel" 
            [subtitle]="isEditMode ? 'Modifier les informations.' : 'Création d\\'un nouveau ' + pageLabel + '.'"
            [breadcrumbs]="breadcrumbs"
            [buttonText]="'Retour à la liste'" 
            buttonIcon="pi pi-arrow-left"
            (actionClick)="goBack()"
        />
        <div class="page-layout mt-4">
            <app-form-page
                [title]="isEditMode ? 'Modifier ' + pageLabel : 'Nouveau ' + pageLabel"
                [subtitle]="'Veuillez renseigner les informations ci-dessous pour définir l\\'identité de l\\'entité. Les champs marqués d\\'un astérisque sont obligatoires.'"
                [icon]="isEditMode ? 'pi-pencil' : 'pi-plus-circle'"
                [formGroup]="editForm!"
                [formCols]="formCols"
                [dropDownObject]="dropDownObject"
                [quickTips]="quickTips"
                [quickTipsTitle]="'Conseils rapides'"
                [submitLabel]="isEditMode ? 'Mettre à jour' : 'Enregistrer'"
                [isSubmitting]="isSubmitting"
                (onCancel)="goBack()"
                (onSubmit)="save()">
            </app-form-page>
        </div>
    `
})
export class StructureFormComponent implements OnInit, OnDestroy {
    
    destroy$: Subject<boolean> = new Subject<boolean>();
    editForm?: UntypedFormGroup;
    formCols: FormGroupColumn[] = [];
    dropDownObject: any = {};
    
    categoriesProcessus: CategorieProcessus[] = [];
    typeStructure: TypeStructure = TypeStructure.SERVICE;
    pageLabel: string = 'Service';
    isEditMode: boolean = false;
    isSubmitting: boolean = false;
    structureId?: number;
    breadcrumbs: any[] = [];

    quickTips: QuickTip[] = [
        { text: 'Renseignez un sigle court et mémorisable pour faciliter la recherche.' },
        { text: 'La sélection de la bonne catégorie de processus permet de lier correctement les non-conformités.' },
        { text: "Vérifiez l'email de l'autorité signataire : il sera utilisé pour les notifications importantes." }
    ];

    structureDataFromState: any;

    constructor(
        private fb: UntypedFormBuilder,
        private activatedRoute: ActivatedRoute,
        private router: Router,
        private structureService: StructureService,
        private categorieProcessusService: CategorieProcessusService,
        private messageService: MessageService,
        private alertService: AlertService
    ) {
        const navigation = this.router.getCurrentNavigation();
        if (navigation?.extras?.state) {
            this.structureDataFromState = navigation.extras.state['structureData'];
        }
    }

    ngOnInit() {
        this.initForm();
        this.loadCategoriesProcessus();

        this.activatedRoute.data.pipe(takeUntil(this.destroy$)).subscribe(data => {
            if (data && data['typeStructure']) {
                this.typeStructure = data['typeStructure'];
                this.pageLabel = this.typeStructure === TypeStructure.DIRECTION ? 'Direction' : 'Service';
                
                this.breadcrumbs = [
                    { label: 'Tableau de bord', routerLink: '/' },
                    { label: 'Paramétrages', routerLink: '/' },
                    { label: this.pageLabel + 's', routerLink: this.typeStructure === TypeStructure.DIRECTION ? '/direction' : '/service' }
                ];
            }
        });

        this.activatedRoute.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
            if (params['id']) {
                this.isEditMode = true;
                this.structureId = +params['id'];
                
                if (this.structureDataFromState) {
                    this.patchStructureData(this.structureDataFromState);
                } else {
                    this.loadStructureFallback(this.structureId);
                }
            }
        });
    }

    patchStructureData(structure: any) {
        console.log('=== DONNÉES REÇUES POUR MODIFICATION ===');
        console.log('Structure reçue :', structure);
        console.log('Description reçue :', structure?.description);

        if (structure) {
            // Traitement pour les objets imbriqués comme typeProcessusId
            if (structure.typeProcessusId && typeof structure.typeProcessusId === 'object') {
                 structure.typeProcessusId = structure.typeProcessusId.id || structure.typeProcessusId.value;
            }
            this.editForm?.patchValue(structure);
        }
    }

    loadStructureFallback(id: number) {
        // Fallback: chercher dans la liste complète puisqu'il n'y a pas de endpoint getById
        this.structureService.getAllStructure(this.typeStructure).pipe(takeUntil(this.destroy$)).subscribe({
            next: (res: any) => {
                const structures = res?.content || [];
                const structure = structures.find((s: any) => s.id === id || s.id === id.toString());
                if (structure) {
                    this.patchStructureData(structure);
                } else {
                    this.alertService.showError('Structure introuvable.');
                    this.goBack();
                }
            },
            error: (err) => {
                this.alertService.showError('Impossible de charger les informations.');
                this.goBack();
            }
        });
    }

    initForm() {
        this.editForm = this.fb.group({
            id: [this.structureId || null],
            libelleCourt: [null, Validators.required],
            libelleLong: [null, Validators.required],
            description: [],
            directionId: [],
            typeStructure: [this.typeStructure, Validators.required],
            createdById: [],
            createdAt: [],
            updateById: [],
            UpdateAt: [],
            titreAutoriteSignataire: [],
            autoriteSignataire: [],
            titreHonorifiqueSignataire: [],
            typeStructureComptableId: [],
            typeProcessusId: [null, Validators.required],
            region: [],
            email: [null, [Validators.required, Validators.email]],
            ville: [],
        });
    }

    buildFormCols() {
        this.dropDownObject['region'] = REGION_LIST;
        this.dropDownObject['typeProcessusId'] = this.categoriesProcessus;
        
        this.formCols = [
            { field: 'libelleCourt', header: 'Sigle', type: 'string', placeholder: "Saisissez 2 à 5 lettres en majuscules. Ex : DSI, RH", required: true, visible: true, class: 'col-12 md:col-6' },
            { field: 'libelleLong', header: 'Libellé', type: 'string', placeholder: "Ressources Humaines", required: true, visible: true, class: 'col-12 md:col-6' },
            { field: 'region', header: 'Région', type: 'dropdown', placeholder: "Sélectionnez une région", required: false, visible: true, class: 'col-12 md:col-6' },
            { field: 'ville', header: 'Ville', type: 'string', placeholder: "Saisir la ville", required: false, visible: true, class: 'col-12 md:col-6' },
            { field: 'typeProcessusId', header: 'Catégorie de processus', type: 'dropdown', placeholder: "Ce processus appartient à quelle catégorie ?", optionLabel: 'libelle', optionValue: 'id', required: true, visible: true, class: 'col-12 md:col-6' },
            
            { field: 'titreAutoriteSignataire', header: 'Titre Autorité Signataire', type: 'string', placeholder: 'Titre Autorité Signataire', required: false, visible: true, class: 'col-12 md:col-6' },
            { field: 'autoriteSignataire', header: 'Autorité Signataire', type: 'string', placeholder: 'Autorité Signataire', required: false, visible: true, class: 'col-12 md:col-6' },
            { field: 'titreHonorifiqueSignataire', header: 'Titre Honorifique Signataire', type: 'string', placeholder: 'Titre Honorifique Signataire', required: false, visible: true, class: 'col-12 md:col-6' },
            { field: 'email', header: 'Email autorité signataire', type: 'string', placeholder: 'Email', required: true, visible: true, class: 'col-12 md:col-12' },
            { field: 'description', header: 'Description', type: 'text', placeholder: 'Description...', required: false, visible: true, class: 'col-12' }
        ];
    }

    loadCategoriesProcessus() {
        this.categorieProcessusService.findAll(0, 1000).pipe(takeUntil(this.destroy$)).subscribe({
            next: (res: any) => {
                this.categoriesProcessus = res?.data?.content ?? res?.data ?? [];
                this.buildFormCols();
            }
        });
    }

    goBack() {
        const path = this.typeStructure === TypeStructure.DIRECTION ? '/direction' : '/parametrage-organigramme/processus';
        this.router.navigate([path]);
    }

    save() {
        if (this.editForm?.invalid) {
            this.editForm.markAllAsTouched();
            return;
        }

        this.isSubmitting = true;
        const structure = { ...this.editForm?.value } as Structure;
        structure.typeStructure = this.typeStructure;
        
        // Extraction de la valeur pour le dropdown typeProcessusId si c'est un tableau
        if (Array.isArray(structure.typeProcessusId) && structure.typeProcessusId.length > 0) {
            structure.typeProcessusId = structure.typeProcessusId[0];
        }

        console.log('=== DONNÉES ENVOYÉES LORS DE L\'ENREGISTREMENT ===');
        console.log('Description:', structure.description);
        console.log('Structure complète:', structure);

        const request = structure.id 
            ? this.structureService.updateStructure(structure)
            : this.structureService.createStructure(structure);
            
        request.pipe(takeUntil(this.destroy$)).subscribe({
            next: (res) => {
                this.isSubmitting = false;
                this.alertService.showSuccess('Opération réussie');
                this.goBack();
            },
            error: (error) => {
                this.isSubmitting = false;
                this.alertService.showError(error.error?.message || 'Une erreur est survenue');
            }
        });
    }

    ngOnDestroy(): void {
        this.destroy$.next(true);
        this.destroy$.unsubscribe();
    }
}
