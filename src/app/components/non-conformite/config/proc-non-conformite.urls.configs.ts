import { AMELIORATION_SERVICE } from "../../../services/quali-url-configs";

export class NonConformiteUrlConfig {
    static readonly GET_NON_CONFORMITE_BY_STATUS_ROOT_URL = `${AMELIORATION_SERVICE}/non-conformite/`;
    static readonly UPDATE_NON_CONFORMITE = `${AMELIORATION_SERVICE}/non-conformite/update/many`;
    static readonly GET_NON_CONFORMITE_IMPUTED = `${AMELIORATION_SERVICE}/non-conformite/imputed/`;
    static readonly GET_NON_CONFORMITE_ALL = `${AMELIORATION_SERVICE}/non-conformite/all`;
    static readonly GET_NON_CONFORMITE_BY_ETAPE_ORIGIN = `${AMELIORATION_SERVICE}/non-conformite/structure/origin/`;
    static readonly GET_NON_CONFORMITE_BY_ETAPE_SUMIT = `${AMELIORATION_SERVICE}/non-conformite/structure/soumission/`;
    static readonly GET_PLAN_ACTION = `${AMELIORATION_SERVICE}/plan-action/all/by-email/`;
    static readonly GET_PLAN_ACTION_ALL = `${AMELIORATION_SERVICE}/plan-action/all/`;
    static readonly UPDATE_PLAN_ACTION = `${AMELIORATION_SERVICE}/plan-action/update`;
    static readonly REJET_PLAN_ACTION = `${AMELIORATION_SERVICE}/plan-action/rejet`;
    static readonly GET_NON_CONFORMITE_REJECT = `${AMELIORATION_SERVICE}/non-conformite/reject`;
    static readonly GET_Stat_BY_STATUS_ROOT_URL = `${AMELIORATION_SERVICE}/non-conformite/stats/nf-struct`;
    static readonly GET_Stat_MENSUEL_ROOT_URL = `${AMELIORATION_SERVICE}/non-conformite/stats/nf/`;
    static readonly GET_Stat_MENSUEL_STATUS_ROOT_URL = `${AMELIORATION_SERVICE}/non-conformite/stats/nf/status/`;
    static readonly STAT_PLAN_ACTION_ALL = `${AMELIORATION_SERVICE}/plan-action/stats/status/`;
    static readonly GET_NON_CONFORMITE_ALL_By_Structure = `${AMELIORATION_SERVICE}/non-conformite/structure/`;
    static readonly VALIDATE_NON_CONFORMITE_ALL = `${AMELIORATION_SERVICE}/non-conformite/validate/plan`;
    static readonly GET_Stat_MENSUEL_NIVEAU_ROOT_URL = `${AMELIORATION_SERVICE}/non-conformite/stats/nf/niveau/`;
}
