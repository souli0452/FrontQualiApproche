import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import { NgPrimeModule } from '@prime-ng';
import { EntreeFaq, FichierFaq } from './faq.model';
import { FaqService } from './faq.service';

/** Une rubrique de l'aide et les questions qu'elle regroupe. */
interface Rubrique {
    titre: string;
    entrees: EntreeFaq[];
}

/**
 * L'aide : les réponses que l'organisation a écrites, en lecture seule.
 *
 * <p>Pendant nécessaire de l'écran de configuration. Sans elle, la FAQ existait en base, servie
 * par un point d'entrée ouvert à tous, et personne ne pouvait la lire : l'écran d'administration
 * est réservé à qui l'écrit, et l'assistant IA demande un module souscrit, une permission et un
 * fournisseur qui répond. Un agent cherchant qui vise une procédure n'avait donc aucun moyen
 * d'atteindre la réponse que son organisation avait pourtant rédigée.</p>
 *
 * <p>Elle ne dépend pas de l'assistant, et c'est délibéré : une organisation sans module IA, ou
 * dont le forfait est épuisé, doit lire ses propres réponses. L'assistant est un confort
 * par-dessus ; l'aide est le socle. C'est aussi ici qu'aboutit la promesse qu'il fait déjà quand
 * une réponse porte un document — « ouvrez-le depuis l'aide ».</p>
 */
@Component({
    selector: 'app-aide-faq',
    standalone: true,
    imports: [CommonModule, FormsModule, NgPrimeModule],
    template: `
        <div class="flex flex-col h-full">
            <div class="px-1 pb-3">
                <p-iconfield iconPosition="left" class="w-full">
                    <p-inputicon styleClass="pi pi-search"></p-inputicon>
                    <input pInputText type="text" class="w-full" [(ngModel)]="recherche"
                           (ngModelChange)="filtrer()"
                           placeholder="Chercher une question, un mot de la réponse…" />
                </p-iconfield>
            </div>

            <div class="flex-1 min-h-0 overflow-y-auto px-1">
                <!-- Chargement -->
                <div *ngIf="chargement" class="flex flex-col gap-3 pt-2">
                    <p-skeleton height="3rem" *ngFor="let _ of [1,2,3,4]"></p-skeleton>
                </div>

                <!-- Rien du tout : la FAQ n'a pas encore été écrite -->
                <div *ngIf="!chargement && toutes.length === 0" class="text-center py-8 px-4">
                    <i class="pi pi-question-circle text-4xl text-slate-300"></i>
                    <p class="text-sm text-slate-600 mt-3 mb-1">Aucune question n'a encore été publiée.</p>
                    <p class="text-xs text-slate-500 m-0">
                        Les administrateurs les écrivent depuis Configurations, Foire aux questions.
                    </p>
                </div>

                <!-- La recherche ne rend rien -->
                <div *ngIf="!chargement && toutes.length > 0 && rubriques.length === 0"
                     class="text-center py-8 px-4">
                    <i class="pi pi-search text-3xl text-slate-300"></i>
                    <p class="text-sm text-slate-600 mt-3 m-0">
                        Aucune réponse ne correspond à « {{ recherche }} ».
                    </p>
                </div>

                <!-- Les réponses, groupées par rubrique -->
                <div *ngFor="let rubrique of rubriques" class="mb-4">
                    <h3 class="text-xs font-bold text-slate-500 uppercase tracking-wide m-0 mb-2 px-1">
                        {{ rubrique.titre }}
                    </h3>
                    <p-accordion [multiple]="true">
                        <p-accordion-panel *ngFor="let entree of rubrique.entrees" [value]="entree.id ?? ''">
                            <p-accordion-header>
                                <span class="text-sm font-medium text-slate-800">{{ entree.question }}</span>
                            </p-accordion-header>
                            <p-accordion-content>
                                <p class="text-sm text-slate-700 whitespace-pre-line m-0">{{ entree.reponse }}</p>

                                <!-- Les pièces jointes : c'est ici qu'elles deviennent utiles.
                                     L'assistant sait les nommer, il ne sait pas les ouvrir. -->
                                <div *ngIf="entree.fichiers?.length" class="mt-3 flex flex-col gap-2">
                                    <button *ngFor="let fichier of entree.fichiers" type="button"
                                        class="flex items-center gap-2 text-left bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 cursor-pointer transition-colors disabled:opacity-60"
                                        [disabled]="enCours === fichier.id"
                                        (click)="telecharger(fichier)">
                                        <i class="pi text-indigo-500"
                                           [ngClass]="enCours === fichier.id ? 'pi-spin pi-spinner' : 'pi-paperclip'"></i>
                                        <span class="flex-1 min-w-0 text-xs text-slate-700 truncate"
                                              [title]="fichier.nom">{{ fichier.nom }}</span>
                                        <i class="pi pi-download text-slate-400 text-xs"
                                           *ngIf="enCours !== fichier.id"></i>
                                    </button>
                                </div>
                            </p-accordion-content>
                        </p-accordion-panel>
                    </p-accordion>
                </div>
            </div>
        </div>
    `
})
export class AideFaqComponent implements OnInit, OnDestroy {

