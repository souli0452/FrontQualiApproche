import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Subject, takeUntil } from 'rxjs';

import { NgPrimeModule } from '../../../../prime-ng.module';
import { AppCrudGenericComponent } from '../../../components/app-crud-generic/app-crud-generic.component';
import { FormGroupColumn, MultiSelectSelector, TableColumn } from '../../../models/generique.model';
import { NiveauConfidentialite } from '../../../models/referentiel-document.model';
import { NiveauConfidentialiteService } from '../../../services/module-gestion-documentaire/referentiel-document.service';
import { AppRoleService } from '../../role/role-service/role.service';
import { showToast, StatusEnum } from '../../../utils/global/global-utils';
import { hasAnyPermission } from '../../../utils/auth/auth-utils';
import { AlertService } from '../../../shared/alert-message/alert-message.service';
import { HeaderPage } from '../../../shared/header-page/header-page';

/**
 * Référentiel des niveaux de confidentialité, et des rôles admis à consulter les documents qui les
 * portent.
 *
 * <p>Même forme que l'écran des types de document. Écran sensible pourtant : ce qui s'y règle
 * décide de qui voit quoi. Deux précautions en découlent — les rôles sont désignés par leur
 * <b>nom</b>, seule référence stable puisqu'un nom de rôle ne se renomme pas, et un niveau sans
 * rôle est présenté comme ne restreignant rien plutôt que de laisser croire à une protection.</p>
 */
@Component({
    selector: 'app-niveau-confidentialite',
    standalone: true,
    imports: [
        CommonModule, 
        AppCrudGenericComponent, 
        NgPrimeModule,
        HeaderPage
    ],
    providers: [
    ],
    template: `
        <app-header-page 
            [title]="pageLabel" 
            [subtitle]="'Ajoutez ou modifiez les niveaux de confidentialite des documents'"
            [breadcrumbs]="breadcrumbs"
            [buttonText]="'Niveau de confidentialite'" 
            buttonIcon="pi pi-plus"
            (actionClick)="crudGeneric.openNew()"
        />
        <div class="page-layout">
            <app-crud-generic
                #crudGeneric
                [requireRqPassword]="true"
                [deleteConfirmField]="'libelle'"
                [showAddButton]="false"
                formLongDescription="Définissez les paramètres de sécurité et d’accès pour ce niveau de confidentialité. Indiquez un libellé clair, un rang d'exposition (du moins sensible au plus critique) et sélectionnez les rôles habilités à consulter ces documents au sein de leur structure. Si aucun rôle n'est sélectionné, l'accès reste ouvert par défaut aux membres de la structure. Les champs marqués d'un astérisque sont obligatoires."
                detailLongDescription="Consultez les caractéristiques et les règles d'habilitation associées à ce niveau de confidentialité. Ce référentiel encadre la diffusion des informations sensibles au sein de votre organisation en limitant la consultation des documents aux seuls profils autorisés, garantissant ainsi la conformité de votre système de management documentaire."
                [addButtonLabel]="'Nouveau niveau'"
                [dialogWidth]="'40rem'"
                [loading]="loading"
                [pageLabel]="pageLabel"
                [tableCols]="tableCols"
                [listeObject]="dataList"
                [formGroup]="formGroup"
                [formCols]="formCols"
                [multiSelectList]="multiSelectList"
                [isAffich]="true"
                [closeDialog]="closeDialog"
                [formHeader]="formHeader"
                (newItemEvent)="onSave($event)"
                (removeEvent)="onDelete($event)"
                [isPagination]="true"
                [totalElements]="totalElements"
                [currentPage]="currentPage"
                [pageSize]="pageSize"
                (pageChangeEvent)="onPageChange($event)"
                [consultation]="!peutEcrire"
                [notModif]="!peutEcrire"
                [notDelete]="!peutEcrire">
            </app-crud-generic>
        </div>
    `
})
export class NiveauConfidentialiteComponent implements OnInit, OnDestroy {

    loading = true;
    dataList: NiveauConfidentialite[] = [];
    totalElements = 0;
    currentPage = 0;
    pageSize = 10;

    closeDialog = false;
    peutEcrire = false;

    readonly pageLabel = 'Niveaux de confidentialité des documents';
    readonly formHeader = 'Création et mise à jour d\'un niveau de confidentialité';

    formGroup: UntypedFormGroup;
    formCols: FormGroupColumn[];
    tableCols: TableColumn[];

    /** Rôles proposés au choix, servis à la liste à sélection multiple du formulaire générique. */
    multiSelectList: MultiSelectSelector[] = [];
    private readonly rolesMultiSelect: MultiSelectSelector = {
        field: 'rolesAutorises', optionLabel: 'label', multiselectEntries: []
    };

    breadcrumbs = [
        { label: 'Tableau de bord', routerLink: '/' },
        { label: 'Niveaux de confidentialité des documents', routerLink: '' }
    ];

    private readonly destroy$ = new Subject<boolean>();

