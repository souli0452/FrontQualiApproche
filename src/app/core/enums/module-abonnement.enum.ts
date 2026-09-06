/**
 * Modules souscrits par la direction, tels qu'inscrits dans la licence. Recopie exacte de
 * l'énumération `ModuleAbonnement` du back : ces noms voyagent chiffrés dans la licence, et un
 * écart d'une lettre ferme un pan entier de l'application sans le moindre message.
 */
export enum ModuleAbonnement {
    NON_CONFORMITE = 'NON_CONFORMITE',
    DOCUMENTAIRE = 'DOCUMENTAIRE',
    RECLAMATION = 'RECLAMATION',
    RISQUE = 'RISQUE',
    AUDIT = 'AUDIT',
    FORMATION = 'FORMATION',
    REGLEMENTATION = 'REGLEMENTATION',
    EVALUATION = 'EVALUATION',
    CONTEXTE = 'CONTEXTE'
}
