import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Subject, takeUntil } from 'rxjs';

import { NgPrimeModule } from '@prime-ng';
import { FormGroupColumn, TableColumn } from '../../models/generique.model';
import { HeaderPage } from '@shared/header-page/header-page';
import { AlertService } from '@shared/alert-message/alert-message.service';
import { BasePaginationComponent } from '../../shared/pagination/pagination';
import { hasAnyPermission } from '@core/auth/auth-utils';
import { AppCrudGenericComponent } from '@shared/app-crud-generic/app-crud-generic.component';
import { EntreeFaq } from './faq.model';
import { FaqService } from './faq.service';

/**
 * La foire aux questions de l'organisation.
 *
 * <p>Un référentiel de l'application, pas un réglage de l'assistant : ce qu'on écrit ici
 * s'affiche dans l'aide, et vaut pour une installation qui ne souscrira jamais au module IA.
 * L'assistant en est un lecteur supplémentaire — il reçoit les entrées publiées et y puise
 * quand une question s'en approche, au lieu d'inventer une réponse plausible.</p>
 *
 * <p>C'est ce qui explique deux choix de ce formulaire. La réponse est bornée court, parce
 * qu'elle part au fournisseur du modèle à chaque tour de conversation — au-delà, c'est un
 * document qu'il faut joindre, non le recopier. Et le rang n'est pas décoratif : la consigne de
 * l'assistant porte un plafond, et ce qui le dépasse ne lui est pas envoyé.</p>
 */
