import { HttpErrorResponse, HttpParams } from '@angular/common/http';
import moment from 'moment';
import { MessageService } from 'primeng/api';
import { Structure } from './pages/structure/structure';
import { AuthService } from './services/auth-services/auth.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { NcStats } from './models/statsNc';
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
    window.open(URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' })), '_blank');
}

export function printExcelFile(bytes: any) {
    const contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    window.open(URL.createObjectURL(new Blob([bytes], { type: contentType })), '_blank');
}

export function printWordFile(bytes: any) {
    const contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    window.open(URL.createObjectURL(new Blob([bytes], { type: contentType })), '_blank');
}

export function generateReportFile(bytes: any, reporting?: ReportingInput) {
    if (reporting) {
        const report = { ...reporting };
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
export enum StatusEnumShow {
    error = 'error',
    success = 'success',
    warning = 'warn'
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

export function hasAnyPermission(permissions: string[]): boolean {
    const user = JSON.parse(localStorage.getItem('user')!);
    if (!user) return false;

    // Le SUPER_ADMIN n'a plus de bypass automatique ici, il utilise ses permissions réelles
    if (!user.permissions) return false;
    return permissions.some(p => user.permissions.includes(p));
}

export function isLicenseActive(): boolean {
    const user = JSON.parse(localStorage.getItem('user')!);
    if (!user) return false;
    // Plus de bypass pour le SUPER_ADMIN, il est soumis à la licence globale
    return user.licenseActive || false;
}

export function isModuleSubscribed(moduleName: string): boolean {
    const user = JSON.parse(localStorage.getItem('user')!);
    if (!user) return false;
    return user.modulesSubscribed?.includes(moduleName) || false;
}



export function convertFilesToBase64(files: { file: File; extension: string; name: string; size: string; loading: boolean; icon: string }[]): Promise<any[]> {
    const filePromises = files.map((fileObj) => {
        return new Promise((resolve, reject) => {
            const file = fileObj.file;
            if (file instanceof File) {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const base64String = reader.result as string;
                    resolve({
                        fichierBase64: base64String.split(',')[1],
                        nomFichier: file.name,
                        typeFichier: file.type
                    });
                };
                reader.onerror = (error) => reject(error);
                reader.readAsDataURL(file);
            } else {
                reject(new Error('L\'élément n\'est pas un fichier valide'));
            }
        });
    });
    return Promise.all(filePromises);
}

export function transformerEnStats(nonConformites: any[]): NcStats[] {
    const statsMap = new Map<any, number>();

    for (const nc of nonConformites) {
        statsMap.set(nc.status, (statsMap.get(nc.status) || 0) + 1);
    }

    return Array.from(statsMap.entries()).map(([status, count]) => ({ status, count }));
}
export function formatDateToDDMMYYYY(dateInput: Date | string | number): string {
    const date = new Date(dateInput);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // mois de 0 à 11
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
}
export function formatDateTodd(dateInput: Date | string | number): string {
    const date = new Date(dateInput);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // mois de 0 à 11
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
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

export function downloadFile(nom: string, base64: string) {
    // Extraire le type MIME si la base64 inclut un préfixe de type Data URI
    const matches = base64.match(/^data:(.+);base64,(.+)$/);
    let mimeType = 'application/octet-stream';
    let base64Data = base64;

    if (matches && matches.length === 3) {
        mimeType = matches[1];
        base64Data = matches[2];
    }

    // Convertir la base64 en Blob
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length).fill(0).map((_, i) => byteCharacters.charCodeAt(i));
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });

    // Créer une URL temporaire et déclencher le téléchargement
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nom || 'fichier';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
export function generateColor(index: number, total: number): string {

    const hue = Math.round((360 / total) * index);
    return `hsl(${hue}, 70%, 50%)`;
}
