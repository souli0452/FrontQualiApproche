import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

import { currentUserState } from '../../services/auth-services/auth.state';
import { getCurrentUserStructure } from '../../utils/global/global-utils';
import { ActionsRapidesComponent } from './components/actions-rapides.component';
import { IndicateursComponent } from './components/indicateurs.component';
import { EtatDeLaListe, MesDecisionsComponent } from './components/mes-decisions.component';

/**
 * Accueil : ce qu'on attend de vous, et ce que vous pouvez entreprendre.
 *
 * <p>Cette page présentait des graphiques de non-conformités — par processus, par niveau, par mois.
 * Deux choses les condamnaient. D'abord ils ne s'affichaient plus : le chargement des données avait
 * été mis en commentaire, et chacun rendait un cadre vide. Ensuite, ils étaient les mêmes pour tout
 * le monde : un agent d'un service qui n'a pas souscrit au module des non-conformités y voyait des
 * cadres vides, et un pilote n'y trouvait aucun de ses dossiers en attente.</p>
 *
 * <p>Une page d'accueil de système qualité doit répondre à une question et une seule : <b>qu'attend-on
 * de moi ?</b> D'où deux blocs, tous deux réglés sur le module souscrit et les permissions détenues :
 * les dossiers arrêtés en attente d'une décision de cette personne, avec de quoi la prendre sur
 * place, puis les gestes qu'elle peut entreprendre.</p>
 *
 * <p>Les statistiques ne sont pas perdues : chaque module a la sienne, sur son propre écran, où elle
 * porte sur un périmètre que le lecteur connaît.</p>
 */
@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CommonModule, MesDecisionsComponent, ActionsRapidesComponent, IndicateursComponent],
    template: `
        <div class="flex flex-col gap-6">

            <!-- Salutation et synthèse : la phrase dit tout de suite s'il y a lieu d'agir. -->
            <div class="card mb-0">
                <div class="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 class="text-xl font-bold m-0">Bonjour {{ nom }}</h1>
                        <p class="m-0 mt-1 text-surface-500">
                            {{ synthese }}
                            @if (structure) {
                                <span class="text-surface-400"> · {{ structure }}</span>
                            }
                        </p>
                    </div>
                </div>
            </div>

            <!-- Indicateurs : ce qui attend et ce qui est en retard, nourris par les listes que la
                 section suivante charge — un seul appel par source, deux nombres qui ne peuvent
                 donc pas différer. -->
            <app-indicateurs
                [enAttente]="connu ? etat!.total : null"
                [plansEnRetard]="connu ? etat!.plansEnRetard : null"
                [plansEcheanceProche]="connu ? etat!.plansEcheanceProche : null"
                [suitDesActions]="!!etat?.suitDesActions"></app-indicateurs>

            <!-- Ce qu'on attend de vous. Rien ne s'affiche si aucun module suivi par un circuit
                 n'est accessible : l'accueil se réduit alors aux actions rapides. -->
            <app-mes-decisions (etat)="etat = $event"></app-mes-decisions>

            <div>
                <h2 class="text-base font-semibold mb-3">Que souhaitez-vous faire ?</h2>
                <app-actions-rapides></app-actions-rapides>
            </div>
        </div>
    `
})
export class Dashboard {

    /**
     * Ce que la liste de travail a trouvé.
     *
     * <p>Reçu d'elle, et non lu à travers elle : la synthèse et les indicateurs se dessinent avant,
     * et interroger un composant qui n'existe pas encore aurait donné un premier rendu faux.</p>
     */
    etat?: EtatDeLaListe;

    /** Les nombres veulent-ils déjà dire quelque chose ? */
    get connu(): boolean {
        return !!this.etat && !this.etat.chargement;
    }

    /** Nom de la personne connectée, tel qu'on l'appelle. */
    readonly nom: string;
    readonly structure: string;

    constructor() {
        // Les deux formes de la réponse d'authentification sont acceptées : le nom figure tantôt à
        // la racine, tantôt sous `user`. N'en lire qu'une donnait un « Bonjour » sans personne.
        const racine: any = currentUserState.value ?? {};
        const utilisateur: any = racine.user ?? {};
        const prenom = racine.firstName || utilisateur.firstName || '';
        const patronyme = racine.lastName || utilisateur.lastName || '';
        this.nom = `${prenom} ${patronyme}`.trim()
            || racine.username || utilisateur.username || utilisateur.email || '';
        // Le libellé court d'abord : c'est celui que les agents emploient entre eux.
        const structure = getCurrentUserStructure();
        this.structure = structure?.libelleCourt || structure?.libelleLong || '';
    }

    /**
     * Phrase de synthèse.
     *
     * <p>Tant qu'une famille n'a pas répondu, on ne dit pas « rien ne vous attend » : ce serait
     * affirmer une absence qu'on ne connaît pas encore.</p>
     */
    get synthese(): string {
        if (!this.etat) {
            return 'Voici votre journée.';
        }
        if (this.etat.chargement) {
            return 'Recherche des dossiers qui vous attendent…';
        }
        const total = this.etat.total;
        if (total === 0) {
            return 'Aucun dossier n\'attend votre décision.';
        }
        return total === 1
            ? 'Un dossier attend votre décision.'
            : `${total} dossiers attendent votre décision.`;
    }
}
