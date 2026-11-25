import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
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
import { LightboxComponent } from '@features/non-conformite/components/lightbox/lightbox';
import { enregistrerBlob } from '../../utils/fichier/apercu-fichier';
import { EntreeFaq, FichierFaq } from './faq.model';
import { FaqService } from './faq.service';

const PERMISSIONS_ADMIN_FAQ = ['faq-read', 'faq-write', 'CONFIG_READ', 'CONFIG_GLOBAL_MANAGE'];
const EXTENSIONS_IMAGES = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];

/**
 * Foire aux questions de l'organisation.
 *
 * <p>Deux usages selon les droits de l'utilisateur connecté :
 * <ul>
 *   <li>avec permission de lecture/gestion FAQ : écran d'administration complet (onglets
 *       publiées / non publiées, création, modification, publication, suppression) ;</li>
 *   <li>pour tout autre utilisateur connecté (accès depuis l'icône {@code ?}) : vue de
 *       consultation en lecture seule des réponses publiées avec recherche instantanée,
 *       aperçu d'images/PDF et téléchargement des pièces jointes.</li>
 * </ul></p>
 */
@Component({
    selector: 'app-faq',
    standalone: true,
    imports: [HeaderPage, CommonModule, FormsModule, NgPrimeModule, TableauAffichageComponent, LightboxComponent],
    providers: [ConfirmationService],
    template: `
        <div class="card-first overflow-x-clip border-none premium-hub transition-colors duration-300">
            <app-header-page
                [title]="pageLabel"
                [subtitle]="peutAdministrer
                    ? 'Les réponses de votre organisation, dans l\\'aide et par l\\'assistant'
                    : 'Réponses officielles et documents pratiques de votre organisation'"
                [breadcrumbs]="breadcrumbs"
                [buttonText]="peutAdministrer && peutEcrire ? 'Nouvelle question' : ''"
                buttonIcon="pi pi-plus"
                (actionClick)="nouvelle()"
            />

            <!-- ===============================================================
                 MODE ADMINISTRATION (utilisateurs avec faq-read / faq-write / CONFIG)
                 =============================================================== -->
            <ng-container *ngIf="peutAdministrer; else vueConsultation">
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
            </ng-container>

            <!-- ===============================================================
                 MODE CONSULTATION LECTURE SEULE (tous les utilisateurs connectés)
                 =============================================================== -->
            <ng-template #vueConsultation>
                <div class="bg-[var(--surface-card)] border border-[#dddddd] dark:border-surface-700 rounded-[5px] shadow-card p-5">
                    <div class="flex flex-wrap items-center justify-between gap-3 pb-4 mb-5 border-b border-[#dddddd]/70 dark:border-surface-700">
                        <div class="flex items-center gap-2.5">
                            <span class="w-9 h-9 rounded-[5px] bg-[#0ea5e9]/10 text-[#0084ca] dark:text-sky-400 flex items-center justify-center shrink-0">
                                <i class="pi pi-question-circle !text-base"></i>
                            </span>
                            <div>
                                <div class="text-sm font-bold text-[var(--heading-color)]">
                                    Questions fréquentes
                                    <span *ngIf="!chargementConsultation" class="ml-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-[#0ea5e9]/12 text-[#0084ca] dark:text-sky-300 tabular-nums">
                                        {{ questionsConsultables.length }}
                                    </span>
                                </div>
                                <div class="text-xs text-[var(--text-color-secondary)]">
                                    Cliquez sur une question pour lire la réponse et consulter ses documents ou images
                                </div>
                            </div>
                        </div>

                        <div class="w-full sm:w-80">
                            <p-iconfield iconPosition="left" class="w-full">
                                <p-inputicon styleClass="pi pi-search"></p-inputicon>
                                <input pInputText type="text" class="w-full"
                                       [(ngModel)]="rechercheConsultation"
                                       (ngModelChange)="filtrerConsultation()"
                                       placeholder="Rechercher une question ou un mot-clé…" />
                            </p-iconfield>
                        </div>
                    </div>

                    <div *ngIf="chargementConsultation" class="flex flex-col gap-3">
                        <p-skeleton height="3.25rem" *ngFor="let _ of [1, 2, 3, 4]"></p-skeleton>
                    </div>

                    <div *ngIf="!chargementConsultation && toutesPubliees.length === 0"
                         class="text-center py-10 px-4">
                        <i class="pi pi-question-circle text-4xl text-slate-300 dark:text-slate-600"></i>
                        <p class="text-sm font-medium text-[var(--heading-color)] mt-3 mb-1">
                            Aucune question n'a encore été publiée.
                        </p>
                        <p class="text-xs text-[var(--text-color-secondary)] m-0">
                            Les administrateurs publient les réponses officielles depuis cet espace.
                        </p>
                    </div>

                    <div *ngIf="!chargementConsultation && toutesPubliees.length > 0 && questionsConsultables.length === 0"
                         class="text-center py-10 px-4">
                        <i class="pi pi-search text-3xl text-slate-300 dark:text-slate-600"></i>
                        <p class="text-sm text-[var(--text-color-secondary)] mt-3 m-0">
                            Aucune réponse ne correspond à « {{ rechercheConsultation }} ».
                        </p>
                    </div>

                    <p-accordion *ngIf="!chargementConsultation && questionsConsultables.length > 0" [multiple]="true">
                        <p-accordion-panel *ngFor="let entree of questionsConsultables" [value]="entree.id ?? ''">
                            <p-accordion-header>
                                <div class="flex items-center justify-between gap-3 w-full pr-2 min-w-0">
                                    <span class="text-sm font-semibold text-[var(--heading-color)] text-left">{{ entree.question }}</span>
                                    <span *ngIf="entree.fichiers?.length"
                                          class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-surface-100 dark:bg-surface-800 text-[var(--text-color-secondary)] shrink-0">
                                        <i class="pi pi-paperclip !text-[10px]"></i>
                                        <span>{{ entree.fichiers?.length }}</span>
                                    </span>
                                </div>
                            </p-accordion-header>
                            <p-accordion-content>
                                <p class="text-sm text-[var(--heading-color)] whitespace-pre-line m-0 leading-relaxed">{{ entree.reponse }}</p>

                                <div *ngIf="entree.fichiers?.length" class="mt-4 pt-3 border-t border-[#dddddd]/70 dark:border-surface-700">
                                    <div class="text-[11px] font-bold text-[var(--text-color-secondary)] uppercase tracking-wide mb-2">
                                        Pièces jointes &amp; illustrations
                                    </div>
                                    <div class="flex flex-col gap-2">
                                        <div *ngFor="let fichier of entree.fichiers"
                                             class="flex flex-wrap items-center justify-between gap-2 bg-surface-50 dark:bg-surface-800/60 border border-[#dddddd]/80 dark:border-surface-700 rounded-[5px] px-3 py-2">
                                            <div class="flex items-center gap-2.5 min-w-0 flex-1">
                                                <i class="pi text-[#0084ca] dark:text-sky-400 !text-sm shrink-0"
                                                   [ngClass]="fichierEnCoursId === fichier.id ? 'pi-spin pi-spinner' : iconeFichier(fichier)"></i>
                                                <span class="text-xs font-medium text-[var(--heading-color)] truncate" [title]="fichier.nom">
                                                    {{ fichier.nom || 'Pièce jointe' }}
                                                </span>
                                            </div>
                                            <div *ngIf="fichier.id" class="flex items-center gap-1.5 shrink-0">
                                                <p-button label="Aperçu" icon="pi pi-eye" severity="info" [outlined]="true" size="small"
                                                          [disabled]="fichierEnCoursId === fichier.id"
                                                          (onClick)="ouvrirPiece(fichier, entree.question)"></p-button>
                                                <p-button icon="pi pi-download" severity="secondary" [outlined]="true" size="small"
                                                          pTooltip="Télécharger" tooltipPosition="top"
                                                          [disabled]="fichierEnCoursId === fichier.id"
                                                          (onClick)="telechargerPiece(fichier)"></p-button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </p-accordion-content>
                        </p-accordion-panel>
                    </p-accordion>
                </div>
            </ng-template>
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

        <!-- Tiroir détail en lecture (administration — Panneau Verre Givré & Cartes Suspendues) -->
        <p-drawer
            [(visible)]="detailVisible"
            position="right"
            [style]="{ width: '520px', maxWidth: 'calc(100vw - 1.5rem)' }"
            styleClass="qs-glass-drawer"
            [modal]="true">
            <ng-template pTemplate="header">
                <div class="flex items-center justify-between gap-3 flex-1 min-w-0 pr-2">
                    <div class="flex items-center gap-2.5 min-w-0">
                        <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0ea5e9]/20 to-[#0084ca]/10 border border-[#0ea5e9]/25 text-[#0084ca] dark:text-sky-400 flex items-center justify-center shrink-0 shadow-sm">
                            <i class="pi pi-question-circle !text-base"></i>
                        </div>
                        <div class="min-w-0">
                            <div class="font-bold text-[15px] text-[var(--heading-color)] truncate">Détail de la réponse</div>
                            <div class="text-xs text-[var(--text-color-secondary)] truncate">Aperçu tel qu'affiché dans l'aide</div>
                        </div>
                    </div>

                    <span *ngIf="detail"
                          class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-bold shrink-0 border"
                          [ngClass]="detail.publiee
                              ? 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                              : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'">
                        <span class="w-1.5 h-1.5 rounded-full"
                              [ngClass]="detail.publiee ? 'bg-emerald-500' : 'bg-amber-500'"></span>
                        <span>{{ detail.publiee ? 'Publiée' : 'Non publiée' }}</span>
                    </span>
                </div>
            </ng-template>

            <div *ngIf="detail" class="flex flex-col gap-3.5">
                <div class="qs-glass-card qs-glass-card--featured p-4">
                    <h3 class="text-[10.5px] font-bold text-[var(--text-color-secondary)] uppercase tracking-wider m-0 mb-1.5">
                        Question
                    </h3>
                    <p class="text-[14.5px] font-bold text-[var(--heading-color)] m-0 leading-relaxed">
                        {{ detail.question }}
                    </p>
                </div>

                <div class="qs-glass-card p-4">
                    <div class="flex items-center justify-between gap-2 mb-2">
                        <h3 class="text-[10.5px] font-bold text-[var(--text-color-secondary)] uppercase tracking-wider m-0">
                            Réponse
                        </h3>
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-[#0084ca]/10 text-[#0084ca] dark:text-sky-300 dark:bg-sky-500/15">
                            <i class="pi pi-sparkles !text-[10px]"></i>
                            <span>Reprise par l'assistant IA</span>
                        </span>
                    </div>
                    <p class="text-[13.5px] text-[var(--heading-color)] whitespace-pre-line m-0 leading-relaxed">
                        {{ detail.reponse }}
                    </p>
                </div>

                <div *ngIf="detail.fichiers?.length" class="qs-glass-card p-4">
                    <h3 class="text-[10.5px] font-bold text-[var(--text-color-secondary)] uppercase tracking-wider m-0 mb-2.5">
                        Pièces jointes &amp; illustrations ({{ detail.fichiers?.length }})
                    </h3>
                    <div class="flex flex-col gap-2">
                        <div *ngFor="let fichier of detail.fichiers"
                             class="qs-glass-file-row flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                            <div class="flex items-center gap-2.5 min-w-0 flex-1">
                                <span class="w-8 h-8 rounded-lg bg-[#0ea5e9]/12 text-[#0084ca] dark:text-sky-400 flex items-center justify-center shrink-0">
                                    <i class="pi !text-sm"
                                       [ngClass]="fichierEnCoursId === fichier.id ? 'pi-spin pi-spinner' : iconeFichier(fichier)"></i>
                                </span>
                                <span class="text-xs font-semibold text-[var(--heading-color)] truncate" [title]="fichier.nom">
                                    {{ fichier.nom }}
                                </span>
                            </div>
                            <div *ngIf="fichier.id" class="flex items-center gap-1.5 shrink-0">
                                <p-button label="Aperçu" icon="pi pi-eye" severity="info" [outlined]="true" size="small"
                                          [disabled]="fichierEnCoursId === fichier.id"
                                          (onClick)="ouvrirPiece(fichier, detail.question)"></p-button>
                                <p-button icon="pi pi-download" severity="secondary" [outlined]="true" size="small"
                                          pTooltip="Télécharger" tooltipPosition="top"
                                          [disabled]="fichierEnCoursId === fichier.id"
                                          (onClick)="telechargerPiece(fichier)"></p-button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <ng-template pTemplate="footer">
                <div *ngIf="detail" class="flex flex-wrap items-center justify-end gap-2 w-full">
                    <p-button *ngIf="!peutEcrire && !peutPublier" label="Fermer" severity="secondary" [outlined]="true" size="small"
                              (onClick)="detailVisible = false"></p-button>
                    <p-button *ngIf="peutEcrire" icon="pi pi-pencil" label="Modifier" severity="secondary" [outlined]="true" size="small"
                              styleClass="!bg-white/75 dark:!bg-slate-800/75 !border-slate-300/70 dark:!border-slate-600/60"
                              (onClick)="modifier(detail)"></p-button>
                    <p-button *ngIf="peutPublier" severity="info" size="small"
                              [icon]="detail.publiee ? 'pi pi-eye-slash' : 'pi pi-eye'"
                              [label]="detail.publiee ? 'Retirer de la publication' : 'Publier'"
                              [loading]="publicationEnCours"
                              (onClick)="basculerLaPublication(detail)"></p-button>
                </div>
            </ng-template>
        </p-drawer>

        <app-lightbox #lightbox></app-lightbox>
    `
})
export class FaqComponent extends BasePaginationComponent implements OnInit, OnDestroy {

