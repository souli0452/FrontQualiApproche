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
    imports: [CommonModule, AppCrudGenericComponent, NgPrimeModule],
    providers: [MessageService],
    template: `
        <p-toast></p-toast>
        <div class="page-layout">
            <app-crud-generic
                [addButtonLabel]="'Nouveau niveau'"
                [dialogWidth]="'42rem'"
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
                [isPagination]="false"
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

    private readonly destroy$ = new Subject<boolean>();

    constructor(
        protected fb: UntypedFormBuilder,
        protected messageService: MessageService,
        protected service: NiveauConfidentialiteService,
        private roleService: AppRoleService
    ) {
        this.formCols = [
            { field: 'id', label: '', header: 'Id', type: 'string', visible: false, required: false },
            {
                field: 'libelle', label: 'Libellé (ex : Confidentiel direction)', header: 'Libellé',
                type: 'string', visible: true, required: true
            },
            {
                field: 'ordre', label: 'Rang, du moins sensible au plus sensible', header: 'Rang',
                type: 'number', visible: true, required: false
            },
            {
                field: 'rolesAutorises',
                label: 'Rôles admis à consulter les documents de ce niveau — aucun rôle : le niveau ne restreint rien',
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
        this.service.liste().pipe(takeUntil(this.destroy$)).subscribe({
            next: (niveaux) => {
                // Le tableau lit la valeur brute du champ : la liste des rôles est aplatie ici, et
                // « Aucune restriction » remplace la case vide, qui se lirait comme une donnée
                // manquante alors qu'elle est une absence voulue.
                this.dataList = (niveaux ?? []).map((niveau) => ({
                    ...niveau,
                    rolesLibelle: niveau.rolesAutorises?.length
                        ? niveau.rolesAutorises.join(', ')
                        : 'Aucune restriction'
                })) as NiveauConfidentialite[];
                this.loading = false;
            },
            error: (error) => {
                this.loading = false;
                showToast(StatusEnum.error, error.status, 'Chargement des niveaux impossible',
                    this.messageService, error);
            }
        });
    }

    onSave(objet: NiveauConfidentialite): void {
        const requete = objet.id
            ? this.service.updateObject(objet.id, objet)
            : this.service.create(objet);

        requete.pipe(takeUntil(this.destroy$)).subscribe({
            next: () => this.onSuccess(),
            error: (error) => showToast(StatusEnum.error, error.status,
                'Enregistrement impossible', this.messageService, error)
        });
    }

    onDelete(objet: NiveauConfidentialite): void {
        this.service.delete(objet.id!).pipe(takeUntil(this.destroy$)).subscribe({
            next: () => {
                this.messageService.add({
                    severity: 'success', summary: 'Supprimé',
                    // Conséquence énoncée : la restriction disparaît avec le niveau.
                    detail: 'Niveau supprimé. Les documents qui le portaient redeviennent visibles '
                        + 'de toute leur structure.'
                });
                this.fetchObject();
            },
            error: (error) => showToast(StatusEnum.error, error.status,
                'Suppression impossible', this.messageService, error)
        });
    }

    private onSuccess(): void {
        this.closeDialog = true;
        this.fetchObject();
        this.messageService.add({ severity: 'success', summary: 'Succès', detail: 'Opération réussie' });
    }
}