@Component({
    selector: 'app-faq',
    standalone: true,
    imports: [HeaderPage, CommonModule, AppCrudGenericComponent, NgPrimeModule],
    template: `
        <app-header-page
            [title]="pageLabel"
            [subtitle]="'Les réponses que votre organisation donne, dans l\\'aide et par l\\'assistant'"
            [breadcrumbs]="breadcrumbs"
            [buttonText]="'Nouvelle question'"
            buttonIcon="pi pi-plus"
            (actionClick)="crudGeneric.openNew()"
        />
        <div class="page-layout">
            <app-crud-generic
                #crudGeneric
                [deleteConfirmField]="'question'"
                [showAddButton]="false"
                detailLongDescription="Les réponses de votre organisation, affichées dans l'aide et reprises par l'assistant IA."
                formLongDescription="L'assistant reprendra cette réponse telle quelle : gardez-la brève."
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
export class FaqComponent extends BasePaginationComponent implements OnInit, OnDestroy {

    closeDialog = false;
    peutEcrire = false;

    readonly pageLabel = 'Foire aux questions';
    readonly formHeader = 'Création et mise à jour d\'une question';

    formGroup: UntypedFormGroup;
    formCols: FormGroupColumn[];
    tableCols: TableColumn[];

    private readonly destroy$ = new Subject<boolean>();

    breadcrumbs = [
        { label: 'Tableau de bord', routerLink: '/' },
        { label: 'Configurations', routerLink: '/configurations' },
        { label: 'Foire aux questions', routerLink: '' }
    ];

    constructor(
        protected fb: UntypedFormBuilder,
        protected messageService: MessageService,
        protected service: FaqService,
        private alertService: AlertService
    ) {
        super();

        this.formCols = [
            { field: 'id', label: '', header: 'Id', type: 'string', visible: false, required: false },
            {
                field: 'question', header: 'Question', label: 'Question',
                placeholder: 'Qui doit viser une procédure avant sa diffusion ?',
                type: 'string', visible: true, required: true
            },
            {
                field: 'reponse', header: 'Réponse', label: 'Réponse',
                placeholder: 'Le pilote du processus vise en premier, puis le responsable qualité.',
                type: 'text', visible: true, required: true
            },
            {
                field: 'fichiers', header: 'Pièces jointes', label: 'Pièces jointes',
                helpText: "Facultatif. L'assistant les signale sans les lire ; on les ouvre depuis l'aide.",
                type: 'file', visible: true, required: false
            },
            {
                field: 'publiee', header: 'Publiée', label: 'Publiée',
                helpText: "Décochez pour la retirer de l'aide et de l'assistant sans la perdre.",
                type: 'boolean', visible: true, required: false
            }
        ];

        this.tableCols = [
            { field: 'question', header: 'Question', type: 'string', filter: true },
            { field: 'publiee', header: 'Publiée', type: 'boolean', filter: false, width: '7rem' }
        ];

        this.formGroup = this.fb.group({
            id: [null],
            question: [null, Validators.required],
            reponse: [null, Validators.required],
            // Les fichiers choisis attendent ici jusqu'à l'enregistrement : une pièce ne
            // s'attache qu'à une entrée qui existe déjà.
            fichiers: [[]],
            publiee: [true]
        });
    }

    ngOnInit(): void {
        this.peutEcrire = hasAnyPermission(['faq-write', 'CONFIG_GLOBAL_MANAGE']);
        this.fetchObject();
    }

    ngOnDestroy(): void {
        this.destroy$.next(true);
        this.destroy$.complete();
    }

    fetchObject(): void {
        this.loading = true;
        this.service.findAll(this.currentPage, this.pageSize)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (entrees) => this.applyPagination(entrees),
                error: () => {
                    this.loading = false;
                    this.alertService.showError('Chargement de la foire aux questions impossible');
                }
            });
    }

    /**
     * Enregistre l'entrée, puis dépose ses pièces jointes.
     *
     * <p>Deux appels, et dans cet ordre : une pièce s'attache à une entrée qui existe, et le
     * serveur veut du multipart là où la fiche voyage en JSON. Les fichiers choisis sont donc
     * retirés de l'objet avant son envoi — ils ne font pas partie du contrat de la fiche.</p>
     *
     * <p>Un dépôt qui échoue ne perd pas la réponse : elle est déjà enregistrée, et le message
     * le dit plutôt que de laisser croire à un échec complet. C'est aussi le cas quand
     * l'installation n'a pas de serveur de fichiers — le serveur répond alors qu'il en manque
     * un, et la FAQ reste utilisable sans.</p>
     */
    onSave(entree: EntreeFaq & { fichiers?: any }): void {
        const aDeposer: File[] = Array.isArray(entree.fichiers) ? entree.fichiers : [];
        const fiche: EntreeFaq = { ...entree };
        delete (fiche as any).fichiers;

        const requete = fiche.id
            ? this.service.updateObject(fiche.id, fiche)
            : this.service.create(fiche);

        requete.pipe(takeUntil(this.destroy$)).subscribe({
            next: (enregistree: any) => {
                const id = enregistree?.data?.id ?? enregistree?.id ?? fiche.id;
                if (aDeposer.length === 0 || !id) {
                    this.onSuccess();
                    return;
                }
                this.service.joindre(id, aDeposer)
                    .pipe(takeUntil(this.destroy$))
                    .subscribe({
                        next: () => this.onSuccess(),
                        error: (erreur) => {
                            this.closeDialog = true;
                            this.fetchObject();
                            this.alertService.showError(erreur?.status === 503
                                ? 'Réponse enregistrée. Les pièces jointes demandent un serveur de fichiers, que cette installation n\'a pas configuré.'
                                : 'Réponse enregistrée, mais le dépôt des pièces jointes a échoué.');
                        }
                    });
            },
            error: () => this.alertService.showError('Enregistrement impossible')
        });
    }

    onDelete(entree: EntreeFaq): void {
        this.service.delete(entree.id!).pipe(takeUntil(this.destroy$)).subscribe({
            next: () => {
                this.alertService.showSuccess(
                    'Question supprimée. L\'assistant ne la récitera plus.');
                this.fetchObject();
            },
            error: () => this.alertService.showError('Suppression impossible')
        });
    }

    private onSuccess(): void {
        this.closeDialog = true;
        this.fetchObject();
        this.alertService.showSuccess('Opération réussie');
    }
}
