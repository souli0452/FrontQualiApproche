import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Subject, takeUntil } from 'rxjs';

import { NgPrimeModule } from '@prime-ng';
import { AppCrudGenericComponent } from '../../../../shared/app-crud-generic/app-crud-generic.component';
import { DropdownSelector, FormGroupColumn, TableColumn } from '../../../../models/generique.model';
import { WorkflowStepTemplate } from '@features/gestion-documentaire/models/document.model';
import { WorkflowStepTemplateService } from '../../services/workflow-step-template.service';
import { AlertService } from '../../../../shared/alert-message/alert-message.service';
import { BasePaginationComponent } from '../../../../shared/pagination/pagination';
import { hasAnyPermission } from '@core/auth/auth-utils';
import { AppRoleService } from '@features/gestion-utilisateurs/services/role.service';

/**
 * Catalogue d'étapes réutilisables entre circuits.
 *
 * <p>Même forme que l'écran des types de document : le tableau générique porte la liste, sa barre
 * de recherche, son bouton d'ajout et son formulaire.</p>
 *
 * <p>Le code n'est pas saisissable : il naît du libellé, le serveur le normalise et le fige — les
 * circuits déjà composés à partir d'une entrée en ont hérité, et le changer les désolidariserait
 * du catalogue sans que rien ne le signale. Il figure en revanche au tableau, car c'est lui qui
 * rend une même nature d'étape comparable d'un circuit à l'autre.</p>
 */
@Component({
    selector: 'app-workflow-step-template',
    standalone: true,
    imports: [CommonModule, AppCrudGenericComponent, NgPrimeModule],
    providers: [],
    template: `
        <p-toast></p-toast>
        <div class="page-layout">
            <app-crud-generic
                [addButtonLabel]="'Nouvelle étape'"
                [dialogWidth]="'40rem'"
                [loading]="loading"
                [pageLabel]="pageLabel"
                [requireRqPassword]="true"
                [deleteConfirmField]="'nomEtape'"
                [formLongDescription]="formLongDescription"
                [detailLongDescription]="detailLongDescription"
                [showItemDescriptionOnTop]="false"
                [tableCols]="tableCols"
                [listeObject]="dataList"
                [formGroup]="formGroup"
                [formCols]="formCols"
                [dropdownList]="dropdownList"
                [isAffich]="true"
                [closeDialog]="closeDialog"
                [formHeader]="formHeader"
                (newItemEvent)="onSave($event)"
                (removeEvent)="onDelete($event)"
                [isPagination]="true"
                [totalElements]="totalElements"
                [pageSize]="pageSize"
                [currentPage]="currentPage"
                (pageChangeEvent)="onPageChange($event)"
                [consultation]="!peutEcrire"
                [notModif]="!peutEcrire"
                [notDelete]="!peutEcrire">
            </app-crud-generic>
        </div>
    `
})
export class WorkflowStepTemplateComponent extends BasePaginationComponent implements OnInit, OnDestroy {

    allDataList: WorkflowStepTemplate[] = [];
    closeDialog = false;
    peutEcrire = false;

    readonly pageLabel = "Catalogue des étapes de circuit";
    readonly formHeader = "Création et mise à jour d'une étape";
    readonly formLongDescription = "Remplissez ce formulaire pour créer ou modifier un modèle d'étape réutilisable. Les circuits de validation pourront ensuite piocher dans ce catalogue pour pré-remplir leurs étapes.";
    readonly detailLongDescription = "Consultez ci-dessous les informations détaillées de ce modèle d'étape. Les modèles d'étapes permettent de standardiser les processus de validation au sein de votre organisation en réutilisant des étapes cohérentes (responsable, description, code normalisé).";

    formGroup: UntypedFormGroup;
    formCols: FormGroupColumn[];
    tableCols: TableColumn[];

    dropdownList: DropdownSelector[] = [];
    private readonly roleDropdown: DropdownSelector = { field: 'responsableRole', dropdownEntries: [] };

    private readonly destroy$ = new Subject<boolean>();

