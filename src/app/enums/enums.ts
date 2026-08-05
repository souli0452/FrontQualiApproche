export enum EtapeTraitement {
    SOUMISSION = 'SOUMISSION',
    RECEPTION = 'RECEPTION',
    /**
     * Validation du responsable qualité, qui désigne la structure en charge du dossier.
     *
     * <p>Charnière du circuit : jusqu'à elle la non-conformité n'est adressée à personne, après
     * elle le pilote de la structure désignée l'impute.</p>
     */
    VALIDATION_RQ = 'VALIDATION_RQ',
    VALIDATION = 'VALIDATION',
    IMPUTATION = 'IMPUTATION',
    TRAITEMENT='TRAITEMENT',
    CLOTURE = 'CLOTURE',
    PUBLISHED = 'PUBLISHED',
    VALIDATION_PILOTE = 'VALIDATION_PILOTE',
    VALIDATION_RS = 'VALIDATION_RS',
    SUIVI_RQ = 'SUIVI_RQ',
    VALIDATION_PLAN = 'VALIDATION_PLAN',


}
export enum StatusEnum {
    PENDIND = 'PENDIND',

    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
    IN_PROGRESS = 'IN_PROGRESS',

}
export enum TypeStructure {
    DIRECTION = 'DIRECTION',
    SERVICE = 'SERVICE'
}

/**
 * Modules souscrits par la direction, tels qu'inscrits dans la licence. Recopie exacte de
 * l'énumération `ModuleAbonnement` du back : ces noms voyagent chiffrés dans la licence, et un
 * écart d'une lettre ferme un pan entier de l'application sans le moindre message.
 *
 * C'est précisément ce qui se produisait avec la chaîne libre `'AUTRE_MODULE'`, qui ne
 * correspondait à aucun module : Audite, Réglementation et Critères d'évaluation étaient
 * invisibles pour tout le monde. Passer par cette énumération rend l'erreur impossible.
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
    // Pas de PLAN_ACTION : le plan d'action relève du traitement des non-conformités, donc du
    // module NON_CONFORMITE. À ne pas confondre avec le `ResourceType` du même nom (workflow.model),
    // qui désigne la famille de ressource d'un circuit de validation.
}

export enum NonConformStatus {
    PENDIND = 'PENDIND',
    NON_TRAITER = 'NON_TRAITER',
    ARCHIVED = 'ARCHIVED',
    REJECTED = 'REJECTED',
    PUBLISHED = 'PUBLISHED',
    /** Action déclarée réalisée par son responsable, en attente du constat du pilote. */
    EN_VERIFICATION = 'EN_VERIFICATION',
    /** Réalisation constatée ; reste à confronter le résultat au critère d'efficacité. */
    EFFICACITE_A_MESURER = 'EFFICACITE_A_MESURER',
    /** Réalisée et reconnue efficace : elle ne retient plus la clôture du dossier. */
    TRAITER = 'TRAITER',
    DRAFT = 'DRAFT',
    IN_PROGRESS = 'IN_PROGRESS',

}