    @ViewChild('lightbox') lightbox?: LightboxComponent;

    peutAdministrer = false;
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

    /** Mode consultation lecture seule (collaborateurs sans droit d'administration FAQ). */
    toutesPubliees: EntreeFaq[] = [];
    questionsConsultables: EntreeFaq[] = [];
    rechercheConsultation = '';
    chargementConsultation = false;

    /** Identifiant du fichier en cours de récupération pour aperçu/téléchargement. */
    fichierEnCoursId?: string;

    readonly pageLabel = 'Foire aux questions';

    // Pas de colonne « Publiée » : l'onglet actif le dit déjà, et la répéter à chaque ligne
    // n'apprendrait rien.
    tableCols: TableColumn[] = [
        { field: 'question', header: 'Question', type: 'string', filter: true }
    ];

    breadcrumbs: { label: string; routerLink: string }[] = [
        { label: 'Tableau de bord', routerLink: '/' },
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
        this.peutAdministrer = hasAnyPermission(PERMISSIONS_ADMIN_FAQ);
        this.peutEcrire = hasAnyPermission(['faq-write', 'CONFIG_GLOBAL_MANAGE']);
        this.peutPublier = hasAnyPermission(['faq-publish', 'CONFIG_GLOBAL_MANAGE']);

        if (this.peutAdministrer) {
            this.breadcrumbs = [
                { label: 'Tableau de bord', routerLink: '/' },
                { label: 'Configurations', routerLink: '/configurations' },
                { label: 'Foire aux questions', routerLink: '' }
            ];
            this.fetchObject();
            this.rafraichirLesComptes();
        } else {
            this.breadcrumbs = [
                { label: 'Tableau de bord', routerLink: '/' },
                { label: 'Foire aux questions', routerLink: '' }
            ];
            this.chargerConsultation();
        }
    }

