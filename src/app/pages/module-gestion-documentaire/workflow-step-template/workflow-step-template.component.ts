import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Subject, takeUntil } from 'rxjs';

import { NgPrimeModule } from '../../../../prime-ng.module';
import { AppCrudGenericComponent } from '../../../components/app-crud-generic/app-crud-generic.component';
import { DropdownSelector, FormGroupColumn, TableColumn } from '../../../models/generique.model';
import { WorkflowStepTemplate } from '../../../models/gestion-documentaire.model';
import { WorkflowStepTemplateService } from '../../../services/module-gestion-documentaire/workflow-step-template.service';
import { AppRoleService } from '../../role/role-service/role.service';
import { showToast, StatusEnum } from '../../../utils/global/global-utils';
import { hasAnyPermission } from '../../../utils/auth/auth-utils';

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
    providers: [MessageService],
    template: `
        <p-toast></p-toast>
        <div class="page-layout">
            <app-crud-generic
                [addButtonLabel]="'Nouvelle étape'"
                [dialogWidth]="'40rem'"
                [loading]="loading"
                [pageLabel]="pageLabel"
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
                [isPagination]="false"
                [consultation]="!peutEcrire"
                [notModif]="!peutEcrire"
                [notDelete]="!peutEcrire">
            </app-crud-generic>
        </div>
    `
})
export class WorkflowStepTemplateComponent implements OnInit, OnDestroy {

    loading = true;
    dataList: WorkflowStepTemplate[] = [];
    closeDialog = false;
    peutEcrire = false;

    readonly pageLabel = "Catalogue des étapes de circuit";
    readonly formHeader = "Création et mise à jour d'une étape";

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
        private roleService: AppRoleService
    ) {
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
                this.dataList = etapes ?? [];
                this.loading = false;
            },
            error: (error) => {
                this.loading = false;
                showToast(StatusEnum.error, error.status, 'Chargement des étapes impossible',
                    this.messageService, error);
            }
        });
    }

    onSave(objet: WorkflowStepTemplate): void {
        const requete = objet.id
            ? this.service.update(objet.id, objet)
            : this.service.create(objet);

        requete.pipe(takeUntil(this.destroy$)).subscribe({
            next: () => this.onSuccess(),
            error: (error) => showToast(StatusEnum.error, error.status,
                'Enregistrement impossible', this.messageService, error)
        });
    }

    onDelete(objet: WorkflowStepTemplate): void {
        this.service.delete(objet.id!).pipe(takeUntil(this.destroy$)).subscribe({
            next: () => {
                this.messageService.add({
                    severity: 'success', summary: 'Supprimé',
                    // Les circuits déjà composés gardent leur étape : ils en ont reçu une copie.
                    detail: 'Étape retirée du catalogue. Les circuits déjà composés la conservent.'
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