    constructor(
        protected fb: UntypedFormBuilder,
        protected messageService: MessageService,
        protected service: WorkflowStepTemplateService,
        private roleService: AppRoleService,
        private alertService: AlertService
    ) {
        super ()

        this.formCols = [
            { field: 'id', label: '', header: 'Id', type: 'string', visible: false, required: false },
            {
                field: 'nomEtape', label: "Libellé de l'étape (ex : Vérification)", header: "Nom de l'étape",
                type: 'string', visible: true, required: true
            },
            {
                field: 'responsableRole',
                label: "Rôle habilité à décider sur cette étape, et destinataire de sa notification",
                header: 'Rôle responsable', type: 'dropdown', visible: true, required: true
            },
            {
                field: 'description', label: "Ce que l'étape attend de son titulaire",
                header: 'Description', type: 'text', visible: true, required: false
            }
        ];

        this.tableCols = [
            { field: 'nomEtape', header: "Nom de l'étape", type: 'string', filter: true },
            { field: 'code', header: 'Code', type: 'string', filter: true, width: '12rem' },
            { field: 'responsableRole', header: 'Rôle responsable', type: 'string', filter: true, width: '14rem' },
            { field: 'description', header: 'Description', type: 'string', filter: true }
        ];

        this.formGroup = this.fb.group({
            id: [null],
            nomEtape: [null, Validators.required],
            responsableRole: [null, Validators.required],
            description: [null]
        });
    }

    ngOnInit(): void {
        this.peutEcrire = hasAnyPermission(['workflow-write']);
        this.dropdownList.push(this.roleDropdown);
        this.chargerRoles();
        this.fetchObject();
    }

    ngOnDestroy(): void {
        this.destroy$.next(true);
        this.destroy$.complete();
    }

    /**
     * Rôles proposés, désignés par leur **nom**.
     *
     * <p>C'est le nom qu'inscrivent les étapes des circuits, et sur son égalité exacte que reposent
     * l'habilitation à décider et la résolution des destinataires. Une entrée enregistrée avec
     * l'identifiant du rôle ne désignerait personne.</p>
     */
    private chargerRoles(): void {
        this.roleService.getAllRoles(0, 1000).pipe(takeUntil(this.destroy$)).subscribe({
            next: (reponse: any) => {
                const roles = reponse?.data?.content ?? reponse?.data ?? [];
                this.roleDropdown.dropdownEntries = (roles as any[])
                    .map((role) => ({ label: role.name ?? role.id, value: role.name ?? role.id }))
                    .filter((option) => !!option.value);
                this.dropdownList = [...this.dropdownList];
            },
            error: () => console.warn('Liste des rôles indisponible.')
        });
    }

    fetchObject(): void {
        this.loading = true;
        this.service.getAll().pipe(takeUntil(this.destroy$)).subscribe({
            next: (etapes) => {
                this.allDataList = (etapes ?? []).map((etape: any) => ({
                    ...etape,
                    libelle: etape.nomEtape
                }));
                this.totalElements = this.allDataList.length;
                this.updateDisplayedData();
                this.loading = false;
            },
            error: (error) => {
                this.loading = false;
                this.alertService.showError(error, 'Chargement des étapes impossible');
            }
        });
    }


    updateDisplayedData(): void {
        const start = this.currentPage * this.pageSize;
        this.dataList = this.allDataList.slice(start, start + this.pageSize);
    }

    // onPageChange(event: { page: number; size: number }): void {
    //     this.currentPage = event.page;
    //     this.pageSize = event.size;
    //     this.updateDisplayedData();
    // }

    onSave(objet: WorkflowStepTemplate): void {
        const requete = objet.id
            ? this.service.update(objet.id, objet)
            : this.service.create(objet);

        requete.pipe(takeUntil(this.destroy$)).subscribe({
            next: () => this.onSuccess(),
            error: (error) => this.alertService.showError(error, 'Enregistrement impossible')
        });
    }

    onDelete(objet: WorkflowStepTemplate): void {
        this.service.delete(objet.id!).pipe(takeUntil(this.destroy$)).subscribe({
            next: () => {
                this.alertService.showSuccess('Étape retirée du catalogue.', 'Suppression réussie');
                this.fetchObject();
            },
            error: (error) => this.alertService.showError(error, 'Suppression impossible')
        });
    }

    private onSuccess(): void {
        this.closeDialog = true;
        this.fetchObject();
        this.alertService.showSuccess('Opération réussie', 'Succès');
    }
}
