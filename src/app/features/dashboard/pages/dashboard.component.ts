import { CommonModule } from '@angular/common';
import { Component, ViewChild } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { currentUserState } from '@core/auth/auth.state';
import { getCurrentUserStructure } from '@core/auth/auth-utils';
import { EtatDeLaListe, MesDecisionsComponent } from '../components/mes-decisions/mes-decisions.component';
import { ActionsRapidesComponent } from '../components/actions-rapide/actions-rapides.component';
import { IndicateursComponent } from '../components/indicateurs/indicateurs.component';

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
    imports: [CommonModule, ButtonModule, TooltipModule, MesDecisionsComponent, ActionsRapidesComponent, IndicateursComponent],
    templateUrl: 'dashboard.component.html'
})
export class Dashboard {

    @ViewChild(MesDecisionsComponent) private mesDecisions?: MesDecisionsComponent;
    @ViewChild(IndicateursComponent) private indicateursComp?: IndicateursComponent;

    /** État de rafraîchissement manuel */
    isRefreshing = false;

    /** Date du jour formatée en français */
    readonly dateDuJour: string = (() => {
        const d = new Date();
        const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
        const texte = d.toLocaleDateString('fr-FR', options);
        return texte.charAt(0).toUpperCase() + texte.slice(1);
    })();

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

    /**
     * Déclenche un rafraîchissement manuel de l'ensemble des données de l'accueil.
     */
    actualiser(): void {
        this.isRefreshing = true;
        this.mesDecisions?.charger();
        this.indicateursComp?.charger();
        // Délai minimum pour un retour tactile soigné de l'animation
        setTimeout(() => {
            this.isRefreshing = false;
        }, 600);
    }
}

export { Dashboard as DashboardComponent };