    /** Rubrique de repli : une question sans rubrique reste lisible, elle ne disparaît pas. */
    private static readonly SANS_RUBRIQUE = 'Questions générales';

    toutes: EntreeFaq[] = [];
    rubriques: Rubrique[] = [];
    recherche = '';
    chargement = true;
    /** Identifiant de la pièce en cours de téléchargement : son bouton attend plutôt que doubler. */
    enCours?: string;

    private readonly destroy$ = new Subject<boolean>();

    constructor(private readonly service: FaqService) {}

    ngOnInit(): void {
        this.service.publiees()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (entrees) => {
                    this.toutes = entrees ?? [];
                    this.chargement = false;
                    this.filtrer();
                },
                // Une aide qui ne se charge pas ne doit pas afficher d'erreur alarmante : elle
                // se présente vide, avec le message qui dit où les réponses s'écrivent.
                error: () => {
                    this.toutes = [];
                    this.chargement = false;
                    this.filtrer();
                }
            });
    }

    ngOnDestroy(): void {
        this.destroy$.next(true);
        this.destroy$.complete();
    }

    /**
     * Regroupe les réponses par rubrique, en ne gardant que celles qui répondent à la recherche.
     *
     * <p>La recherche porte sur la question <b>et</b> sur la réponse : on cherche souvent avec un
     * mot du contenu — « visa », « délai » — plutôt qu'avec la formulation exacte du titre.</p>
     */
    filtrer(): void {
        const terme = this.recherche.trim().toLowerCase();
        const retenues = terme
            ? this.toutes.filter((entree) =>
                (entree.question ?? '').toLowerCase().includes(terme)
                || (entree.reponse ?? '').toLowerCase().includes(terme))
            : this.toutes;

        const parRubrique = new Map<string, EntreeFaq[]>();
        retenues.forEach((entree) => {
            const titre = entree.categorie?.trim() || AideFaqComponent.SANS_RUBRIQUE;
            const groupe = parRubrique.get(titre) ?? [];
            groupe.push(entree);
            parRubrique.set(titre, groupe);
        });

        // L'ordre des rubriques suit celui des entrées, qui vient du serveur : le rang décidé par
        // l'administrateur se retrouve donc à l'écran, et ce n'est pas un tri alphabétique qui le
        // défait.
        this.rubriques = Array.from(parRubrique.entries())
            .map(([titre, entrees]) => ({ titre, entrees }));
    }

    /**
     * Enregistre une pièce jointe.
     *
     * <p>Le contenu passe par le serveur, qui vérifie d'abord à qui appartient l'entrée : la
     * référence de stockage ne sort jamais, sous peine d'ouvrir le dépôt entier.</p>
     */
    telecharger(fichier: FichierFaq): void {
        if (!fichier.id || this.enCours) {
            return;
        }
        this.enCours = fichier.id;
        this.service.fichier(fichier.id)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (contenu) => {
                    this.enCours = undefined;
                    const url = window.URL.createObjectURL(contenu);
                    const lien = document.createElement('a');
                    lien.href = url;
                    lien.download = fichier.nom || 'piece-jointe';
                    lien.click();
                    setTimeout(() => window.URL.revokeObjectURL(url), 100);
                },
                error: () => {
                    this.enCours = undefined;
                }
            });
    }
}
