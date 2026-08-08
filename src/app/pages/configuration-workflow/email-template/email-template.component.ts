import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Subject, takeUntil } from 'rxjs';

import { NgPrimeModule } from '../../../../prime-ng.module';
import { AppCrudGenericComponent } from '../../../components/app-crud-generic/app-crud-generic.component';
import { FormGroupColumn, TableColumn } from '../../../models/generique.model';
import { EmailTemplateDto } from '../../../models/workflow.model';
import { WorkflowService } from '../../../services/workflow.service';
import { showToast, StatusEnum } from '../../../utils/global/global-utils';
import { hasAnyPermission } from '../../../utils/auth/auth-utils';

/**
 * Modèles d'e-mail des circuits de validation.
 *
 * <p>Même forme que l'écran des types de document : le tableau générique porte la liste, sa barre
 * de recherche, son bouton d'ajout et son formulaire. Le tableau, la recherche locale et le
 * dialogue écrits à la main disparaissent — ils refaisaient, en moins bien, ce que le composant
 * partagé fait déjà.</p>
 */
@Component({
    selector: 'app-email-template',
    standalone: true,
    imports: [CommonModule, AppCrudGenericComponent, NgPrimeModule],
    providers: [MessageService],
    template: `
        <p-toast></p-toast>
        <div class="page-layout">
            <app-crud-generic
                [addButtonLabel]="'Nouveau modèle'"
                [dialogWidth]="'46rem'"
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
export class EmailTemplateWorkflowComponent implements OnInit, OnDestroy {

    loading = true;
    dataList: EmailTemplateDto[] = [];
    closeDialog = false;
    peutEcrire = false;

    readonly pageLabel = "Modèles d'e-mail des circuits";
    readonly formHeader = "Création et mise à jour d'un modèle d'e-mail";

    formGroup: UntypedFormGroup;
    formCols: FormGroupColumn[];
    tableCols: TableColumn[];

    private readonly destroy$ = new Subject<boolean>();

    constructor(
        protected fb: UntypedFormBuilder,
        protected messageService: MessageService,
        protected workflowService: WorkflowService
    ) {
        this.formCols = [
            { field: 'id', label: '', header: 'Id', type: 'string', visible: false, required: false },
            {
                // C'est ce code que désignent les étapes des circuits (`emailTemplateCode`) : le
                // changer prive de notification celles qui s'y réfèrent, sans que rien ne le dise.
                field: 'code', label: 'Code désigné par les étapes (ex : validationRq)', header: 'Code',
                type: 'string', visible: true, required: true
            },
            {
                field: 'subject',
                label: "Objet de l'e-mail — {numeroNc} y insère la référence du dossier",
                header: 'Objet', type: 'string', visible: true, required: true
            },
            {
                field: 'description', label: 'À quoi sert ce modèle', header: 'Description',
                type: 'string', visible: true, required: false
            },
            {
                // Les variables s'écrivent entre accolades ; une variable absente s'efface du
                // message. La liste est celle que le moteur fournit à chaque étape.
                field: 'body',
                label: 'Corps du message — variables : {numeroNc} {fullName} {link} {observation} {etape}',
                header: 'Corps', type: 'text', visible: true, required: true
            }
        ];

        this.tableCols = [
            { field: 'code', header: 'Code', type: 'string', filter: true, width: '14rem' },
            { field: 'subject', header: 'Objet', type: 'string', filter: true },
            { field: 'description', header: 'Description', type: 'string', filter: true }
        ];

        this.formGroup = this.fb.group({
            id: [null],
            code: [null, Validators.required],
            subject: [null, Validators.required],
            description: [null],
            body: [null, Validators.required]
        });
    }

    ngOnInit(): void {
        this.peutEcrire = hasAnyPermission(['workflow-write']);
        this.fetchObject();
    }

    ngOnDestroy(): void {
        this.destroy$.next(true);
        this.destroy$.complete();
    }

    fetchObject(): void {
        this.loading = true;
        this.workflowService.getAllEmailTemplates().pipe(takeUntil(this.destroy$)).subscribe({
            next: (modeles) => {
                this.dataList = modeles ?? [];
                this.loading = false;
            },
            error: (error: any) => {
                this.loading = false;
                showToast(StatusEnum.error, error.status, 'Chargement des modèles impossible',
                    this.messageService, error);
            }
        });
    }

    onSave(objet: EmailTemplateDto): void {
        const requete = objet.id
            ? this.workflowService.updateEmailTemplate(objet.id, objet)
            : this.workflowService.createEmailTemplate(objet);

        requete.pipe(takeUntil(this.destroy$)).subscribe({
            next: () => this.onSuccess(),
            error: (error: any) => showToast(StatusEnum.error, error.status,
                'Enregistrement impossible', this.messageService, error)
        });
    }

    onDelete(objet: EmailTemplateDto): void {
        if (!objet.id) {
            return;
        }
        this.workflowService.deleteEmailTemplate(objet.id).pipe(takeUntil(this.destroy$)).subscribe({
            next: () => {
                this.messageService.add({
                    severity: 'success', summary: 'Supprimé',
                    // Conséquence énoncée : une étape qui désignait ce code ne notifiera plus.
                    detail: `Modèle supprimé. Les étapes qui désignaient « ${objet.code} » `
                        + 'ne notifieront plus personne.'
                });
                this.fetchObject();
            },
            error: (error: any) => showToast(StatusEnum.error, error.status,
                'Suppression impossible', this.messageService, error)
        });
    }

    private onSuccess(): void {
        this.closeDialog = true;
        this.fetchObject();
        this.messageService.add({ severity: 'success', summary: 'Succès', detail: 'Opération réussie' });
    }
}
