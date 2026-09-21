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
                detailLongDescription="La foire aux questions rassemble les réponses propres à votre organisation : procédures internes, usages maison, questions récurrentes. Elle s'affiche dans l'aide de l'application. L'assistant IA la reçoit également : interrogé sur un sujet qu'elle couvre, il répond avec vos mots plutôt que d'inventer."
                formLongDescription="Rédigez une réponse qui se suffit à elle-même : l'assistant la reprendra telle quelle. Gardez-la brève — un texte long part au modèle à chaque question posée. Le rang décide de l'ordre d'affichage, et de ce qui est transmis en premier à l'assistant. Une entrée non publiée reste en base sans être ni affichée ni récitée."
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
                field: 'question', label: 'La question, dans les mots de celui qui la pose',
                helpText: "Formulez-la comme un utilisateur la poserait. C'est sur ces mots que l'assistant reconnaîtra qu'une question s'en approche.",
                placeholder: 'Exemple : Qui doit viser une procédure avant sa diffusion ?',
                header: 'Question', type: 'string', visible: true, required: true
            },
            {
                field: 'reponse', label: 'La réponse, telle qu\'elle doit être donnée',
                helpText: "L'assistant la reprendra sans la reformuler. Gardez-la brève : ce texte part au modèle à chaque question posée. Au-delà de quelques phrases, joignez plutôt le document.",
                placeholder: 'Exemple : Le pilote du processus vise en premier, puis le responsable qualité.',
                header: 'Réponse', type: 'text', visible: true, required: true
            },
            {
                field: 'categorie', label: 'Rubrique de l\'aide',
                helpText: "Le regroupement sous lequel la question apparaît dans l'aide. Laissez vide si aucune rubrique ne s'impose.",
                placeholder: 'Exemple : Documents', header: 'Rubrique',
                type: 'string', visible: true, required: false, class: 'md:col-6'
            },
            {
                field: 'rang', label: 'Ordre d\'affichage',
                helpText: "Les plus petits rangs s'affichent en premier, et sont transmis en premier à l'assistant. Ce qui compte le plus se place en tête.",
                placeholder: '0', header: 'Rang',
                type: 'number', min: 0, visible: true, required: false, class: 'md:col-6'
            },
            {
                field: 'publiee', label: 'Publiée',
                helpText: "Une entrée publiée s'affiche dans l'aide et est récitée par l'assistant. Décochez pour la retirer sans la perdre, le temps d'une révision.",
                header: 'Publiée', type: 'boolean', visible: true, required: false, class: 'md:col-6'
            }
        ];

        this.tableCols = [
            { field: 'rang', header: 'Rang', type: 'number', filter: false, width: '5rem' },
            { field: 'question', header: 'Question', type: 'string', filter: true },
            { field: 'categorie', header: 'Rubrique', type: 'string', filter: true, width: '12rem' },
            { field: 'publiee', header: 'Publiée', type: 'boolean', filter: false, width: '7rem' }
        ];

        this.formGroup = this.fb.group({
            id: [null],
            question: [null, Validators.required],
            reponse: [null, Validators.required],
            categorie: [null],
            rang: [0],
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

    onSave(entree: EntreeFaq): void {
        const requete = entree.id
            ? this.service.updateObject(entree.id, entree)
            : this.service.create(entree);

        requete.pipe(takeUntil(this.destroy$)).subscribe({
            next: () => this.onSuccess(),
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
