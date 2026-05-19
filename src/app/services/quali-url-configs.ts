import { environment } from "../../environments/environment";
export const SERVICE_PREFIX = environment.apiUrl;

export const AMELIORATION_SERVICE = `${SERVICE_PREFIX}/amelioration-service/api/v1`;
export const REFERENTIEL_SERVICE = `${SERVICE_PREFIX}/referentiel-service/api/v1`;
export const USER_SERVICE = `${SERVICE_PREFIX}/user-service/api/v1`;
export const EVALUATION_SERVICE = `${SERVICE_PREFIX}/evaluation-service/api/v1`;
export const SUPPORT_SERVICE = `${SERVICE_PREFIX}/support-service/api`;

export class QualiUrlConfig {
    // Amelioration Service
    static readonly RECLAMATION_ROOT_URL = `${AMELIORATION_SERVICE}/reclamation`;
    static readonly ACTION_CORRECTIVE_PREVENTIVE_ROOT_URL = `${AMELIORATION_SERVICE}/action-corrective`;
    static readonly NON_CONFORMITE_ROOT_URL = `${AMELIORATION_SERVICE}/non-conformite`;
    static readonly PLAN_ACTION_ROOT_URL = `${AMELIORATION_SERVICE}/plan-action`;
    static readonly RISQUE_ROOT_URL = `${AMELIORATION_SERVICE}/risque`;
    static readonly TYPE_NON_CONFORMITE_ROOT_URL = `${AMELIORATION_SERVICE}/type-non-conformite`;
    static readonly NIVEAU_NON_CONFORMITE_ROOT_URL = `${AMELIORATION_SERVICE}/niveau/non-conformite`;
    static readonly ACTION_NON_CONFORMITE_ROOT_URL = `${AMELIORATION_SERVICE}/actions`;

    // Referentiel Service
    static readonly CATEGORIE_FICHIER_ROOT_URL = `${REFERENTIEL_SERVICE}/categorie/fichier`;
    static readonly PRESTATAIRE_ROOT_URL = `${REFERENTIEL_SERVICE}/prestataire`;
    static readonly FOURNISSEUR_ROOT_URL = `${REFERENTIEL_SERVICE}/fournisseur`;
    static readonly DEPARTEMENT_ROOT_URL = `${REFERENTIEL_SERVICE}/departement`;
    static readonly TYPE_PROCESSUS_ROOT_URL = `${REFERENTIEL_SERVICE}/type-processus`;
    static readonly PRODUIT_ROOT_URL = `${REFERENTIEL_SERVICE}/produit`;
    static readonly Exigence_ROOT_URL = `${REFERENTIEL_SERVICE}/exigence`;
    static readonly FORMATION_ROOT_URL = `${REFERENTIEL_SERVICE}/formation`;
    static readonly CG_ROOT_URL = `${REFERENTIEL_SERVICE}/config-global`;
    static readonly REGLEMENTATION_ROOT_URL = `${REFERENTIEL_SERVICE}/reglementation`;

    // Evaluation Service
    static readonly CRITERE_EVALUATION_ROOT_URL = `${EVALUATION_SERVICE}/critere-evaluation`;
    static readonly AUDIT_ROOT_URL = `${EVALUATION_SERVICE}/audite`;

    // Support Service (Gestion Documentaire QMS)
    static readonly QMS_DOCUMENT_ROOT_URL = `${SUPPORT_SERVICE}/qms/documents`;
    static readonly QMS_DOCUMENT_TYPE_ROOT_URL = `${SUPPORT_SERVICE}/qms/document-types`;

    // User Service (Authentification et Utilisateurs)
    static readonly LOGIN_URL = `${USER_SERVICE}/login`;
    static readonly REFRESH_TOKEN_URL = `${USER_SERVICE}/auth/refresh`;
    static readonly USERS_URL = `${USER_SERVICE}/users`;
    static readonly ROLE_URL = `${USER_SERVICE}/roles`;
    static readonly APP_ROLE_URL = `${USER_SERVICE}/app-roles`;
    static readonly USERS_BY_ID_URL = `${USER_SERVICE}/user-by-id`;
    static readonly USERS_BY_STRUCTURE_URL = `${USER_SERVICE}/users/{structureId}`;
    static readonly RESET_PASSWORD_URL = `${USER_SERVICE}/users/reset-password`;
    static readonly INITIATE_RESET_PASSWORD_URL = `${USER_SERVICE}/initiate-reset-pwd`;
    static readonly CHANGE_STATUS_URL = `${USER_SERVICE}/users/change-status`;
    static readonly VERIFY_EMAIL_URL = `${USER_SERVICE}/verify-email`;
    static readonly IS_EMAIL_VERIFIED_URL = `${USER_SERVICE}/is-email-verified`;
    static readonly REINITIALIZE_PASSWORD_URL = `${USER_SERVICE}/reinitialize-pwd`;
    static readonly UPDATE_PASSWORD_URL = `${USER_SERVICE}/update-pwd`;
}
