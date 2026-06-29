import { HttpErrorResponse, HttpParams } from '@angular/common/http';
import moment from 'moment';
import { MessageService } from 'primeng/api';
import { NcStats } from '../../models/statsNc';
import { Structure } from '../../pages/parametrages/structure/structure-config/structure';

export const createRequestOption = (req?: any): HttpParams => {
    let options: HttpParams = new HttpParams();
    if (req) {
        Object.keys(req).forEach(key => {
            if (key !== 'sort' && key !== 'type' &&
                req[key] !== null && req[key] !== undefined) {
                options = options.set(key, req[key]);
            }
        });
        if (req.sort) {
            req.sort.forEach((val: any) => {
                options = options.append('sort', val);
            });
        }
    }
    return options;
};



export function sortArray(objectList: Array<any>, field: string, direction: 'asc' | 'desc', isNumber = false): Array<any> {
    let array: Array<any> = objectList.map(item => ({ ...item }));
    switch (direction) {
        case 'desc': {
            array = array.sort((a, b) => String(a[field]).localeCompare(String(b[field]), undefined,
                { numeric: isNumber }) > 0 ? -1 : 1);
            break;
        }
        case 'asc': {
            array = array.sort((a, b) => String(a[field]).localeCompare(String(b[field]), undefined,
                { numeric: isNumber }) < 0 ? -1 : 1);
            break;
        }
    }
    return array;
}

/**
 * Ordonner une liste selon plusieurs critères.
 *
 * @param dataList liste à ordonner.
 * @param fields liste des champs
 * @param direction le sens d'ordonnancement
 * @param isNumber true si les critères sont des nombres et false sinon
 *
 * @return la liste ordonnée
 */
export function sortWithMultipleCriteria(dataList: Array<any>, fields: Array<string>,
    direction: 'asc' | 'desc', isNumber: boolean): Array<any> {
    let sortedData: Array<any> = dataList;
    if (direction === 'desc') {
        fields.forEach((field: string, index: number) => {
            sortedData = sortedData.sort((a: any, b: any) => {
                if (index === 0) {
                    return a[field].localeCompare(b[field], undefined, { numeric: isNumber }) > 0 ? -1 : 1;
                } else {
                    if (a[fields[index - 1]].localeCompare(b[fields[index - 1]], undefined, { numeric: isNumber }) === 0) {
                        return a[field].localeCompare(b[field], undefined, { numeric: isNumber }) > 0 ? -1 : 1;
                    } else {
                        return a[fields[index - 1]].localeCompare(b[fields[index - 1]], undefined, { numeric: isNumber }) > 0 ? -1 : 1;
                    }
                }
            });
        });
    } else if (direction === 'asc') {
        fields.forEach((field, index) => {
            sortedData = sortedData.sort((a: any, b: any) => {
                if (index === 0) {
                    return a[field].localeCompare(b[field], undefined, { numeric: isNumber }) < 0 ? -1 : 1;
                } else {
                    if (a[fields[index - 1]].localeCompare(b[fields[index - 1]], undefined, { numeric: isNumber }) === 0) {
                        return a[field].localeCompare(b[field], undefined, { numeric: isNumber }) < 0 ? -1 : 1;
                    } else {
                        return a[fields[index - 1]].localeCompare(b[fields[index - 1]], undefined, { numeric: isNumber }) < 0 ? -1 : 1;
                    }
                }
            });
        });
    }

    return sortedData;
}



export enum StatusEnum {
    error = 'error',
    success = 'success',
    warning = 'warn'
}

export class GloabalMessageConfig {

    private static errorMsg = 'Erreur de connection. Veuillez Contacter l\'administrateur';

    static setStatusMessage(status: number, localMessage: string, error?: HttpErrorResponse) {
        if (localMessage) {
            return localMessage;
        } else {
            switch (status) {
                case 200:
                    return 'Opération réussie';
                case 201:
                    return 'Opération réussie';
                case 204:
                    return 'Opération réussie';
                case 409:
                    return error?.error.message;
                case 400:
                    return error?.error.message;
                case 401:
                    return error?.error.message;
                case 403:
                    return error?.error.message;
                case 404: {
                    if (error?.error.message) {
                        return error.error.message;
                    } else {
                        return this.errorMsg;
                    }
                }
                case 500:
                    return this.errorMsg;
                default: {
                    return this.errorMsg;
                }
            }
        }
    }
}

