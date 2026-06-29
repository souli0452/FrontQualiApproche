import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams, HttpResponse } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { QualiUrlConfig } from '../quali-url-configs';
import { BaseCrudService } from '../base-crud.service';
import { DocumentQms, QmsDocumentType } from '../../models/gestion-documentaire.model';
import { ApiItemResponse, ApiResponse } from '../../models/response.model';


@Injectable({
    providedIn: 'root'
})
export class QmsDocumentService extends BaseCrudService<DocumentQms, string> {
    constructor(public override http: HttpClient) {
        super(http, QualiUrlConfig.QMS_DOCUMENT_TYPE_ROOT_URL);
    }


     private buildNcParams(params?: Record<string, any>): HttpParams {
            let httpParams = new HttpParams();
    
            if (!params) return httpParams;
    
            Object.keys(params).forEach((key) => {
                const value = params[key];
                if (value !== null && value !== undefined && value !== '') {
                    httpParams = httpParams.set(key, value);
                }
            });
    
            return httpParams;
        }
    
    private buildNcHeaders(headers?: Record<string, string>): HttpHeaders {
        let httpHeaders = new HttpHeaders();

        if (!headers) return httpHeaders;

        Object.keys(headers).forEach((key) => {
            httpHeaders = httpHeaders.set(key, headers[key]);
        });

        return httpHeaders;
    }

    private getPageFromUrl(
        url: string,
        params?: Record<string, any>,
        headers?: Record<string, string>
    ): Observable<ApiResponse<DocumentQms>> {
        return this.http.get<ApiResponse<DocumentQms>>(url, {
            params: this.buildNcParams(params),
            headers: this.buildNcHeaders(headers)
        });
    }

    private getListFromUrl(
        url: string,
        params?: Record<string, any>,
        headers?: Record<string, string>
    ): Observable<DocumentQms[]> {
        return this.getPageFromUrl(url, params, headers).pipe(
            map((res: any) => res.data?.content ?? [])
        );
    }

    private getItemFromUrl(
        url: string,
        headers?: Record<string, string>
    ): Observable<ApiItemResponse<DocumentQms>> {
        return this.http.get<ApiItemResponse<DocumentQms>>(url, {
            headers: this.buildNcHeaders(headers)
        });
    }

    documentQmsGetAll(
        page: number = 0,
        size: number = 10,
        filters?: Record<string, any>,
        headers?: Record<string, string>
    ): Observable<ApiResponse<any>> {
        const params = this.buildParams({ page, size, ...filters });
        const httpHeaders = this.buildHeaders(headers);
        return this.http.get<ApiResponse<any>>(QualiUrlConfig.QMS_DOCUMENT_ROOT_URL, {params, headers: httpHeaders});
    }

    typeDocumentQmsGetAll(
        page: number = 0,
        size: number = 10,
        filters?: Record<string, any>,
        headers?: Record<string, string>
    ): Observable<ApiResponse<any>> {
        const params = this.buildParams({ page, size, ...filters });
        const httpHeaders = this.buildHeaders(headers);
        return this.http.get<ApiResponse<any>>(QualiUrlConfig.QMS_DOCUMENT_TYPE_ROOT_URL, {params, headers: httpHeaders});
    }

    typeDocumentQmsCreate
        (type: QmsDocumentType): 
        Observable<QmsDocumentType> {
        const httpHeaders = this.buildNcHeaders();
        return this.http.post<QmsDocumentType>(QualiUrlConfig.QMS_DOCUMENT_TYPE_ROOT_URL, type, {
            headers: httpHeaders
        });
    }

    typeDocumentQmsUpdate
        (id: string, type: QmsDocumentType): 
        Observable<QmsDocumentType> {
        const httpHeaders = this.buildNcHeaders();
        return this.http.put<QmsDocumentType>(`${QualiUrlConfig.QMS_DOCUMENT_TYPE_ROOT_URL}/${id}`, type, {
            headers: httpHeaders
        });
    }

    typeDocumentQmsDelete
        (id: string): 
        Observable<void> {
        const httpHeaders = this.buildNcHeaders();
        return this.http.delete<void>(`${QualiUrlConfig.QMS_DOCUMENT_TYPE_ROOT_URL}/${id}`, {
            headers: httpHeaders
        });
    }

    searchDocuments(filters: { query?: string; documentType?: string; serviceId?: string; status?: string[]; dateFrom?: string; dateTo?: string }): Observable<ApiResponse<any>> {
        let params = new HttpParams();
        if (filters.query) params = params.set('query', filters.query);
        if (filters.documentType) params = params.set('documentType', filters.documentType);
        if (filters.serviceId) params = params.set('serviceId', filters.serviceId);
        if (filters.status && filters.status.length > 0) {
            filters.status.forEach((s) => (params = params.append('status', s)));
        }
        if (filters.dateFrom) params = params.set('dateFrom', filters.dateFrom);
        if (filters.dateTo) params = params.set('dateTo', filters.dateTo);

        return this.http.get<ApiResponse<any>>(`${QualiUrlConfig.QMS_DOCUMENT_ROOT_URL}/search`, { params });
    }


}


// export class QmsDocumentService {
//     constructor(private http: HttpClient) {}
    

