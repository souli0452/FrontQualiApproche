import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams, HttpResponse } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { QualiUrlConfig } from '../quali-url-configs';
import { BaseCrudService } from '../base-crud.service';
import { DocumentQms, QmsDocumentType, QmsDocumentVersion, QmsAuditLog, DocumentStatsDto, DocumentUserAccess, SharedDocumentDto } from '../../models/gestion-documentaire.model';
import { ApiItemResponse, ApiResponse } from '../../models/response.model';
import { OptionsLoadEvent, OptionsLoader } from '../../shared/ui/lazy-options.model';


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

    /**
     * Chargeur des types documentaires pour les listes déroulantes : page par page, recherche
     * servie par le serveur. `chargerOptions` hérité ne convient pas ici — l'URL de ce service
     * pointe déjà sur les types, mais la forme attendue reste la même.
     */
    readonly chargerOptionsTypes: OptionsLoader<QmsDocumentType> = (event: OptionsLoadEvent) =>
        this.typeDocumentQmsGetAll(event.page, event.limit, { search: event.search }).pipe(
            map((res: any) => {
                const donnees = res?.data ?? res;
                const options = (donnees?.content ?? (Array.isArray(donnees) ? donnees : [])) as QmsDocumentType[];
                return {
                    options,
                    totalRecords: donnees?.totalElements ?? options.length,
                    hasMore: donnees?.last === undefined ? undefined : !donnees.last
                };
            })
        );

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

    /**
     * Change le niveau de confidentialité d'un document déposé.
     *
     * <p>Réservé à l'administration générale et au responsable qualité. Rend l'avertissement du
     * serveur lorsque le nouveau niveau ferme le circuit du document, ou `null` sinon.</p>
     */
    reclasser(id: string, niveauId: string | null, niveauLibelle: string | null): Observable<string | null> {
        const params = new HttpParams()
            .set('niveauConfidentialiteId', niveauId ?? '')
            .set('niveauConfidentialiteLibelle', niveauLibelle ?? '');
        return this.http
            .put<any>(`${QualiUrlConfig.QMS_DOCUMENT_ROOT_URL}/${id}/niveau-confidentialite`, null, { params })
            .pipe(map((res: any) => res?.data ?? null));
    }

    createDocument(file: File, documentData: Record<string, any>): Observable<DocumentQms> {
        const formData = new FormData();
        formData.append('file', file);
        Object.keys(documentData).forEach(key => {
            if (documentData[key] !== null && documentData[key] !== undefined) {
                formData.append(key, documentData[key].toString());
            }
        });
        // Déplié de son enveloppe : sans cela le document rendu était `{ success, data }`, et le
        // message de confirmation annonçait « Le document undefined a été enregistré » — tandis que
        // l'avertissement sur le classement, porté par la même charge, ne s'affichait jamais.
        return this.http.post<any>(QualiUrlConfig.QMS_DOCUMENT_ROOT_URL, formData).pipe(
            map(res => res?.data ?? res)
        );
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

    /**
     * Chargeur des documents accessibles pour les listes déroulantes : page par page, la saisie
     * portée au serveur par le critère `query`.
     *
     * <p>Sans lui, le sélecteur n'offrait que les dix premiers documents — la recherche étant
     * paginée d'office — et aucun moyen d'atteindre les autres.</p>
     */
    /**
     * Documents proposés à une demande de modification : ceux qui sont **en vigueur**, et eux seuls.
     *
     * <p>Une modification se demande sur un texte approuvé — c'est ce que le serveur exige, en 409.
     * Un document encore en rédaction se corrige en déposant une version, sans instruction ni
     * décision ; un document obsolète ne se modifie plus, il se remplace. Les proposer revenait à
     * faire saisir une demande entière pour la voir refusée à l'envoi.</p>
     */
    readonly chargerOptionsDocumentsEnVigueur: OptionsLoader<DocumentQms> = (event: OptionsLoadEvent) =>
        this.http
            .get<any>(`${QualiUrlConfig.QMS_DOCUMENT_ROOT_URL}/search`, {
                params: this.buildParams({
                    page: event.page, size: event.limit, query: event.search, status: ['valide']
                })
            })
            .pipe(
                map((res: any) => {
                    const donnees = res?.data ?? res;
                    const options = (donnees?.content ?? (Array.isArray(donnees) ? donnees : [])) as DocumentQms[];
                    return {
                        options,
                        totalRecords: donnees?.totalElements ?? options.length,
                        hasMore: donnees?.last === undefined ? undefined : !donnees.last
                    };
                })
            );

    readonly chargerOptionsDocuments: OptionsLoader<DocumentQms> = (event: OptionsLoadEvent) =>
        this.http
            .get<any>(`${QualiUrlConfig.QMS_DOCUMENT_ROOT_URL}/search`, {
                params: this.buildParams({ page: event.page, size: event.limit, query: event.search })
            })
            .pipe(
                map((res: any) => {
                    const donnees = res?.data ?? res;
                    const options = (donnees?.content ?? (Array.isArray(donnees) ? donnees : [])) as DocumentQms[];
                    return {
                        options,
                        totalRecords: donnees?.totalElements ?? options.length,
                        hasMore: donnees?.last === undefined ? undefined : !donnees.last
                    };
                })
            );

    /**
     * Recherche paginée : le contenu de la page et le total du fonds visible.
     *
     * <p>Un tableau qui pagine côté serveur a besoin du total pour dimensionner sa barre de
     * pagination — sans lui, il ne peut pas savoir qu'il existe une page suivante.</p>
     */
    rechercherDocumentsPagines(filters: Record<string, any>): Observable<{ contenu: DocumentQms[]; total: number }> {
        // `buildParams` écraserait un critère multivalué comme `status` : chaque valeur doit être
        // répétée dans la requête, non concaténée.
        let params = new HttpParams();
        Object.keys(filters).forEach((cle) => {
            const valeur = filters[cle];
            if (valeur === null || valeur === undefined || valeur === '') {
                return;
            }
            if (Array.isArray(valeur)) {
                valeur.forEach((v: any) => (params = params.append(cle, v)));
            } else {
                params = params.set(cle, valeur.toString());
            }
        });

        return this.http
            .get<any>(`${QualiUrlConfig.QMS_DOCUMENT_ROOT_URL}/search`, { params })
            .pipe(
                map((res: any) => {
                    const donnees = res?.data ?? res;
                    const contenu = (donnees?.content ?? (Array.isArray(donnees) ? donnees : [])) as DocumentQms[];
                    return { contenu, total: donnees?.totalElements ?? contenu.length };
                })
            );
    }

    /**
     * Documents que j'ai à traiter, l'état de leur circuit joint à chaque ligne.
     *
     * C'est le circuit qui les désigne — lui seul porte l'habilitation de chaque étape. Les écrans
     * qui listaient par statut montraient à chacun les dossiers de tous, et le refus tombait au
     * moment de décider. Les `allowedActions` de chaque ligne permettent d'agir sur place.
     */
    documentsATraiter(): Observable<DocumentQms[]> {
        return this.http.get<any>(`${QualiUrlConfig.QMS_DOCUMENT_ROOT_URL}/a-traiter`).pipe(
            map(res => res?.data ?? res ?? [])
        );
    }

    /**
     * Dépose une pièce réclamée par une étape du circuit et rend sa référence.
     *
     * <p>C'est le contrat du dialogue de décision : « déposer d'abord, référencer ensuite » — le
     * moteur ne transporte que des chaînes, et c'est la référence rendue ici qui devient la valeur du
     * champ. Sans ce dépôt, une étape réclamant un justificatif était indécidable depuis l'écran.</p>
     */
    deposerFichierDEtape(documentId: string, fichier: File): Observable<string> {
        const corps = new FormData();
        corps.append('file', fichier, fichier.name);
        return this.http
            .post<any>(`${QualiUrlConfig.QMS_DOCUMENT_ROOT_URL}/${documentId}/fichiers-etape`, corps)
            .pipe(map((reponse: any) => reponse?.data ?? reponse));
    }

    /** Adresse de téléchargement d'une pièce d'étape, désignée par sa référence. */
    urlFichierDEtape(documentId: string, reference: string): string {
        return `${QualiUrlConfig.QMS_DOCUMENT_ROOT_URL}/${documentId}/fichiers-etape/contenu`
            + `?reference=${encodeURIComponent(reference)}`;
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

    /**
     * Partage le document avec une structure entière : tous ses membres y accèdent en lecture et
     * en téléchargement, sans avoir à être nommés un à un.
     *
     * La cible est choisie à l'étape où l'on décide de partager. Le serveur consigne cette étape
     * et refuse le partage vers la structure émettrice, dont les membres voient déjà le document.
     */
    partagerAvecStructureDestinataire(id: string, structureId: string,
                                      structureLibelle?: string): Observable<any> {
        const params = new HttpParams()
            .set('structureId', structureId)
            .set('structureLibelle', structureLibelle ?? '');
        return this.http.post<any>(
            `${QualiUrlConfig.QMS_DOCUMENT_ROOT_URL}/${id}/share/structure`, null, { params });
    }

    retirerPartageStructure(id: string, structureId: string): Observable<void> {
        return this.http.delete<void>(
            `${QualiUrlConfig.QMS_DOCUMENT_ROOT_URL}/${id}/share/structure/${structureId}`);
    }

    getPartagesStructure(id: string): Observable<any[]> {
        return this.http.get<any>(`${QualiUrlConfig.QMS_DOCUMENT_ROOT_URL}/${id}/share/structure`).pipe(
            map(res => res?.data?.content ?? res?.data ?? res ?? [])
        );
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
        return this.http.get<any>(`${QualiUrlConfig.QMS_DOCUMENT_ROOT_URL}/shared/me`).pipe(
            map(res => {
                if (Array.isArray(res)) return res;
                if (res?.data?.content) return res.data.content;
                if (res?.data) return Array.isArray(res.data) ? res.data : [];
                if (res?.content) return res.content;
                return [];
            })
        );
    }

}
