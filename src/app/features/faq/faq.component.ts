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
        <div class="card-first overflow-x-clip border-none premium-hub transition-colors duration-300">
            <app-header-page
                [title]="pageLabel"
                [subtitle]="'Les réponses de votre organisation, dans l\\'aide et par l\\'assistant'"
                [breadcrumbs]="breadcrumbs"
                [buttonText]="peutEcrire ? 'Nouvelle question' : ''"
                buttonIcon="pi pi-plus"
                (actionClick)="nouvelle()"
            />

            <!-- Onglets Publiées / Non publiées -->
            <div class="bg-transparent mb-5">
                <p-tabs [value]="onglet" (valueChange)="changerDOnglet($event)">
                    <p-tablist>
                        <p-tab value="publiees">
                            <div class="flex items-center gap-2 px-2 py-1 select-none">
                                <i class="pi pi-eye"></i>
                                <span class="whitespace-nowrap">Publiées</span>
                                <p-badge *ngIf="comptePubliees > 0" [value]="comptePubliees" severity="success"></p-badge>
                            </div>
                        </p-tab>
                        <p-tab value="nonPubliees">
                            <div class="flex items-center gap-2 px-2 py-1 select-none">
                                <i class="pi pi-eye-slash"></i>
                                <span class="whitespace-nowrap">Non publiées</span>
                                <p-badge *ngIf="compteNonPubliees > 0" [value]="compteNonPubliees" severity="warn"></p-badge>
                            </div>
                        </p-tab>
                    </p-tablist>
                </p-tabs>
            </div>

            <!-- Barre d'action de lot (affichée uniquement lorsqu'au moins une ligne est cochée) -->
            <div *ngIf="selection.length > 0"
                 class="flex flex-wrap items-center justify-between gap-3 mb-4 px-4 py-2.5 rounded-[5px] border border-[#0ea5e9]/35 bg-[#0ea5e9]/10 dark:bg-[#0ea5e9]/15">
                <span class="text-[13px] font-semibold text-[#0369a1] dark:text-sky-300 flex items-center gap-2">
                    <i class="pi pi-check-square text-[#0ea5e9] !text-sm"></i>
                    <span>{{ selection.length }} réponse(s) sélectionnée(s)</span>
                </span>
                <div class="flex items-center gap-2">
                    <p-button label="Tout décocher" severity="secondary" [outlined]="true" size="small"
                              styleClass="!bg-[var(--surface-card)] !border-[#dddddd] dark:!border-surface-700"
                              (onClick)="viderLaSelection()"></p-button>
                    <p-button severity="info" size="small"
                              [icon]="onglet === 'publiees' ? 'pi pi-eye-slash' : 'pi pi-eye'"
                              [label]="onglet === 'publiees' ? 'Retirer de la publication' : 'Publier'"
                              [loading]="publicationEnCours"
                              (onClick)="publierLaSelection()"></p-button>
                </div>
            </div>

            <!-- Tableau unifié -->
            <app-tableau-affichage
                [title]="onglet === 'publiees' ? 'Questions publiées' : 'Questions non publiées'"
                [titleIcon]="onglet === 'publiees' ? 'pi pi-eye' : 'pi pi-eye-slash'"
                [subtitle]="onglet === 'publiees' ? 'Réponses visibles dans l\\'aide et reprises par l\\'assistant IA' : 'Brouillons en attente de relecture ou de publication'"
                [badgeCount]="totalElements"
                [selectionMultiple]="peutPublier"
                [lignesSelectionnees]="selection"
                (selectionChange)="selection = $event"
                [tableCols]="tableCols"
                [minWidth]="'36rem'"
                [listeObject]="dataList"
                [loading]="loading"
                [loadingRows]="pageSize"
                [showTopBar]="true"
                [showSearch]="true"
                placeholderRecherche="Rechercher une question…"
                [clickableRows]="true"
                [isPagination]="true"
                [totalElements]="totalElements"
                [pageSize]="pageSize"
                [currentPage]="currentPage"
                recordName="questions"
                [getActionMenuItems]="actionsDeLaLigne"
                (rowClick)="voirLeDetail($event)"
                (pageChangeEvent)="onPageChange($event)">
            </app-tableau-affichage>
        </div>

        <!-- Confirmation centrée harmonisée -->
        <p-confirmdialog
            #cd
            key="faq-delete"
            appendTo="body"
            maskStyleClass="backdrop-blur-sm"
            [closable]="false"
            [draggable]="false"
            [style]="{ width: '440px', maxWidth: '92vw' }"
            styleClass="border-none bg-transparent shadow-none">
            <ng-template pTemplate="headless" let-message>
                <div class="p-6 bg-[var(--surface-card)] border border-[#dddddd] dark:border-surface-700 rounded-[5px] shadow-2xl flex flex-col items-center text-center whitespace-normal">
                    <div class="w-14 h-14 rounded-full flex items-center justify-center mb-3.5 ring-8 bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 ring-rose-50/70 dark:ring-rose-950/30">
                        <i class="pi !text-2xl" [ngClass]="message.icon || 'pi-trash'"></i>
                    </div>
                    <h3 class="text-[17px] font-bold text-[var(--heading-color)] m-0 mb-1.5">
                        {{ message.header || 'Confirmation' }}
                    </h3>
                    <p class="text-[13px] text-[var(--text-color-secondary)] m-0 leading-relaxed px-1">
                        {{ message.message }}
                    </p>
                    <div class="w-full border-t border-[#dddddd]/70 dark:border-surface-700 my-4"></div>
                    <div class="flex items-center justify-center gap-3 w-full">
                        <button type="button" pButton
                                [label]="message.rejectLabel || 'Annuler'"
                                class="p-button-outlined p-button-secondary p-button-sm flex-1 justify-center rounded-[5px]"
                                (click)="cd.onReject()">
                        </button>
                        <button type="button" pButton
                                [label]="message.acceptLabel || 'Supprimer'"
                                icon="pi pi-trash"
                                class="p-button-danger p-button-sm flex-1 justify-center rounded-[5px]"
                                (click)="cd.onAccept()">
                        </button>
                    </div>
                </div>
            </ng-template>
        </p-confirmdialog>

        <!-- Tiroir détail en lecture -->
        <p-drawer [(visible)]="detailVisible" position="right" [style]="{ width: '520px', maxWidth: '100vw' }" [modal]="true">
            <ng-template pTemplate="header">
                <div class="flex items-center gap-2.5">
                    <div class="w-9 h-9 rounded-[5px] bg-[#0ea5e9]/10 text-[#0084ca] dark:text-sky-400 flex items-center justify-center shrink-0">
                        <i class="pi pi-question-circle !text-base"></i>
                    </div>
                    <div>
                        <div class="font-bold text-[15px] text-[var(--heading-color)]">Détail de la réponse</div>
                        <div class="text-xs text-[var(--text-color-secondary)]">Aperçu tel qu'affiché dans l'aide</div>
                    </div>
                </div>
            </ng-template>

            <div *ngIf="detail" class="flex flex-col gap-4 pt-1">
                <div class="flex items-center justify-between gap-2">
                    <p-tag [severity]="detail.publiee ? 'success' : 'warn'"
                           [rounded]="true"
                           [value]="detail.publiee ? 'Publiée' : 'Non publiée'"></p-tag>
                </div>

                <div class="rounded-[5px] border border-[#dddddd] dark:border-surface-700 bg-[var(--surface-card)] p-4">
                    <h3 class="text-[11px] font-bold text-[var(--text-color-secondary)] uppercase tracking-wide m-0 mb-1.5">Question</h3>
                    <p class="text-sm font-semibold text-[var(--heading-color)] m-0 leading-relaxed">{{ detail.question }}</p>
                </div>

                <div class="rounded-[5px] border border-[#dddddd] dark:border-surface-700 bg-[var(--surface-card)] p-4">
                    <h3 class="text-[11px] font-bold text-[var(--text-color-secondary)] uppercase tracking-wide m-0 mb-1.5">Réponse</h3>
                    <p class="text-sm text-[var(--heading-color)] whitespace-pre-line m-0 leading-relaxed">{{ detail.reponse }}</p>
                </div>

                <div *ngIf="detail.fichiers?.length" class="rounded-[5px] border border-[#dddddd] dark:border-surface-700 bg-[var(--surface-card)] p-4">
                    <h3 class="text-[11px] font-bold text-[var(--text-color-secondary)] uppercase tracking-wide m-0 mb-2">Pièces jointes</h3>
                    <div class="flex flex-col gap-2">
                        <div *ngFor="let fichier of detail.fichiers"
                             class="flex items-center gap-2.5 bg-surface-50 dark:bg-surface-800/60 border border-[#dddddd]/80 dark:border-surface-700 rounded-[5px] px-3 py-2">
                            <i class="pi pi-paperclip text-[#0084ca] dark:text-sky-400 !text-sm shrink-0"></i>
                            <span class="flex-1 min-w-0 text-xs font-medium text-[var(--heading-color)] truncate">{{ fichier.nom }}</span>
                        </div>
                    </div>
                </div>

                <div class="flex flex-wrap justify-end gap-2 pt-3 border-t border-[#dddddd]/70 dark:border-surface-700">
                    <p-button *ngIf="peutEcrire" icon="pi pi-pencil" label="Modifier" severity="secondary" [outlined]="true" size="small"
                              styleClass="!bg-[var(--surface-card)] !border-[#dddddd] dark:!border-surface-700"
                              (onClick)="modifier(detail)"></p-button>
                    <p-button *ngIf="peutPublier" severity="info" size="small"
                              [icon]="detail.publiee ? 'pi pi-eye-slash' : 'pi pi-eye'"
                              [label]="detail.publiee ? 'Retirer de la publication' : 'Publier'"
                              [loading]="publicationEnCours"
                              (onClick)="basculerLaPublication(detail)"></p-button>
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
            key: 'faq-delete',
            header: 'Supprimer cette question ?',
            message: `« ${entree.question} » disparaîtra de l'aide, et l'assistant cessera de la réciter.`,
            icon: 'pi-trash',
            acceptLabel: 'Supprimer',
            rejectLabel: 'Annuler',
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