//     // --- Document Type APIs ---
//     getAllTypes(): Observable<QmsDocumentType[]> {
//         console.log('Appel API vers :', QualiUrlConfig.QMS_DOCUMENT_TYPE_ROOT_URL);
//         return this.http.get<QmsDocumentType[]>(QualiUrlConfig.QMS_DOCUMENT_TYPE_ROOT_URL);
//     }

//     getTypeById(id: string): Observable<QmsDocumentType> {
//         return this.http.get<QmsDocumentType>(`${QualiUrlConfig.QMS_DOCUMENT_TYPE_ROOT_URL}/${id}`);
//     }

//     createType(type: QmsDocumentType): Observable<QmsDocumentType> {
//         return this.http.post<QmsDocumentType>(QualiUrlConfig.QMS_DOCUMENT_TYPE_ROOT_URL, type);
//     }

//     updateType(id: string, type: QmsDocumentType): Observable<QmsDocumentType> {
//         return this.http.put<QmsDocumentType>(`${QualiUrlConfig.QMS_DOCUMENT_TYPE_ROOT_URL}/${id}`, type);
//     }

//     deleteType(id: string): Observable<void> {
//         return this.http.delete<void>(`${QualiUrlConfig.QMS_DOCUMENT_TYPE_ROOT_URL}/${id}`);
//     }

//     // --- Document QMS APIs ---
//     createDocument(formData: FormData): Observable<DocumentQms> {
//         return this.http.post<DocumentQms>(QualiUrlConfig.QMS_DOCUMENT_ROOT_URL, formData);
//     }

//     transitionStatus(id: string, nextStatus: string, reason: string): Observable<DocumentQms> {
//         const params = new HttpParams().set('nextStatus', nextStatus).set('reason', reason);
//         return this.http.post<DocumentQms>(`${QualiUrlConfig.QMS_DOCUMENT_ROOT_URL}/${id}/transition`, null, { params });
//     }

//     linkToNonConformity(id: string, ncRef: string, actionCorrective: string): Observable<DocumentQms> {
//         const params = new HttpParams().set('ncRef', ncRef).set('actionCorrective', actionCorrective);
//         return this.http.post<DocumentQms>(`${QualiUrlConfig.QMS_DOCUMENT_ROOT_URL}/${id}/link-nc`, null, { params });
//     }

//     exportSecuredPdf(id: string): Observable<HttpResponse<Blob>> {
//         return this.http.get(`${QualiUrlConfig.QMS_DOCUMENT_ROOT_URL}/${id}/export-pdf`, {
//             responseType: 'blob',
//             observe: 'response'
//         });
//     }

//     getVersionHistory(id: string): Observable<QmsDocumentVersion[]> {
//         return this.http.get<QmsDocumentVersion[]>(`${QualiUrlConfig.QMS_DOCUMENT_ROOT_URL}/${id}/versions`);
//     }

//     getAuditLogs(id: string): Observable<QmsAuditLog[]> {
//         return this.http.get<QmsAuditLog[]>(`${QualiUrlConfig.QMS_DOCUMENT_ROOT_URL}/${id}/audit-logs`);
//     }

//     searchDocuments(filters: { query?: string; documentType?: string; serviceId?: string; status?: string[]; dateFrom?: string; dateTo?: string }): Observable<DocumentQms[]> {
//         let params = new HttpParams();
//         if (filters.query) params = params.set('query', filters.query);
//         if (filters.documentType) params = params.set('documentType', filters.documentType);
//         if (filters.serviceId) params = params.set('serviceId', filters.serviceId);
//         if (filters.status && filters.status.length > 0) {
//             filters.status.forEach((s) => (params = params.append('status', s)));
//         }
//         if (filters.dateFrom) params = params.set('dateFrom', filters.dateFrom);
//         if (filters.dateTo) params = params.set('dateTo', filters.dateTo);

//         return this.http.get<DocumentQms[]>(`${QualiUrlConfig.QMS_DOCUMENT_ROOT_URL}/search`, { params });
//     }

//     createAlfrescoUser(user: any): Observable<void> {
//         return this.http.post<void>(`${QualiUrlConfig.QMS_DOCUMENT_ROOT_URL}/users`, user);
//     }

//     getAlfrescoUsers(): Observable<any[]> {
//         return this.http.get<any[]>(`${QualiUrlConfig.QMS_DOCUMENT_ROOT_URL}/users`);
//     }

//     assignPermissions(id: string, payload: { username: string; role: string }): Observable<void> {
//         return this.http.post<void>(`${QualiUrlConfig.QMS_DOCUMENT_ROOT_URL}/${id}/permissions`, payload);
//     }

//     getShareLink(id: string): Observable<{ sharedId: string }> {
//         return this.http.get<{ sharedId: string }>(`${QualiUrlConfig.QMS_DOCUMENT_ROOT_URL}/${id}/share-link`);
//     }

//     getAosUrl(id: string): Observable<{ aosUrl: string }> {
//         return this.http.get<{ aosUrl: string }>(`${QualiUrlConfig.QMS_DOCUMENT_ROOT_URL}/${id}/aos-url`);
//     }
// }
