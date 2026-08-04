/**
 * Référentiels paramétrables propres au module documentaire.
 *
 * Ils vivent dans referentiel-service, avec les autres référentiels de l'application, et non dans
 * support-service : c'est là que se configure tout ce qui se paramètre.
 */

/** Niveau de priorité d'un document — « Urgent », « Normal »… au choix de l'organisation. */
export interface PrioriteDocument {
    id?: string;
    libelle: string;
    description?: string;
    /** Rang d'affichage, du plus urgent au moins urgent. */
    ordre?: number;
    /** Couleur d'affichage (ex. `#dc2626`), facultative. */
    couleur?: string;
}

/**
 * Niveau de confidentialité et rôles admis à consulter les documents qui le portent.
 *
 * La restriction s'ajoute à celle de la structure, elle ne s'y substitue pas : il faut relever de
 * la structure du document **et** détenir l'un de ces rôles. Une liste vide ne restreint rien.
 */
export interface NiveauConfidentialite {
    id?: string;
    libelle: string;
    description?: string;
    ordre?: number;
    /** Noms des rôles (« RESPONSABLE_QUALITE », « PILOTE »…), et non leurs identifiants. */
    rolesAutorises?: string[];
}

/**
 * Domaine d'application d'un document — le champ d'activité qu'il couvre.
 *
 * Il était en saisie libre : « RH », « Ressources Humaines » et « ressources humaines » comptaient
 * pour trois domaines distincts dans les statistiques.
 */
export interface DomaineApplication {
    id?: string;
    libelle: string;
    description?: string;
    ordre?: number;
}