    /** Charge les questions publiées (avec leurs pièces jointes) pour les utilisateurs standards. */
    chargerConsultation(): void {
        this.chargementConsultation = true;
        this.service.publiees()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (entrees) => {
                    this.toutesPubliees = entrees ?? [];
                    this.chargementConsultation = false;
                    this.filtrerConsultation();
                },
                error: () => {
                    this.toutesPubliees = [];
                    this.questionsConsultables = [];
                    this.chargementConsultation = false;
                    this.alertService.showError('Chargement de la foire aux questions impossible');
                }
            });
    }

    /** Filtre en direct les entrées publiées sur la question ou la réponse. */
    filtrerConsultation(): void {
        const terme = this.rechercheConsultation.trim().toLowerCase();
        if (!terme) {
            this.questionsConsultables = this.toutesPubliees;
            return;
        }
        this.questionsConsultables = this.toutesPubliees.filter((e) =>
            (e.question ?? '').toLowerCase().includes(terme)
            || (e.reponse ?? '').toLowerCase().includes(terme)
        );
    }

    /** Ouvre l'aperçu (image, PDF ou fiche de téléchargement) dans la visionneuse dédiée. */
    ouvrirPiece(fichier: FichierFaq, contexteQuestion?: string): void {
        this.chargerContenuPiece(fichier, (blob, nom) => {
            this.lightbox?.openBlob(blob, nom, contexteQuestion || nom);
        });
    }

    /** Télécharge directement la pièce jointe sur le poste. */
    telechargerPiece(fichier: FichierFaq): void {
        this.chargerContenuPiece(fichier, (blob, nom) => {
            enregistrerBlob(blob, nom);
        });
    }

    /** Retourne l'icône PrimeIcons adaptée au type de pièce jointe. */
    iconeFichier(fichier: FichierFaq): string {
        const nom = (fichier?.nom || '').toLowerCase();
        const type = (fichier?.type || '').toLowerCase();
        if (type.startsWith('image/') || EXTENSIONS_IMAGES.some((ext) => nom.endsWith(ext))) {
            return 'pi-image';
        }
        if (type === 'application/pdf' || nom.endsWith('.pdf')) {
            return 'pi-file-pdf';
        }
        if (nom.endsWith('.xls') || nom.endsWith('.xlsx')) {
            return 'pi-file-excel';
        }
        if (nom.endsWith('.doc') || nom.endsWith('.docx')) {
            return 'pi-file-word';
        }
        return 'pi-paperclip';
    }

    private chargerContenuPiece(fichier: FichierFaq, onLoaded: (blob: Blob, nom: string) => void): void {
        if (!fichier?.id || this.fichierEnCoursId === fichier.id) {
            return;
        }
        const nom = fichier.nom || 'piece-jointe';
        this.fichierEnCoursId = fichier.id;
        this.service.fichier(fichier.id)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (blob) => {
                    this.fichierEnCoursId = undefined;
                    onLoaded(blob, nom);
                },
                error: () => {
                    this.fichierEnCoursId = undefined;
                    this.alertService.showError('Impossible de charger la pièce jointe.');
                }
            });
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
            actions.push({ separator: true });
            actions.push({
                label: 'Supprimer',
                icon: 'pi pi-trash',
                styleClass: 'delete-menu-item',
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
