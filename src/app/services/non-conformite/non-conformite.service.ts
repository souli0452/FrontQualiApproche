import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams, HttpResponse } from '@angular/common/http';
import {ApiItemResponse, ApiResponse, NonConformite} from "../../models";
import { BehaviorSubject, map, Observable } from 'rxjs';
import { NcStats } from '../../models/statsNc';
import { QualiCrudService } from '../quali-crud.service';
import { QualiUrlConfig } from '../quali-url-configs';
import { BaseCrudService } from '../base-crud.service';
import { NonConformiteUrlConfig } from '../../components/non-conformite/config/proc-non-conformite.urls.configs';
import { EtapeTraitement, NonConformStatus } from '../../enums';



@Injectable({providedIn: 'root'})
export class NonConformiteService extends BaseCrudService<NonConformite, string> {
    constructor(public override http: HttpClient) {
        super(http, QualiUrlConfig.NON_CONFORMITE_ROOT_URL);
    }

    getCountByStatus(id:any): Observable<HttpResponse<Array<NcStats>>> {
        return this.http.get<any>(`${QualiUrlConfig.NON_CONFORMITE_ROOT_URL}/count-by-status/${id}`, {observe: 'response'});
    }

    public notificationsNC$ = new BehaviorSubject<any>({
        total: 0,
        brouillons: 0,
        imputees: 0,
        reception: 0,
        validationRQ: 0,
        enAttenteValidation: 0,
        validationPilote: 0,
        cloture: 0,
        affectation: 0,
        nonTraiter: 0
    });

