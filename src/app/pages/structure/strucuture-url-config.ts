import { SERVICE_PREFIX } from '../../services/quali-url-configs';


export class StructureEndpoint {
    static readonly STRUCTURE_ROOT_URL = `${SERVICE_PREFIX}/structures`;
    static readonly STRUCTURE_ALL_ROOT_URL = `${SERVICE_PREFIX}/structures/all`;
    static readonly STRUCTURE_CREATE_URL = `${StructureEndpoint.STRUCTURE_ROOT_URL}/create`;
    static readonly STRUCTURE_UPDATE_URL = `${StructureEndpoint.STRUCTURE_ROOT_URL}/update`;
    static readonly STRUCTURE_DELETE_URL = `${StructureEndpoint.STRUCTURE_ROOT_URL}/delete/$id$`;
    static readonly STRUCTURE_BY_LIBELLE_URL = `${StructureEndpoint.STRUCTURE_ROOT_URL}/by-libelle/$libelle$`;
    static readonly STRUCTURE_BY_ID_URL = `${StructureEndpoint.STRUCTURE_ROOT_URL}/$id$`;
}
