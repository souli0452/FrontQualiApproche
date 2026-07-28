import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams, HttpResponse } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { QualiUrlConfig } from '../quali-url-configs';
import { BaseCrudService } from '../base-crud.service';
import { DocumentQms, QmsDocumentType, QmsDocumentVersion, QmsAuditLog, DocumentStatsDto, DocumentUserAccess, SharedDocumentDto } from '../../models/gestion-documentaire.model';
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

    // --- NOUVEAUX ENDPOINTS ALIGNÉS SUR QmsDocumentController ---

    createDocument(file: File, documentData: Record<string, any>): Observable<DocumentQms> {
        const formData = new FormData();
        formData.append('file', file);
        Object.keys(documentData).forEach(key => {
            if (documentData[key] !== null && documentData[key] !== undefined) {
                formData.append(key, documentData[key].toString());
            }
        });
        return this.http.post<DocumentQms>(QualiUrlConfig.QMS_DOCUMENT_ROOT_URL, formData);
    }

    addVersion(id: string, file: File, comments: string): Observable<QmsDocumentVersion> {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('comments', comments);
        return this.http.post<QmsDocumentVersion>(`${QualiUrlConfig.QMS_DOCUMENT_ROOT_URL}/${id}/versions`, formData);
    }

    transitionStatus(id: string, nextStatus: string, reason: string): Observable<DocumentQms> {
        const params = new HttpParams().set('nextStatus', nextStatus).set('reason', reason);
        return this.http.post<DocumentQms>(`${QualiUrlConfig.QMS_DOCUMENT_ROOT_URL}/${id}/transition`, null, { params });
    }

    assignWorkflow(id: string, workflowId: string): Observable<DocumentQms> {
        const params = new HttpParams().set('workflowId', workflowId);
        return this.http.post<DocumentQms>(`${QualiUrlConfig.QMS_DOCUMENT_ROOT_URL}/${id}/workflow`, null, { params });
    }


    linkToNonConformity(id: string, ncRef: string, actionCorrective: string): Observable<DocumentQms> {
        const params = new HttpParams().set('ncRef', ncRef).set('actionCorrective', actionCorrective);
        return this.http.post<DocumentQms>(`${QualiUrlConfig.QMS_DOCUMENT_ROOT_URL}/${id}/link-nc`, null, { params });
    }

    exportSecuredPdf(id: string): Observable<Blob> {
        return this.http.get(`${QualiUrlConfig.QMS_DOCUMENT_ROOT_URL}/${id}/export-pdf`, {
            responseType: 'blob'
        });
    }

    getVersionHistory(id: string): Observable<QmsDocumentVersion[]> {
        return this.http.get<any>(`${QualiUrlConfig.QMS_DOCUMENT_ROOT_URL}/${id}/versions`).pipe(
            map(res => {
                if (Array.isArray(res)) return res;
                if (res?.data?.content) return res.data.content;
                if (res?.data) return Array.isArray(res.data) ? res.data : [];
                return [];
            })
        );
    }

    getAuditLogs(id: string): Observable<QmsAuditLog[]> {
        return this.http.get<any>(`${QualiUrlConfig.QMS_DOCUMENT_ROOT_URL}/${id}/audit-logs`).pipe(
            map(res => {
                if (Array.isArray(res)) return res;
                if (res?.data?.content) return res.data.content;
                if (res?.data) return Array.isArray(res.data) ? res.data : [];
                return [];
            })
        );
    }

    searchDocuments(filters: Record<string, any>): Observable<DocumentQms[]> {
        let params = new HttpParams();
        Object.keys(filters).forEach(key => {
            if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
                 if (Array.isArray(filters[key])) {
                     filters[key].forEach((v: any) => params = params.append(key, v));
                 } else {
                     params = params.set(key, filters[key].toString());
                 }
            }
        });
        return this.http.get<any>(`${QualiUrlConfig.QMS_DOCUMENT_ROOT_URL}/search`, { params }).pipe(
            map(res => {
                if (Array.isArray(res)) return res;
                if (res?.data?.content) return res.data.content;
                if (res?.content) return res.content;
                if (res?.data) return Array.isArray(res.data) ? res.data : [];
                return [];
            })
        );
    }

    getDocumentStats(): Observable<DocumentStatsDto> {
        return this.http.get<any>(`${QualiUrlConfig.QMS_DOCUMENT_ROOT_URL}/stats`).pipe(
            map(res => res?.data ?? res)
        );
    }

    getDocumentStatsByDimension(dimension: string): Observable<Record<string, number>> {
        return this.http.get<any>(`${QualiUrlConfig.QMS_DOCUMENT_ROOT_URL}/stats/by/${dimension}`).pipe(
            map(res => {
                const data = res?.data ?? res;
                if (data && typeof data === 'object' && !Array.isArray(data)) {
                    return data;
                }
                return {};
            })
        );
    }

    getDocumentById(id: string): Observable<DocumentQms> {
        return this.http.get<any>(`${QualiUrlConfig.QMS_DOCUMENT_ROOT_URL}/${id}`).pipe(
            map(res => res?.data ?? res)
        );
    }

    // --- Document Access Management (ACL) ---
    
    grantAccess(id: string, userId: string, userFullName: string, userEmail: string, role: string): Observable<DocumentUserAccess> {
        const formData = new FormData();
        formData.append('userId', userId);
        if (userFullName) formData.append('userFullName', userFullName);
        if (userEmail) formData.append('userEmail', userEmail);
        formData.append('role', role);
        return this.http.post<DocumentUserAccess>(`${QualiUrlConfig.QMS_DOCUMENT_ROOT_URL}/${id}/access`, formData);
    }

    revokeAccess(id: string, userId: string): Observable<void> {
        return this.http.delete<void>(`${QualiUrlConfig.QMS_DOCUMENT_ROOT_URL}/${id}/access/${userId}`);
    }

    getDocumentAccess(id: string): Observable<DocumentUserAccess[]> {
        return this.http.get<any>(`${QualiUrlConfig.QMS_DOCUMENT_ROOT_URL}/${id}/access`).pipe(
            map(res => {
                if (Array.isArray(res)) return res;
                if (res?.data?.content) return res.data.content;
                if (res?.data) return Array.isArray(res.data) ? res.data : [];
                return [];
            })
        );
    }

    // --- Shared Documents ---

    getMySharedDocuments(): Observable<SharedDocumentDto[]> {
        return this.http.get<SharedDocumentDto[]>(`${QualiUrlConfig.QMS_DOCUMENT_ROOT_URL}/shared/me`);
    }

    getSharedDocumentsForUser(userId: string): Observable<SharedDocumentDto[]> {
        return this.http.get<SharedDocumentDto[]>(`${QualiUrlConfig.QMS_DOCUMENT_ROOT_URL}/shared/${userId}`);
    }

}
