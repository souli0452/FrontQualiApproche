/**
 * Comparaisons qu'un critère de recherche peut exprimer.
 *
 * Miroir de l'énumération du serveur : un jeton inconnu serait refusé à la désérialisation.
 */
export type FilterOperator =
    | 'EQ' | 'NOT_EQ'
    | 'LIKE' | 'CONTAINS' | 'ENDS_WITH' | 'NOT_CONTAINS'
    | 'IN'
    | 'GTE' | 'LTE' | 'GT' | 'LT'
    | 'BETWEEN'
    | 'IS_NULL' | 'NOT_NULL';

/**
 * Un critère de recherche : une colonne, une comparaison, une valeur.
 *
 * Le champ nomme un attribut de l'entité côté serveur, et admet un chemin traversant
 * (`"structure.libelle"`).
 */
export interface FilterExtra {
    /** Attribut filtré. Ignoré si `fields` est renseigné. */
    field?: string;
    /**
     * Attributs alternatifs, quand la même comparaison doit valoir sur l'un **ou** l'autre.
     *
     * « Les dossiers qui me concernent » n'est pas une colonne : c'est ceux que j'ai déclarés ou
     * ceux qui me sont imputés. Des critères cumulés ne savent pas le dire — ils se combinent par
     * un ET.
     */
    fields?: string[];
    operator: FilterOperator;
    /** Une valeur simple, ou un tableau pour `IN`. */
    value?: any;
    /** Borne haute, pour `BETWEEN` seulement. */
    valueTo?: string;
}

/**
 * Ce sur quoi porte une recherche : un texte libre, et des critères nommés qui se cumulent.
 *
 * Transmis dans le corps de la requête : une sélection multiple sur plusieurs colonnes dépasse vite
 * ce qu'une chaîne de requête sait porter, et l'écran n'a pas à encoder des listes d'identifiants.
 */
export interface CriteriaDto {
    search?: string;
    filters: FilterExtra[];
}