    constructor(
        protected fb: UntypedFormBuilder,
        protected service: NiveauConfidentialiteService,
        private roleService: AppRoleService,
        private readonly alertService: AlertService
    ) {
        this.formCols = [
            { field: 'id', label: '', header: 'Id', type: 'string', visible: false, required: false },
            {
                field: 'libelle', label: 'Libellé (ex : Confidentiel direction)', header: 'Libellé',
                type: 'string', visible: true, required: true
            },
            {
                field: 'ordre', 
                label: 'Rang de sensibilité', 
                header: 'Rang', 
                type: 'knob', 
                min: 1, 
                max: 10,
                helpText: 'Classez du niveau le moins confidentiel (ex : 1 pour Public) au plus critique (ex : 4 ou 5 pour Confidentiel Direction).',
                visible: true, 
                required: false
            },
            {
                field: 'rolesAutorises',
                label: 'Rôles admis à consulter les documents de ce niveau, au sein des structures qui y ont déjà accès — ce choix restreint, il n\'ouvre pas : un utilisateur d\'une autre structure ne verra toujours rien sans partage. Aucun rôle : le niveau ne restreint rien',
                header: 'Rôles admis', type: 'multiselect', visible: true, required: false,
                optionLabel: 'label'
            },
            {
                field: 'description', label: 'Ce que ce niveau recouvre', header: 'Description',
                type: 'text', visible: true, required: false
            }
        ];

        this.tableCols = [
            { field: 'ordre', header: 'Rang', type: 'number', filter: false, width: '6rem' },
            { field: 'libelle', header: 'Libellé', type: 'string', filter: true },
            { field: 'rolesLibelle', header: 'Rôles admis', type: 'string', filter: true },
            { field: 'description', header: 'Description', type: 'string', filter: true }
        ];

        this.formGroup = this.fb.group({
            id: [null],
            libelle: [null, Validators.required],
            ordre: [null],
            rolesAutorises: [[]],
            description: [null]
        });
    }

    ngOnInit(): void {
        this.peutEcrire = hasAnyPermission(['niveau-confidentialite-write', 'CONFIG_GLOBAL_MANAGE']);
        this.multiSelectList.push(this.rolesMultiSelect);
        this.chargerRoles();
        this.fetchObject();
    }

    ngOnDestroy(): void {
        this.destroy$.next(true);
        this.destroy$.complete();
    }

    /**
     * Rôles disponibles, désignés par leur **nom**.
     *
     * <p>C'est le nom qui est comparé à ceux de l'utilisateur, et il est immuable une fois le rôle
     * publié — contrairement à un identifiant technique, il reste lisible dans le paramétrage.</p>
     */
    private chargerRoles(): void {
        this.roleService.getAllRoles(0, 1000).pipe(takeUntil(this.destroy$)).subscribe({
            next: (reponse: any) => {
                const roles = reponse?.data?.content ?? reponse?.data ?? [];
                this.rolesMultiSelect.multiselectEntries = (roles as any[])
                    .map((role) => ({ label: role.name ?? role.id, value: role.name ?? role.id }))
                    .filter((option) => !!option.value);
                this.multiSelectList = [...this.multiSelectList];
            },
            error: () => console.warn('Liste des rôles indisponible.')
        });
    }

    fetchObject(): void {
    this.loading = true;
    this.service.findAll(this.currentPage, this.pageSize)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
            next: (res: any) => {
                setTimeout(() => {
                    const content = res?.data?.content ?? res?.data ?? [];
                    this.dataList = (content ?? []).map((niveau: any) => ({
                        ...niveau,
                        rolesLibelle: niveau.rolesAutorises?.length
                            ? niveau.rolesAutorises.join(', ')
                            : 'Aucune restriction'
                    })) as NiveauConfidentialite[];
                    this.totalElements = res?.data?.totalElements ?? this.dataList.length;
                    this.loading = false;
                }, 500);
            },
            error: (error) => {
                this.loading = false;
                this.alertService.showError('Chargement des niveaux impossible');
            }
        });
    }

    onPageChange(event: { page: number; size: number }) {
        this.currentPage = event.page;
        this.pageSize = event.size;
        this.fetchObject();
    }

    onSave(objet: NiveauConfidentialite): void {
        const requete = objet.id
            ? this.service.updateObject(objet.id, objet)
            : this.service.create(objet);

        requete.pipe(takeUntil(this.destroy$)).subscribe({
            next: () => this.onSuccess(),
            error: (error) => this.alertService.showError('Enregistrement impossible')
        });
    }

    onDelete(objet: NiveauConfidentialite): void {
        this.service.delete(objet.id!).pipe(takeUntil(this.destroy$)).subscribe({
            next: () => {
                this.alertService.showSuccess('Suppression réussie');
                this.fetchObject();
            },
            error: (error) => this.alertService.showError('Suppression impossible')
        });
    }

    private onSuccess(): void {
        this.closeDialog = true;
        this.fetchObject();
        this.alertService.showSuccess('Opération réussie');
    }
}
