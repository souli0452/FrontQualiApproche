import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Subject, takeUntil } from 'rxjs';

import { NgPrimeModule } from '../../../../prime-ng.module';
import { AppCrudGenericComponent } from '../../../components/app-crud-generic/app-crud-generic.component';
import { FormGroupColumn, TableColumn } from '../../../models/generique.model';
import { DomaineApplication } from '../../../models/referentiel-document.model';
import { DomaineApplicationService } from '../../../services/module-gestion-documentaire/referentiel-document.service';
import { showToast, StatusEnum } from '../../../utils/global/global-utils';
import { hasAnyPermission } from '../../../utils/auth/auth-utils';

/**
 * Référentiel des domaines de document.
 *
 * <p>Même forme que l'écran des types de document : le tableau générique porte la liste, sa
 * barre de recherche, son bouton d'ajout et son formulaire. Un dialogue écrit à la main n'aurait
 * rien apporté qu'une seconde manière de faire la même chose.</p>
 */
@Component({
    selector: 'app-domaine-application',
    standalone: true,
    imports: [CommonModule, AppCrudGenericComponent, NgPrimeModule],
    providers: [MessageService],
    template: `
        <p-toast></p-toast>
        <div class="page-layout">
            <app-crud-generic
                [addButtonLabel]="'Nouveau domaine'"
                [dialogWidth]="'40rem'"
                [loading]="loading"
                [pageLabel]="pageLabel"
                [tableCols]="tableCols"
                [listeObject]="dataList"
                [formGroup]="formGroup"
                [formCols]="formCols"
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
export class DomaineApplicationComponent implements OnInit, OnDestroy {

    loading = true;
    dataList: DomaineApplication[] = [];
    closeDialog = false;
    peutEcrire = false;

    readonly pageLabel = "Domaines d'application";
    readonly formHeader = 'Création et mise à jour d\'une domaine';

    formGroup: UntypedFormGroup;
    formCols: FormGroupColumn[];
    tableCols: TableColumn[];

    private readonly destroy$ = new Subject<boolean>();

    constructor(
        protected fb: UntypedFormBuilder,
        protected messageService: MessageService,
        protected service: DomaineApplicationService
    ) {
        this.formCols = [
            { field: 'id', label: '', header: 'Id', type: 'string', visible: false, required: false },
            {
                field: 'libelle', label: 'Libellé (ex : Ressources humaines, Achats)', header: 'Libellé',
                type: 'string', visible: true, required: true
            },
            {
                field: 'ordre', label: 'Rang d\'affichage',
                header: 'Rang', type: 'number', visible: true, required: false
            },
            {
                field: 'description', label: 'Ce que ce domaine recouvre',
                header: 'Description', type: 'text', visible: true, required: false
            }
        ];

        this.tableCols = [
            { field: 'ordre', header: 'Rang', type: 'number', filter: false, width: '6rem' },
            { field: 'libelle', header: 'Libellé', type: 'string', filter: true },
            { field: 'description', header: 'Description', type: 'string', filter: true }
        ];

        this.formGroup = this.fb.group({
            id: [null],
            libelle: [null, Validators.required],
            ordre: [null],
            description: [null]
        });
    }

    ngOnInit(): void {
        this.peutEcrire = hasAnyPermission(['domaine-application-write', 'CONFIG_GLOBAL_MANAGE']);
        this.fetchObject();
    }

    ngOnDestroy(): void {
        this.destroy$.next(true);
        this.destroy$.complete();
    }

    fetchObject(): void {
        this.loading = true;
        this.service.liste().pipe(takeUntil(this.destroy$)).subscribe({
            next: (priorites) => {
                this.dataList = priorites ?? [];
                this.loading = false;
            },
            error: (error) => {
                this.loading = false;
                showToast(StatusEnum.error, error.status, 'Chargement des domaines impossible',
                    this.messageService, error);
            }
        });
    }

    onSave(objet: DomaineApplication): void {
        const requete = objet.id
            ? this.service.updateObject(objet.id, objet)
            : this.service.create(objet);

        requete.pipe(takeUntil(this.destroy$)).subscribe({
            next: () => this.onSuccess(),
            error: (error) => showToast(StatusEnum.error, error.status,
                'Enregistrement impossible', this.messageService, error)
        });
    }

    onDelete(objet: DomaineApplication): void {
        this.service.delete(objet.id!).pipe(takeUntil(this.destroy$)).subscribe({
            next: () => {
                this.messageService.add({
                    severity: 'success', summary: 'Supprimé',
                    // Conséquence énoncée : les documents qui la portent n'afficheront plus rien.
                    detail: 'Domaine supprimé. Les documents qui le portaient n\'en affichent plus.'
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
