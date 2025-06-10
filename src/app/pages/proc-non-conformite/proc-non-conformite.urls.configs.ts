import {SERVICE_PREFIX} from "../../services/quali-url-configs";

export class NonConformiteUrlConfig {
    static readonly GET_NON_CONFORMITE_BY_STATUS_ROOT_URL = `${SERVICE_PREFIX}/non-conformite/`;
    static readonly UPDATE_NON_CONFORMITE = `${SERVICE_PREFIX}/non-conformite/update/many`;
    static readonly GET_NON_CONFORMITE_IMPUTED = `${SERVICE_PREFIX}/non-conformite/imputed/`;
    static readonly GET_NON_CONFORMITE_ALL = `${SERVICE_PREFIX}/non-conformite/all`;
    static readonly GET_NON_CONFORMITE_BY_ETAPE_ORIGIN = `${SERVICE_PREFIX}/non-conformite/structure/origin/`;
    static readonly GET_NON_CONFORMITE_BY_ETAPE_SUMIT = `${SERVICE_PREFIX}/non-conformite/structure/soumission/`;
}
