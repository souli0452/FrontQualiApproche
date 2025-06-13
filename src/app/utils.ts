import { HttpErrorResponse, HttpParams } from '@angular/common/http';
import moment from 'moment';
import { MessageService } from 'primeng/api';
import { Structure } from './pages/structure/structure';
import { AuthService } from './services/auth-services/auth.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
export interface ReportingInput {
    reportFormat: ReportFormat;
    reportType: any;
    entityId?: string;
    structureId?: string;
}

export enum ReportFormat {
    PDF = 'PDF', WORD = 'WORD', EXCEL = 'EXCEL', CSV = 'CSV', XPRINT = 'XPRINT'
}
export function printPdfFile(bytes: any) {
    window.open(URL.createObjectURL(new Blob([bytes], {type: 'application/pdf'})), '_blank');
}

export function printExcelFile(bytes: any) {
    const contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    window.open(URL.createObjectURL(new Blob([bytes], {type: contentType})), '_blank');
}

export function printWordFile(bytes: any) {
    const contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    window.open(URL.createObjectURL(new Blob([bytes], {type: contentType})), '_blank');
}

export function generateReportFile(bytes: any, reporting?: ReportingInput) {
    if (reporting) {
        const report = {...reporting};
        switch (report.reportFormat) {
            case ReportFormat.PDF:
                printPdfFile(bytes);
                break;
            case ReportFormat.EXCEL:
                printExcelFile(bytes);
                break;
            case ReportFormat.WORD:
                printWordFile(bytes);
                break;
            case ReportFormat.CSV:
                printExcelFile(bytes);
                break;
            default:
                window.console.log('Aucun format de fichier précisé');
                break;
        }
    }
}
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

export function toFormatFromDate(date: Date, pattern: string = 'DD/MM/YYYY'): string {
    return moment(date).locale('fr').format(pattern);
}

export function toFormatFromString(dateString: string, dateStringPattern: string, toPattern: string = 'DD/MM/YYYY'): string {
    const dateTmp = moment(dateString, dateStringPattern).toDate();
    return toFormatFromDate(dateTmp, toPattern);
}

export function patternToDate(dateString: string, pattern: string): Date {
    const date = moment(dateString, pattern).toDate();
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function unixToDate(unixStamp: number): Date {
    return moment(Number(unixStamp)).toDate();
}

export function sortArray(objectList: Array<any>, field: string, direction: 'asc' | 'desc', isNumber = false): Array<any> {
    let array: Array<any> = objectList.map(item => ({...item}));
    switch (direction) {
        case 'desc': {
            array = array.sort((a, b) => String(a[field]).localeCompare(String(b[field]), undefined,
                {numeric: isNumber}) > 0 ? -1 : 1);
            break;
        }
        case 'asc': {
            array = array.sort((a, b) => String(a[field]).localeCompare(String(b[field]), undefined,
                {numeric: isNumber}) < 0 ? -1 : 1);
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
                    return a[field].localeCompare(b[field], undefined, {numeric: isNumber}) > 0 ? -1 : 1;
                } else {
                    if (a[fields[index - 1]].localeCompare(b[fields[index - 1]], undefined, {numeric: isNumber}) === 0) {
                        return a[field].localeCompare(b[field], undefined, {numeric: isNumber}) > 0 ? -1 : 1;
                    } else {
                        return a[fields[index - 1]].localeCompare(b[fields[index - 1]], undefined, {numeric: isNumber}) > 0 ? -1 : 1;
                    }
                }
            });
        });
    } else if (direction === 'asc') {
        fields.forEach((field, index) => {
            sortedData = sortedData.sort((a: any, b: any) => {
                if (index === 0) {
                    return a[field].localeCompare(b[field], undefined, {numeric: isNumber}) < 0 ? -1 : 1;
                } else {
                    if (a[fields[index - 1]].localeCompare(b[fields[index - 1]], undefined, {numeric: isNumber}) === 0) {
                        return a[field].localeCompare(b[field], undefined, {numeric: isNumber}) < 0 ? -1 : 1;
                    } else {
                        return a[fields[index - 1]].localeCompare(b[fields[index - 1]], undefined, {numeric: isNumber}) < 0 ? -1 : 1;
                    }
                }
            });
        });
    }

    return sortedData;
}

export function getTimeZone(): string {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
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

export function showToast(severity: StatusEnum, status: number, message: any,
                          messageService: MessageService, error?: HttpErrorResponse) {
    messageService.add(buildMessage(severity, status, message, error));
}

export function formatUrl(url: string, replaceValue?: any): string {
    if (replaceValue) {
        const searchValue = url.substring(url.indexOf('$'), url.lastIndexOf('$') + 1);

        return url.replace(searchValue, replaceValue);
    }

    return url;
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
            return {severity, summary, detail: response.error.message, key};
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

// Code pour le formatage de la date pour affichage dans le tableau des confirmations
export function formatDateRange(dates: Date[]): string {
    if (!Array.isArray(dates) || dates.length !== 2) return 'Dates invalides';

    const format = (date: Date): string => {
      if (!(date instanceof Date) || isNaN(date.getTime())) return 'Date invalide';
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    };

    const start = format(dates[0]);
    const end = format(dates[1]);

    return `${start} - ${end}`;
  }
export const USER_STRUCTURE_KEY = 'current_user_structure';
export const USER_PROFILE_KEY = 'current_user_profile';
export function getCurrentUserStructure(): Structure {
    return JSON.parse(localStorage.getItem(USER_STRUCTURE_KEY)!) as Structure;
}
export const REGION_LIST = [
    {value: 'Centre', label: 'Centre'},
    {value: 'Boucle du Mouhoun', label: 'Boucle du Mouhoun'},
    {value: 'Cascades', label: 'Cascades'},
    {value: 'Centre-Est', label: 'Centre-Est'},
    {value: 'Centre-Nord', label: 'Centre-Nord'},
    {value: 'Centre-Ouest', label: 'Centre-Ouest'},
    {value: 'Centre-Sud', label: 'Centre-Sud'},
    {value: 'Est', label: 'Est'},
    {value: 'Hauts-Bassins', label: 'Hauts-Bassins'},
    {value: 'Nord', label: 'Nord'},
    {value: 'Plateau Central', label: 'Plateau Central'},
    {value: 'Sahel', label: 'Sahel'},
    {value: 'Sud-Ouest', label: 'Sud-Ouest'}
];
export function isUserInRoles(roles: string[]): boolean {
    const user = JSON.parse(localStorage.getItem('user')!);
    const rolesUsermap = JSON.parse(localStorage.getItem(USER_PROFILE_KEY)!);

    if (rolesUsermap) {
        user.roles = [];
        rolesUsermap.forEach((item: { name: string }) => {
            user.roles?.push(item.name); // ✅ Ajout avec `push()`
        });
    }

    return roles.some(role => user.roles.includes(role)); // ✅ Vérification simplifiée
}





