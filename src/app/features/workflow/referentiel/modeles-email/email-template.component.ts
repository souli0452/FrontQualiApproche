import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Subject, takeUntil } from 'rxjs';

import { NgPrimeModule } from '@prime-ng';
import { AppCrudGenericComponent } from '@shared';
import { FormGroupColumn, TableColumn } from '../../../../models/generique.model';
import { EmailTemplateDto } from '../../../../models/workflow.model';
import { WorkflowService } from '@features/workflow';
import { hasAnyPermission } from '@core/auth';
import { BasePaginationComponent } from '../../../../shared/pagination/pagination';
import { AlertService } from '../../../../shared/alert-message/alert-message.service';

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
                [requireRqPassword]="true"
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
                [isPagination]="true"
                [totalElements]="totalElements"
                [pageSize]="pageSize"
                [currentPage]="currentPage"
                (pageChangeEvent)="onPageChange($event)"
                [notDelete]="!peutEcrire">
            </app-crud-generic>
        </div>
    `
})
export class EmailTemplateWorkflowComponent extends BasePaginationComponent implements OnInit, OnDestroy {

    // loading = true;
    // dataList: EmailTemplateDto[] = [];
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
        // protected messageService: MessageService,
        protected workflowService: WorkflowService,
        private readonly alertService: AlertService
    ) {
        super()

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
        this.workflowService.findAllEmailTemplates(this.currentPage, this.pageSize)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (res) => this.applyPagination(res),
                error: () => {
                    this.loading = false;
                    this.alertService.showError('Chargement des modèles impossible');
                }
            });
    }


    onSave(objet: EmailTemplateDto): void {
        const requete = objet.id
            ? this.workflowService.updateEmailTemplate(objet.id, objet)
            : this.workflowService.createEmailTemplate(objet);

        requete.pipe(takeUntil(this.destroy$)).subscribe({
            next: () => this.onSuccess(),
            error: (error: any) => this.alertService.showError('Enregistrement impossible')
        });
    }

    onDelete(objet: EmailTemplateDto): void {
        if (!objet.id) {
            return;
        }
        this.workflowService.deleteEmailTemplate(objet.id).pipe(takeUntil(this.destroy$)).subscribe({
            next: () => {
                this.alertService.showSuccess(`Modèle supprimé. Les étapes qui désignaient « ${objet.code} » `);
                this.fetchObject();
            },
            error: (error: any) => this.alertService.showError('Suppression impossible')
        });
    }

    private onSuccess(): void {
        this.closeDialog = true;
        this.fetchObject();
        this.alertService.showSuccess('Opération réussie');
    }
}
