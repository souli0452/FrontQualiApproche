import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { QualiUrlConfig } from './quali-url-configs';

export interface QmsDocumentType {
  id?: string;
  code: string;
  libelle: string;
  folderName: string;
  createdAt?: string;
  createdById?: string;
  currentUserfullName?: string;
}

export interface DocumentQms {
  id?: string;
  documentNumber?: string;
  documentType: string;
  serviceId: string;
  serviceLibelle?: string;
  serviceSigle?: string;
  redacteur: string;
  status?: string;
  versionMajeure?: number;
  versionMineure?: number;
  dateVigueur?: string;
  dateProchRevision?: string;
  periodiciteMois?: number;
  confidentiel?: boolean;
  documentExterne?: boolean;
  organismeEmetteur?: string;
  referenceOfficielle?: string;
  datePublication?: string;
  domaine?: string;
  statutLegal?: string;
  alfrescoNodeId?: string;
  ncReference?: string;
  archived?: boolean;
  createdAt?: string;
  createdById?: string;
  currentUserfullName?: string;
}

export interface QmsDocumentVersion {
  id?: number;
  documentId: string;
  versionLabel: string;
  dateCreation: string;
  createdBy: string;
  comment: string;
  alfrescoNodeId: string;
}

export interface QmsAuditLog {
  id?: number;
  action: string;
  documentNumber: string;
  timestamp: string;
  username: string;
  details: string;
}

@Injectable({
    providedIn: 'root'
})
export class QmsDocumentService {
    constructor(private http: HttpClient) {}

    // --- Document Type APIs ---
    getAllTypes(): Observable<QmsDocumentType[]> {
        console.log('Appel API vers :', QualiUrlConfig.QMS_DOCUMENT_TYPE_ROOT_URL);
        return this.http.get<QmsDocumentType[]>(QualiUrlConfig.QMS_DOCUMENT_TYPE_ROOT_URL);
    }

    getTypeById(id: string): Observable<QmsDocumentType> {
        return this.http.get<QmsDocumentType>(`${QualiUrlConfig.QMS_DOCUMENT_TYPE_ROOT_URL}/${id}`);
    }

    createType(type: QmsDocumentType): Observable<QmsDocumentType> {
        return this.http.post<QmsDocumentType>(QualiUrlConfig.QMS_DOCUMENT_TYPE_ROOT_URL, type);
    }

    updateType(id: string, type: QmsDocumentType): Observable<QmsDocumentType> {
        return this.http.put<QmsDocumentType>(`${QualiUrlConfig.QMS_DOCUMENT_TYPE_ROOT_URL}/${id}`, type);
    }

    deleteType(id: string): Observable<void> {
        return this.http.delete<void>(`${QualiUrlConfig.QMS_DOCUMENT_TYPE_ROOT_URL}/${id}`);
    }

    // --- Document QMS APIs ---
    createDocument(formData: FormData): Observable<DocumentQms> {
        return this.http.post<DocumentQms>(QualiUrlConfig.QMS_DOCUMENT_ROOT_URL, formData);
    }

    transitionStatus(id: string, nextStatus: string, reason: string): Observable<DocumentQms> {
        const params = new HttpParams().set('nextStatus', nextStatus).set('reason', reason);
        return this.http.post<DocumentQms>(`${QualiUrlConfig.QMS_DOCUMENT_ROOT_URL}/${id}/transition`, null, { params });
    }

    linkToNonConformity(id: string, ncRef: string, actionCorrective: string): Observable<DocumentQms> {
        const params = new HttpParams().set('ncRef', ncRef).set('actionCorrective', actionCorrective);
        return this.http.post<DocumentQms>(`${QualiUrlConfig.QMS_DOCUMENT_ROOT_URL}/${id}/link-nc`, null, { params });
    }

    exportSecuredPdf(id: string): Observable<HttpResponse<Blob>> {
        return this.http.get(`${QualiUrlConfig.QMS_DOCUMENT_ROOT_URL}/${id}/export-pdf`, {
            responseType: 'blob',
            observe: 'response'
        });
    }

    getVersionHistory(id: string): Observable<QmsDocumentVersion[]> {
        return this.http.get<QmsDocumentVersion[]>(`${QualiUrlConfig.QMS_DOCUMENT_ROOT_URL}/${id}/versions`);
    }

    getAuditLogs(id: string): Observable<QmsAuditLog[]> {
        return this.http.get<QmsAuditLog[]>(`${QualiUrlConfig.QMS_DOCUMENT_ROOT_URL}/${id}/audit-logs`);
    }

    searchDocuments(filters: { query?: string; documentType?: string; serviceId?: string; status?: string[]; dateFrom?: string; dateTo?: string }): Observable<DocumentQms[]> {
        let params = new HttpParams();
        if (filters.query) params = params.set('query', filters.query);
        if (filters.documentType) params = params.set('documentType', filters.documentType);
        if (filters.serviceId) params = params.set('serviceId', filters.serviceId);
        if (filters.status && filters.status.length > 0) {
            filters.status.forEach((s) => (params = params.append('status', s)));
        }
        if (filters.dateFrom) params = params.set('dateFrom', filters.dateFrom);
        if (filters.dateTo) params = params.set('dateTo', filters.dateTo);

        return this.http.get<DocumentQms[]>(`${QualiUrlConfig.QMS_DOCUMENT_ROOT_URL}/search`, { params });
    }

    createAlfrescoUser(user: any): Observable<void> {
        return this.http.post<void>(`${QualiUrlConfig.QMS_DOCUMENT_ROOT_URL}/users`, user);
    }

    getAlfrescoUsers(): Observable<any[]> {
        return this.http.get<any[]>(`${QualiUrlConfig.QMS_DOCUMENT_ROOT_URL}/users`);
    }

    assignPermissions(id: string, payload: { username: string; role: string }): Observable<void> {
        return this.http.post<void>(`${QualiUrlConfig.QMS_DOCUMENT_ROOT_URL}/${id}/permissions`, payload);
    }

    getShareLink(id: string): Observable<{ sharedId: string }> {
        return this.http.get<{ sharedId: string }>(`${QualiUrlConfig.QMS_DOCUMENT_ROOT_URL}/${id}/share-link`);
    }

    getAosUrl(id: string): Observable<{ aosUrl: string }> {
        return this.http.get<{ aosUrl: string }>(`${QualiUrlConfig.QMS_DOCUMENT_ROOT_URL}/${id}/aos-url`);
    }
}