export enum TypeDemande {
    NON_CONFORMITE = 'NON_CONFORMITE',
}

export function buildMessage(severity: StatusEnum, status: number, localMessage: string, error?: HttpErrorResponse): any {
    const message = GloabalMessageConfig.setStatusMessage(status, localMessage, error);
    return {
        key: 'key',
        severity,
        summary: null,
        detail: message
    };
}
export enum StatusEnumShow {
    error = 'error',
    success = 'success',
    warning = 'warn'
}

export function showToast(severity: StatusEnum, status: number, message: any,
    messageService: MessageService, error?: HttpErrorResponse) {
    messageService.add(buildMessage(severity, status, message, error));
}


export enum HttpStatusCode {
    error200 = 200,
    error201 = 201,
    error202 = 202,
    error404 = 404,
    error400 = 400,
    error500 = 500,
    error502 = 502,
    error503 = 503
}
export namespace HttpStatusCode {
    const status500List = new Array<HttpStatusCode>(HttpStatusCode.error500, HttpStatusCode.error502, HttpStatusCode.error503);
    const status200List = new Array<HttpStatusCode>(HttpStatusCode.error200, HttpStatusCode.error201, HttpStatusCode.error202);

    export function isError500(statusCode: HttpStatusCode) {
        return status500List.includes(statusCode);
    }

    export function isSuccess200(statusCode: HttpStatusCode) {
        return status200List.includes(statusCode);
    }
}

export function handleHttpErrors(response: HttpErrorResponse, severity: string, summary: string, key: string) {

    if (HttpStatusCode.isError500(response?.error?.status)) {
        return {
            severity,
            summary,
            detail: 'Une erreur inconnue est survenue, merci de contacter l\'administrateur.',
            key
        };;
    } else {
        if (response.error && response.error.message) {
            return { severity, summary, detail: response.error.message, key };
        } else {
            return {
                severity,
                summary,
                detail: 'Une erreur inconnue est survenue, merci de contacter l\'administrateur.',
                key
            };
        }
    }
}


export const USER_STRUCTURE_KEY = 'current_user_structure';
export const USER_PROFILE_KEY = 'current_user_profile';
export function getCurrentUserStructure(): Structure {
    return JSON.parse(sessionStorage.getItem(USER_STRUCTURE_KEY)!) as Structure;
}
export const REGION_LIST = [
    { value: 'Centre', label: 'Centre' },
    { value: 'Boucle du Mouhoun', label: 'Boucle du Mouhoun' },
    { value: 'Cascades', label: 'Cascades' },
    { value: 'Centre-Est', label: 'Centre-Est' },
    { value: 'Centre-Nord', label: 'Centre-Nord' },
    { value: 'Centre-Ouest', label: 'Centre-Ouest' },
    { value: 'Centre-Sud', label: 'Centre-Sud' },
    { value: 'Est', label: 'Est' },
    { value: 'Hauts-Bassins', label: 'Hauts-Bassins' },
    { value: 'Nord', label: 'Nord' },
    { value: 'Plateau Central', label: 'Plateau Central' },
    { value: 'Sahel', label: 'Sahel' },
    { value: 'Sud-Ouest', label: 'Sud-Ouest' }
];




export function transformerEnStats(nonConformites: any[]): NcStats[] {
    const statsMap = new Map<any, number>();

    for (const nc of nonConformites) {
        statsMap.set(nc.status, (statsMap.get(nc.status) || 0) + 1);
    }

    return Array.from(statsMap.entries()).map(([status, count]) => ({ status, count }));
}

export function getStatusSeverity(status: string): string {
    if (!status) return 'info';

    const statusLower = status.toLowerCase();

    switch (statusLower) {
        case 'NON_TRAITER':
        case 'PENDING':
        case 'DRAFT':
            return 'warning';  // Jaune/orange
        case 'TRAITER':
        case 'IN_PROGRESS':
        case 'APPROVED':
        case 'validé':
        case 'oui':
            return 'success';  // Vert
        case 'rejeté':
        case 'rejected':
        case 'annulé':
        case 'non':
            return 'danger';   // Rouge
        case 'en attente':
        case 'on hold':
            return 'info';      // Bleu
        case 'en retard':
        case 'late':
            return 'danger';    // Rouge
        default:
            return 'info';      // Bleu par défaut
    }
}


export function generateColor(index: number, total: number): string {

    const hue = Math.round((360 / total) * index);
    return `hsl(${hue}, 70%, 50%)`;
}
