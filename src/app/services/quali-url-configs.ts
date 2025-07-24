 export  const SERVICE_PREFIX = `api/v1/quali-approche`;
// export  const SERVICE_PREFIX = `https://sgq.horeb.techapi/v1/quali-approche`;

export class QualiUrlConfig {
    static readonly FORMATION_ROOT_URL = `${SERVICE_PREFIX}/formation`;
    static readonly CG_ROOT_URL = `${SERVICE_PREFIX}/config-global`;
    static readonly CRITERE_EVALUATION_ROOT_URL = `${SERVICE_PREFIX}/critere-evaluation`;
    static readonly DEPARTEMENT_ROOT_URL = `${SERVICE_PREFIX}/departement`;
    static readonly CATEGORIE_FICHIER_ROOT_URL = `${SERVICE_PREFIX}/categorie/fichier`;
    static readonly PRESTATAIRE_ROOT_URL = `${SERVICE_PREFIX}/prestataire`;
    static readonly RECLAMATION_ROOT_URL = `${SERVICE_PREFIX}/reclamation`;
    static readonly REGLEMENTATION_ROOT_URL = `${SERVICE_PREFIX}/reglementation`;
    static readonly RISQUE_ROOT_URL = `${SERVICE_PREFIX}/risque`;
    static readonly FOURNISSEUR_ROOT_URL = `${SERVICE_PREFIX}/fournisseur`;
    static readonly ACTION_CORRECTIVE_PREVENTIVE_ROOT_URL = `${SERVICE_PREFIX}/action-corrective`;
    static readonly NON_CONFORMITE_ROOT_URL = `${SERVICE_PREFIX}/non-conformite`;
    static readonly TYPE_NON_CONFORMITE_ROOT_URL = `${SERVICE_PREFIX}/type-non-conformite`;
    static readonly TYPE_PROCESSUS_ROOT_URL = `${SERVICE_PREFIX}/type-processus`;
    static readonly Exigence_ROOT_URL = `${SERVICE_PREFIX}/exigence`;
    static readonly PRODUIT_ROOT_URL = `${SERVICE_PREFIX}/produit`;
    static readonly AUDIT_ROOT_URL = `${SERVICE_PREFIX}/audite`;
    static readonly NIVEAU_NON_CONFORMITE_ROOT_URL = `${SERVICE_PREFIX}/niveau/non-conformite`;
    static readonly ACTION_NON_CONFORMITE_ROOT_URL = `${SERVICE_PREFIX}/actions`;


    // URLs liées à l'authentification
    static readonly LOGIN_URL = `${SERVICE_PREFIX}/login`;
    static readonly REFRESH_TOKEN_URL = `${SERVICE_PREFIX}/auth/refresh`;
    static readonly USERS_URL = `${SERVICE_PREFIX}/users`;
    static readonly ROLE_URL = `${SERVICE_PREFIX}/roles`;
    static readonly USERS_BY_ID_URL = `${SERVICE_PREFIX}/user-by-id`;
    static readonly USERS_BY_STRUCTURE_URL = `${SERVICE_PREFIX}/users/{structureId}`;
    static readonly RESET_PASSWORD_URL = `${SERVICE_PREFIX}/users/reset-password`;
    static readonly INITIATE_RESET_PASSWORD_URL = `${SERVICE_PREFIX}/initiate-reset-pwd`;
    static readonly CHANGE_STATUS_URL = `${SERVICE_PREFIX}/users/change-status`;
    static readonly VERIFY_EMAIL_URL = `${SERVICE_PREFIX}/verify-email`;
    static readonly IS_EMAIL_VERIFIED_URL = `${SERVICE_PREFIX}/is-email-verified`;
    static readonly REINITIALIZE_PASSWORD_URL = `${SERVICE_PREFIX}/reinitialize-pwd`;
    static readonly UPDATE_PASSWORD_URL = `${SERVICE_PREFIX}/update-pwd`;
}
