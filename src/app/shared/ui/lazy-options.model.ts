import { Observable } from 'rxjs';

/**
 * Contrat commun aux listes déroulantes alimentées page par page.
 *
 * Il tient en deux types : ce que le composant demande, ce qu'on lui rend. Un service qui sait
 * répondre à ça se branche indifféremment sur `app-select-input` et `app-multiselect-input`.
 */

/** Ce que le composant transmet à chaque chargement. */
export interface OptionsLoadEvent {
    /** Texte saisi dans le filtre. Chaîne vide au premier chargement. */
    search: string;
    /** Page demandée, à partir de 0. */
    page: number;
    /** Nombre d'éléments attendus. */
    limit: number;
}

/** Ce que le service rend en retour. */
export interface OptionsLoadResult<T = any> {
    /** Éléments de la page, tels quels : le composant lit le libellé et la valeur via optionLabel/optionValue. */
    options: T[];
    /** Total côté serveur, toutes pages confondues — sert à décider s'il reste quelque chose à charger. */
    totalRecords: number;
    /**
     * Reste-t-il des pages ? Facultatif : déduit du total quand il n'est pas fourni. À renseigner
     * lorsque le serveur le sait mieux que nous (dernière page signalée explicitement).
     */
    hasMore?: boolean;
}

/** Signature d'un chargeur de page, telle que l'attendent les deux composants. */
export type OptionsLoader<T = any> = (event: OptionsLoadEvent) => Observable<OptionsLoadResult<T>>;
