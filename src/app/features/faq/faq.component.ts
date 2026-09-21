import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { Subject, takeUntil } from 'rxjs';

import { NgPrimeModule } from '@prime-ng';
import { TableColumn } from '../../models/generique.model';
import { HeaderPage } from '@shared/header-page/header-page';
import { AlertService } from '@shared/alert-message/alert-message.service';
import { TableauAffichageComponent } from '@shared/tableau-affichage/tableau-affichage';
import { BasePaginationComponent } from '../../shared/pagination/pagination';
import { hasAnyPermission } from '@core/auth/auth-utils';
import { EntreeFaq } from './faq.model';
import { FaqService } from './faq.service';

/**
 * La liste des questions de l'organisation.
 *
 * <p>La saisie se fait en pleine page et non dans un dialogue : ce qu'on y écrit s'affiche dans
 * l'aide et sera repris mot pour mot par l'assistant IA, ce qui mérite un écran où l'on voit ce
 * qu'on fait. Cet écran ne garde donc que la liste et ses actions.</p>
 */
@Component({
    selector: 'app-faq',
    standalone: true,
    imports: [HeaderPage, CommonModule, NgPrimeModule, TableauAffichageComponent],
    providers: [ConfirmationService],
    template: `
        <app-header-page
            [title]="pageLabel"
            [subtitle]="'Les réponses de votre organisation, dans l\\'aide et par l\\'assistant'"
            [breadcrumbs]="breadcrumbs"
            [buttonText]="peutEcrire ? 'Nouvelle question' : ''"
            buttonIcon="pi pi-plus"
            (actionClick)="nouvelle()"
        />
        <div class="page-layout">
            <!-- Deux onglets plutôt qu'une colonne « Publiée » à trier : on vient voir l'un ou
                 l'autre, pas les deux mêlés. Les brouillons attendent une relecture, les publiées
                 sont en service — ce sont deux travaux distincts. -->
            <p-tabs [value]="onglet" (valueChange)="changerDOnglet($event)">
                <p-tablist>
                    <p-tab value="publiees">
                        <i class="pi pi-eye mr-2"></i>Publiées
                        <p-badge *ngIf="comptePubliees > 0" [value]="comptePubliees" severity="success" styleClass="ml-2"></p-badge>
                    </p-tab>
                    <p-tab value="nonPubliees">
                        <i class="pi pi-eye-slash mr-2"></i>Non publiées
                        <p-badge *ngIf="compteNonPubliees > 0" [value]="compteNonPubliees" severity="warn" styleClass="ml-2"></p-badge>
                    </p-tab>
                </p-tablist>
            </p-tabs>

            <app-tableau-affichage
                [tableCols]="tableCols"
                [listeObject]="dataList"
                [loading]="loading"
                [showSearch]="true"
                [clickableRows]="true"
                [isPagination]="true"
                [totalElements]="totalElements"
                [pageSize]="pageSize"
                [currentPage]="currentPage"
                [getActionMenuItems]="actionsDeLaLigne"
                (rowClick)="modifier($event)"
                (pageChangeEvent)="onPageChange($event)">
            </app-tableau-affichage>
        </div>
        <p-confirmdialog></p-confirmdialog>
    `
})
export class FaqComponent extends BasePaginationComponent implements OnInit, OnDestroy {

    peutEcrire = false;

    /** L'onglet actif. On arrive sur les publiées : c'est ce qu'on vient voir. */
    onglet: 'publiees' | 'nonPubliees' = 'publiees';
    comptePubliees = 0;
    compteNonPubliees = 0;

    readonly pageLabel = 'Foire aux questions';

    // Pas de colonne « Publiée » : l'onglet actif le dit déjà, et la répéter à chaque ligne
    // n'apprendrait rien.
    tableCols: TableColumn[] = [
        { field: 'question', header: 'Question', type: 'string', filter: true }
    ];

    breadcrumbs = [
        { label: 'Tableau de bord', routerLink: '/' },
        { label: 'Configurations', routerLink: '/configurations' },
        { label: 'Foire aux questions', routerLink: '' }
    ];

    private readonly destroy$ = new Subject<boolean>();

    constructor(
        private readonly service: FaqService,
        private readonly router: Router,
        private readonly confirmation: ConfirmationService,
        private readonly alertService: AlertService
    ) {
        super();
    }

    ngOnInit(): void {
        this.peutEcrire = hasAnyPermission(['faq-write', 'CONFIG_GLOBAL_MANAGE']);
        this.fetchObject();
        this.rafraichirLesComptes();
    }

    /**
     * Change d'onglet et repart de la première page.
     *
     * <p>Rester à la page courante montrerait une liste vide dès que l'autre onglet en compte
     * moins — on chercherait alors ce qui n'a jamais manqué.</p>
     */
    changerDOnglet(valeur: any): void {
        const onglet = valeur === 'nonPubliees' ? 'nonPubliees' : 'publiees';
        if (onglet === this.onglet) {
            return;
        }
        this.onglet = onglet;
        this.currentPage = 0;
        this.fetchObject();
    }

    private rafraichirLesComptes(): void {
        this.service.comptes()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (comptes) => {
                    this.comptePubliees = comptes.publiees ?? 0;
                    this.compteNonPubliees = comptes.nonPubliees ?? 0;
                },
                // Un compte indisponible n'empêche pas de travailler : les onglets restent, sans
                // leur pastille.
                error: () => undefined
            });
    }

    ngOnDestroy(): void {
        this.destroy$.next(true);
        this.destroy$.complete();
    }

    fetchObject(): void {
        this.loading = true;
        this.service.page(this.onglet === 'publiees', this.currentPage, this.pageSize)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (entrees) => this.applyPagination(entrees),
                error: () => {
                    this.loading = false;
                    this.alertService.showError('Chargement de la foire aux questions impossible');
                }
            });
    }

    nouvelle(): void {
        this.router.navigate(['/faq/nouvelle']);
    }

    modifier(entree: EntreeFaq): void {
        if (entree?.id) {
            this.router.navigate(['/faq/modifier', entree.id]);
        }
    }

    /**
     * Les actions d'une ligne.
     *
     * <p>La suppression demande confirmation, et le message nomme la conséquence : l'assistant
     * cesse de réciter cette réponse. Une entrée qu'on voulait seulement suspendre se dépublie
     * depuis la fiche, sans rien perdre.</p>
     */
    readonly actionsDeLaLigne = (entree: EntreeFaq): MenuItem[] => {
        const actions: MenuItem[] = [{
            label: this.peutEcrire ? 'Modifier' : 'Consulter',
            icon: this.peutEcrire ? 'pi pi-pencil' : 'pi pi-eye',
            command: () => this.modifier(entree)
        }];

        if (this.peutEcrire) {
            actions.push({
                label: 'Supprimer',
                icon: 'pi pi-trash',
                command: () => this.confirmerSuppression(entree)
            });
        }
        return actions;
    };

    private confirmerSuppression(entree: EntreeFaq): void {
        this.confirmation.confirm({
            header: 'Supprimer cette question ?',
            message: `« ${entree.question} » disparaîtra de l'aide, et l'assistant cessera de la réciter.`,
            acceptLabel: 'Supprimer',
            rejectLabel: 'Annuler',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => this.supprimer(entree)
        });
    }

    private supprimer(entree: EntreeFaq): void {
        this.service.delete(entree.id!)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: () => {
                    this.alertService.showSuccess('Question supprimée.');
                    this.fetchObject();
                    this.rafraichirLesComptes();
                },
                error: () => this.alertService.showError('Suppression impossible')
            });
    }
}
