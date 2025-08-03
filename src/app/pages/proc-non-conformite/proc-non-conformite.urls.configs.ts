import {SERVICE_PREFIX} from "../../services/quali-url-configs";

export class NonConformiteUrlConfig {
    static readonly GET_NON_CONFORMITE_BY_STATUS_ROOT_URL = `${SERVICE_PREFIX}/non-conformite/`;
    static readonly UPDATE_NON_CONFORMITE = `${SERVICE_PREFIX}/non-conformite/update/many`;
    static readonly GET_NON_CONFORMITE_IMPUTED = `${SERVICE_PREFIX}/non-conformite/imputed/`;
    static readonly GET_NON_CONFORMITE_ALL = `${SERVICE_PREFIX}/non-conformite/all`;
    static readonly GET_NON_CONFORMITE_BY_ETAPE_ORIGIN = `${SERVICE_PREFIX}/non-conformite/structure/origin/`;
    static readonly GET_NON_CONFORMITE_BY_ETAPE_SUMIT = `${SERVICE_PREFIX}/non-conformite/structure/soumission/`;
    static readonly GET_PLAN_ACTION = `${SERVICE_PREFIX}/plan-action/all/by-email/`;
    static readonly GET_PLAN_ACTION_ALL = `${SERVICE_PREFIX}/plan-action/all/`;
    static readonly UPDATE_PLAN_ACTION = `${SERVICE_PREFIX}/plan-action/update`;
    static readonly REJET_PLAN_ACTION = `${SERVICE_PREFIX}/plan-action/rejet`;
    static readonly GET_NON_CONFORMITE_REJECT = `${SERVICE_PREFIX}/non-conformite/reject`;
    static readonly GET_Stat_BY_STATUS_ROOT_URL = `${SERVICE_PREFIX}/non-conformite/stats/nf-struct`;
    static readonly GET_Stat_MENSUEL_ROOT_URL = `${SERVICE_PREFIX}/non-conformite/stats/nf/`;
    static readonly GET_Stat_MENSUEL_STATUS_ROOT_URL = `${SERVICE_PREFIX}/non-conformite/stats/nf/status/`;
    static readonly STAT_PLAN_ACTION_ALL = `${SERVICE_PREFIX}/plan-action/stats/status/`;
    static readonly GET_NON_CONFORMITE_ALL_By_Structure = `${SERVICE_PREFIX}/non-conformite/structure/`;
    static readonly VALIDATE_NON_CONFORMITE_ALL = `${SERVICE_PREFIX}/non-conformite/validate/plan`;
    static readonly GET_Stat_MENSUEL_NIVEAU_ROOT_URL = `${SERVICE_PREFIX}/non-conformite/stats/nf/niveau/`;
}
