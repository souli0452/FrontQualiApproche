/**
 * Étapes du circuit de traitement d'une non-conformité.
 */
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
    TRAITEMENT = 'TRAITEMENT',
    CLOTURE = 'CLOTURE',
    PUBLISHED = 'PUBLISHED',
    VALIDATION_PILOTE = 'VALIDATION_PILOTE',
    VALIDATION_RS = 'VALIDATION_RS',
    SUIVI_RQ = 'SUIVI_RQ',
    VALIDATION_PLAN = 'VALIDATION_PLAN',
}

/**
 * Statuts métier du cycle de vie d'une non-conformité et de ses actions.
 */
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

export enum TypeDemande {
    NON_CONFORMITE = 'NON_CONFORMITE',
}
