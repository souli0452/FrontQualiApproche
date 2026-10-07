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

            <!-- La barre d'action de lot n'apparaît qu'une fois quelque chose de coché : une
                 barre toujours présente et le plus souvent inerte encombre sans servir. -->
            <div *ngIf="selection.length > 0"
                 class="flex items-center justify-between gap-3 mb-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                <span class="text-sm text-slate-700">
                    {{ selection.length }} réponse(s) sélectionnée(s)
                </span>
                <div class="flex items-center gap-2">
                    <button pButton pRipple class="p-button-text p-button-secondary" label="Tout décocher"
                            (click)="viderLaSelection()"></button>
                    <button pButton pRipple
                            [icon]="onglet === 'publiees' ? 'pi pi-eye-slash' : 'pi pi-eye'"
                            [label]="onglet === 'publiees' ? 'Retirer de la publication' : 'Publier'"
                            [loading]="publicationEnCours"
                            (click)="publierLaSelection()"></button>
                </div>
            </div>

            <app-tableau-affichage
                [selectionMultiple]="peutPublier"
                [lignesSelectionnees]="selection"
                (selectionChange)="selection = $event"
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
                (rowClick)="voirLeDetail($event)"
                (pageChangeEvent)="onPageChange($event)">
            </app-tableau-affichage>
        </div>
        <p-confirmdialog></p-confirmdialog>

        <!-- Le détail en lecture : on ouvre pour relire une réponse avant de la publier, sans
             entrer en modification et risquer de la changer par mégarde. -->
        <p-drawer [(visible)]="detailVisible" position="right" [style]="{width: '520px'}" [modal]="true">
            <ng-template pTemplate="header">
                <div class="inline-flex items-center gap-2">
                    <i class="pi pi-question-circle text-primary"></i>
                    <span class="layout-topbar-title"><span>Détail de la réponse</span></span>
                </div>
            </ng-template>

            <div *ngIf="detail" class="flex flex-col gap-4">
                <div>
                    <h3 class="text-xs font-bold text-slate-500 uppercase tracking-wide m-0 mb-2">Question</h3>
                    <p class="text-sm font-medium text-slate-800 m-0">{{ detail.question }}</p>
                </div>

                <div>
                    <h3 class="text-xs font-bold text-slate-500 uppercase tracking-wide m-0 mb-2">Réponse</h3>
                    <p class="text-sm text-slate-700 whitespace-pre-line m-0">{{ detail.reponse }}</p>
                </div>

                <div *ngIf="detail.fichiers?.length">
                    <h3 class="text-xs font-bold text-slate-500 uppercase tracking-wide m-0 mb-2">Pièces jointes</h3>
                    <div class="flex flex-col gap-2">
                        <div *ngFor="let fichier of detail.fichiers"
                             class="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                            <i class="pi pi-paperclip text-indigo-500 text-sm"></i>
                            <span class="flex-1 min-w-0 text-xs text-slate-700 truncate">{{ fichier.nom }}</span>
                        </div>
                    </div>
                </div>

                <div class="flex items-center gap-2">
                    <p-tag [severity]="detail.publiee ? 'success' : 'warn'"
                           [value]="detail.publiee ? 'Publiée' : 'Non publiée'"></p-tag>
                </div>

                <div class="flex flex-wrap gap-2 pt-2 border-t border-slate-200">
                    <button *ngIf="peutPublier" pButton pRipple
                            [icon]="detail.publiee ? 'pi pi-eye-slash' : 'pi pi-eye'"
                            [label]="detail.publiee ? 'Retirer de la publication' : 'Publier'"
                            [loading]="publicationEnCours"
                            (click)="basculerLaPublication(detail)"></button>
                    <button *ngIf="peutEcrire" pButton pRipple class="p-button-outlined"
                            icon="pi pi-pencil" label="Modifier"
                            (click)="modifier(detail)"></button>
                </div>
            </div>
        </p-drawer>
    `
})
export class FaqComponent extends BasePaginationComponent implements OnInit, OnDestroy {

    peutEcrire = false;

    /** L'onglet actif. On arrive sur les publiées : c'est ce qu'on vient voir. */
    onglet: 'publiees' | 'nonPubliees' = 'publiees';
    comptePubliees = 0;
    compteNonPubliees = 0;

    /** Décider de ce qui paraît est un droit distinct de celui d'écrire. */
    peutPublier = false;
    /** Les lignes cochées, pour la publication en lot. */
    selection: EntreeFaq[] = [];
    publicationEnCours = false;

    detailVisible = false;
    detail?: EntreeFaq;

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
        this.peutPublier = hasAnyPermission(['faq-publish', 'CONFIG_GLOBAL_MANAGE']);
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
        // Ce qui était coché appartenait à l'autre onglet : le garder ferait agir sur des lignes
        // qu'on ne voit plus.
        this.viderLaSelection();
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
     * Ouvre le détail d'une réponse, en lecture.
     *
     * <p>On relit avant de publier, et entrer en modification pour cela ferait courir le risque
     * de changer par mégarde ce qu'on venait seulement vérifier. Le détail est demandé au
     * serveur : la liste ne porte pas les pièces jointes.</p>
     */
    voirLeDetail(entree: EntreeFaq): void {
        if (!entree?.id) {
            return;
        }
        this.detail = entree;
        this.detailVisible = true;
        this.service.getById(entree.id)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (complete) => this.detail = complete,
                error: () => undefined
            });
    }

    viderLaSelection(): void {
        this.selection = [];
    }

    /**
     * Publie ou retire de la publication les lignes cochées.
     *
     * <p>Le sens de l'action suit l'onglet : on ne publie pas depuis les publiées. Cela évite un
     * troisième bouton, et surtout le contresens de croire qu'on retire ce qu'on ouvre.</p>
     */
    publierLaSelection(): void {
        const ids = this.selection.map((entree) => entree.id).filter((id): id is string => !!id);
        if (ids.length === 0 || this.publicationEnCours) {
            return;
        }
        const publier = this.onglet === 'nonPubliees';
        this.appliquerLaPublication(ids, publier,
            publier ? `${ids.length} réponse(s) publiée(s).`
                    : `${ids.length} réponse(s) retirée(s) de la publication.`);
    }

    /** Publie ou retire une seule réponse, depuis son détail. */
    basculerLaPublication(entree: EntreeFaq): void {
        if (!entree?.id) {
            return;
        }
        const publier = !entree.publiee;
        this.appliquerLaPublication([entree.id], publier,
            publier ? 'Réponse publiée.' : 'Réponse retirée de la publication.');
    }

    private appliquerLaPublication(ids: string[], publiee: boolean, message: string): void {
        this.publicationEnCours = true;
        this.service.publier(ids, publiee)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: () => {
                    this.publicationEnCours = false;
                    this.detailVisible = false;
                    this.viderLaSelection();
                    this.alertService.showSuccess(message);
                    // Les deux comptes changent, et la page courante aussi : ce qui vient d'être
                    // publié a quitté l'onglet où on le voyait.
                    this.fetchObject();
                    this.rafraichirLesComptes();
                },
                error: () => {
                    this.publicationEnCours = false;
                    this.alertService.showError('La publication a échoué.');
                }
            });
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
            label: 'Voir le détail',
            icon: 'pi pi-eye',
            command: () => this.voirLeDetail(entree)
        }];

        if (this.peutPublier) {
            actions.push({
                label: entree.publiee ? 'Retirer de la publication' : 'Publier',
                icon: entree.publiee ? 'pi pi-eye-slash' : 'pi pi-check-circle',
                command: () => this.basculerLaPublication(entree)
            });
        }

        if (this.peutEcrire) {
            actions.push({
                label: 'Modifier',
                icon: 'pi pi-pencil',
                command: () => this.modifier(entree)
            });
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