    // =========================
    // Helpers internes multi-root
    // =========================

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
    ): Observable<ApiResponse<NonConformite>> {
        return this.http.get<ApiResponse<NonConformite>>(url, {
            params: this.buildNcParams(params),
            headers: this.buildNcHeaders(headers)
        });
    }

    private getListFromUrl(
        url: string,
        params?: Record<string, any>,
        headers?: Record<string, string>
    ): Observable<NonConformite[]> {
        return this.getPageFromUrl(url, params, headers).pipe(
            map((res: any) => res.data?.content ?? [])
        );
    }

    private getItemFromUrl(
        url: string,
        headers?: Record<string, string>
    ): Observable<ApiItemResponse<NonConformite>> {
        return this.http.get<ApiItemResponse<NonConformite>>(url, {
            headers: this.buildNcHeaders(headers)
        });
    }


    /**
     * Récupérer les NC d’un utilisateur
     */
    getNCByUser(userId: string): Observable<NonConformite[]> {
        return this.getListFromUrl(
            `${NonConformiteUrlConfig.GET_NON_CONFORMITE_BY_STATUS_ROOT_URL}user/${userId}`
        );
    }

    findNCById(id: string, headers?: Record<string, string>): Observable<ApiItemResponse<NonConformite>> {
        const httpHeaders = this.buildNcHeaders(headers);

        return this.http.get<ApiItemResponse<NonConformite>>(`${this.uri}/get/${id}`, {
            headers: httpHeaders
        });
    }

    nonConformiteGetAll(
        page: number = 0,
        size: number = 10,
        filters?: Record<string, any>,
        headers?: Record<string, string>
    ): Observable<ApiResponse<any>> {
        const params = this.buildParams({ page, size, ...filters });
        const httpHeaders = this.buildHeaders(headers);
        return this.http.get<ApiResponse<any>>(NonConformiteUrlConfig.GET_NON_CONFORMITE_ALL, {params, headers: httpHeaders});
    }

    nonConformiteByStructureGetPagination(
        id:any,
        page: number = 0,
        size: number = 10,
        filters?: Record<string, any>,
        headers?: Record<string, string>
    ): Observable<ApiResponse<any>> {
        const params = this.buildParams({ page, size, ...filters });
        const httpHeaders = this.buildHeaders(headers);
        return this.http.get<ApiResponse<any>>(NonConformiteUrlConfig.GET_NON_CONFORMITE_ALL+`/structure/${id}`, {params: params, headers: httpHeaders});
    }

    /**
     * Récupérer les NC imputées à un utilisateur
     */
    nonConformiteImputesGetPagination(
        userId :string,
        etapeTraitement: EtapeTraitement,
        page: number = 0,
        size: number = 10,
        filters?: Record<string, any>,
        headers?: Record<string, string>
    ): Observable<ApiResponse<any>> {
        // 1. On prépare les paramètres de pagination et les filtres comme dans findAll
        const params = this.buildParams({ page, size, ...filters });
        const httpHeaders = this.buildHeaders(headers);

        // 2. On construit l'URL cible avec l'étape de traitement
        const url = `${NonConformiteUrlConfig.GET_NON_CONFORMITE_IMPUTED}${userId}/${etapeTraitement}`;

        // 3. On fait l'appel HTTP en passant les paramètres de pagination
        return this.http.get<ApiResponse<any>>(url, {
            params,
            headers: httpHeaders
        });
    }


    /**
     * Récupérer les NC par étape
     */
    getNonConformiteByEtape(etapeTraitement: EtapeTraitement): Observable<NonConformite[]> {
        return this.getListFromUrl(
            `${NonConformiteUrlConfig.GET_NON_CONFORMITE_BY_STATUS_ROOT_URL}${etapeTraitement}`,
            {},
            { 'X-Skip-Loader': 'true' }
        );
    }
    nonConformiteParEtapeGet(
        etapeTraitement: EtapeTraitement,
        headers?: Record<string, string>
    ): Observable<ApiResponse<any>> {
        return this.getPageFromUrl(
            `${NonConformiteUrlConfig.GET_NON_CONFORMITE_BY_STATUS_ROOT_URL}${etapeTraitement}`,
            headers
        );
    }

    nonConformiteParEtapeGetPagination(
        etapeTraitement: EtapeTraitement,
        page: number = 0,
        size: number = 10,
        filters?: Record<string, any>,
        headers?: Record<string, string>
    ): Observable<ApiResponse<any>> {
        // 1. On prépare les paramètres de pagination et les filtres comme dans findAll
        const params = this.buildParams({ page, size, ...filters });
        const httpHeaders = this.buildHeaders(headers);

        // 2. On construit l'URL cible avec l'étape de traitement
        const url = `${NonConformiteUrlConfig.GET_NON_CONFORMITE_BY_STATUS_ROOT_URL}${etapeTraitement}`;

        // 3. On fait l'appel HTTP en passant les paramètres de pagination
        return this.http.get<ApiResponse<any>>(url, {
            params,
            headers: httpHeaders
        });
    }
    /**
     * Mettre à jour les Non-Conformités réceptionnées par le Pilote
     */
    nonConformiteUpdate
        (demandes: any[]
        ): Observable<ApiResponse<any>> {
        const httpHeaders = this.buildNcHeaders();
        return this.http.put<ApiResponse<any>>(NonConformiteUrlConfig.UPDATE_NON_CONFORMITE, demandes, {
            headers: httpHeaders
        });
    }
    /**
     * Récupérer les Non-Conformités en réception par étape et structure
     */
    nonConformiteParStructureEtTraitementGet(
        etapeTraitement: EtapeTraitement,
        structureId: string,
        headers?: Record<string, string>
    ): Observable<ApiResponse<any>> {
        return this.getPageFromUrl(
            NonConformiteUrlConfig.GET_NON_CONFORMITE_BY_ETAPE_SUMIT+`/${etapeTraitement}/${structureId}`,
            headers
        );
    }
    nonConformiteParStructureEtTraitementGetPagination(
        etapeTraitement: EtapeTraitement,
        structureId: string,
        page: number = 0,
        size: number = 10,
        filters?: Record<string, any>,
        headers?: Record<string, string>
    ): Observable<ApiResponse<any>> {
        // 1. On prépare les paramètres de pagination et les filtres comme dans findAll
        const params = this.buildParams({ page, size, ...filters });
        const httpHeaders = this.buildHeaders(headers);

        // 2. On construit l'URL cible avec l'étape de traitement
        const url = `${NonConformiteUrlConfig.GET_NON_CONFORMITE_BY_ETAPE_SUMIT}${etapeTraitement}/${structureId}`;

        // 3. On fait l'appel HTTP en passant les paramètres de pagination
        return this.http.get<ApiResponse<any>>(url, {
            params,
            headers: httpHeaders
        });
    }

    nonConformiteParStructureEtOrigineGet(
        etapeTraitement: EtapeTraitement,
        structureId: string
    ): Observable<ApiResponse<NonConformite>> {
        return this.http.get<ApiResponse<NonConformite>>(
            NonConformiteUrlConfig.GET_NON_CONFORMITE_BY_ETAPE_ORIGIN + etapeTraitement + `/${structureId}`,
            {
                headers: { 'X-Skip-Loader': 'true' }
            }
        );
    }

    /**
     * Récupérer les NC par étape + structure
     */
    nonConformiteParStructureEtOrigineGetPagination(
        etapeTraitement: EtapeTraitement,
        structureId: string,
        page: number = 0,
        size: number = 10,
        filters?: Record<string, any>,
        headers?: Record<string, string>
    ): Observable<ApiResponse<any>> {
        // 1. On prépare les paramètres de pagination et les filtres comme dans findAll
        const params = this.buildParams({ page, size, ...filters });
        const httpHeaders = this.buildHeaders(headers);

        // 2. On construit l'URL cible avec l'étape de traitement
        const url = `${NonConformiteUrlConfig.GET_NON_CONFORMITE_BY_ETAPE_ORIGIN}${etapeTraitement}/${structureId}`;

        // 3. On fait l'appel HTTP en passant les paramètres de pagination
        return this.http.get<ApiResponse<any>>(url, {
            params,
            headers: httpHeaders
        });
    }

    nonConformitePlanActionsGetPagination(
        email:string,
        status:any,
        page: number = 0,
        size: number = 5,
        filters?: Record<string, any>,
        headers?: Record<string, string>
    ): Observable<ApiResponse<any>> {
        // 1. On prépare les paramètres de pagination et les filtres comme dans findAll
        const params = this.buildParams({ page, size, ...filters });
        const httpHeaders = this.buildHeaders(headers);

        // 2. On construit l'URL cible avec l'étape de traitement
        const url = `${NonConformiteUrlConfig.GET_PLAN_ACTION}${email}/${status}`;

        // 3. On fait l'appel HTTP en passant les paramètres de pagination
        return this.http.get<ApiResponse<any>>(url, {
            params,
            headers: httpHeaders
        });
    }


    /**
     * Récupérer les Non-Conformités en validation RQ
     */
    nonConformiteValidationRQGet(etapeTraitement: EtapeTraitement): Observable<NonConformite[]> {
        return this.getListFromUrl(
            `${NonConformiteUrlConfig.GET_NON_CONFORMITE_BY_STATUS_ROOT_URL}${etapeTraitement}`,
            {},
            { 'X-Skip-Loader': 'true' }
        );
    }

    nonConformiteParUtilisateurGetPagination(
        userId: string,
        page: number = 0,
        size: number = 10
    ): Observable<ApiResponse<NonConformite>> {

        const params = this.buildParams({ page, size });

        return this.http.get<ApiResponse<NonConformite>>(
            `${NonConformiteUrlConfig.GET_NON_CONFORMITE_BY_STATUS_ROOT_URL}user/${userId}`,
            { params }
        );
    }

    /**
     * Récupérer les NC avec pagination + filtre status + id
     */
    getAllNC(
        page: number = 0,
        size: number = 10,
        status?: string,
        id?: any,
        headers?: Record<string, string>
    ): Observable<ApiResponse<NonConformite>> {
        return this.getPageFromUrl(
            NonConformiteUrlConfig.GET_NON_CONFORMITE_BY_STATUS_ROOT_URL,
            { page, size, status, id },
            headers
        );
    }

    nonConformiteImputeParUtilisateur(userId:string): Observable<HttpResponse<any>> {
        return this.http.get<any>(NonConformiteUrlConfig.GET_NON_CONFORMITE_BY_STATUS_ROOT_URL + "user/"+userId+"/imputed", { observe: 'response' });
    }

    /**
     * Récupérer les stats pour le Dashboard de l'Agent
     */
    nonConformiteDashboardAgent(id: string): Observable<HttpResponse<any>> {
        return this.http.get<any>(NonConformiteUrlConfig.GET_NON_CONFORMITE_BY_STATUS_ROOT_URL + "dashboard/user/" + id, { observe: 'response' });
    }

    nonConformiteDashboardRq(): Observable<HttpResponse<any>> {
        return this.http.get<any>(NonConformiteUrlConfig.GET_NON_CONFORMITE_BY_STATUS_ROOT_URL + "/dashboard/rq", { observe: 'response' });
    }

    nonConformiteDashboardPilot(structureId:string): Observable<HttpResponse<any>> {
        return this.http.get<any>(NonConformiteUrlConfig.GET_NON_CONFORMITE_BY_STATUS_ROOT_URL + "dashboard/pilot/" + structureId, { observe: 'response' });
    }

    nonConformiteEvolutionGet(annee: number, mois?: number, structureId?: string): Observable<HttpResponse<any>> {
        let params = new HttpParams().set('annee', annee.toString());
        if (mois !== undefined && mois !== null) {
            params = params.set('mois', mois.toString());
        }
        if (structureId) {
            params = params.set('structureId', structureId);
        }
        return this.http.get<any>(NonConformiteUrlConfig.GET_NON_CONFORMITE_BY_STATUS_ROOT_URL + "stats/evolution", { params, observe: 'response' });
    }


    nonConformitePlanActionsGet(email:string,status:any): Observable<HttpResponse<Array<any>>> {
        return this.http.get<Array<any>>(NonConformiteUrlConfig.GET_PLAN_ACTION+email+`/${status}`, {observe: 'response'});
    }

    nonConformiteUpdatePlanAction(demande: any): Observable<HttpResponse<any>> {
        return this.http.put<any>(NonConformiteUrlConfig.UPDATE_PLAN_ACTION , demande, {observe: 'response'});
    }



    getNonConformiteImputed(userId :string,etapeTraitement :EtapeTraitement): Observable<HttpResponse<Array<any>>> {
        return this.http.get<Array<any>>(NonConformiteUrlConfig.GET_NON_CONFORMITE_IMPUTED+userId+`/${etapeTraitement}`, {observe: 'response', headers: {'X-Skip-Loader': 'true'}});
    }
}

    