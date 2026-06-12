import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams, HttpResponse } from '@angular/common/http';
import {ApiItemResponse, ApiResponse, NonConformite} from "../../models";
import { map, Observable } from 'rxjs';
import { NcStats } from '../../models/statsNc';
import { QualiCrudService } from '../quali-crud.service';
import { QualiUrlConfig } from '../quali-url-configs';
import { BaseCrudService } from '../base-crud.service';
import { NonConformiteUrlConfig } from '../../components/non-conformite/config/proc-non-conformite.urls.configs';
import { EtapeTraitement, NonConformStatus } from '../../enums';



@Injectable({providedIn: 'root'})
// export class NonConformiteService extends QualiCrudService<NonConformite, string> {
//     constructor(public override http: HttpClient) {
//         super(http, QualiUrlConfig.NON_CONFORMITE_ROOT_URL);
//     }

//     getCountByStatus(id:any): Observable<HttpResponse<Array<NcStats>>> {
//         return this.http.get<any>(`${QualiUrlConfig.NON_CONFORMITE_ROOT_URL}/count-by-status/${id}`, {observe: 'response'});
//     }
// }
export class NonConformiteService extends BaseCrudService<NonConformite, string> {
    constructor(public override http: HttpClient) {
        super(http, QualiUrlConfig.NON_CONFORMITE_ROOT_URL);
    }

    getCountByStatus(id:any): Observable<HttpResponse<Array<NcStats>>> {
        return this.http.get<any>(`${QualiUrlConfig.NON_CONFORMITE_ROOT_URL}/count-by-status/${id}`, {observe: 'response'});
    }

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

    // =========================
    // CRUD standard si besoin
    // =========================
    // hérité depuis BaseCrudService :
    // findAll / findById / create / update / delete ...

    // =========================
    // Méthodes métier NC
    // =========================

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

    /**
     * Récupérer les NC imputées à un utilisateur
     */
    findImputedByUserId(userId: string): Observable<NonConformite[]> {
        return this.getListFromUrl(
            `${NonConformiteUrlConfig.GET_NON_CONFORMITE_BY_STATUS_ROOT_URL}user/${userId}/imputed`
        );
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

    /**
     * Récupérer les NC par étape + structure
     */
    getNonConformiteByEtapeAndOrigin(
        etapeTraitement: EtapeTraitement,
        structureId: string
    ): Observable<NonConformite[]> {
        return this.getListFromUrl(
            `${NonConformiteUrlConfig.GET_NON_CONFORMITE_BY_ETAPE_ORIGIN}${etapeTraitement}/${structureId}`,
            {},
            { 'X-Skip-Loader': 'true' }
        );
    }

    getNCByUserPaged(
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

    nonConformiteParEtape(
        etapeTraitement: EtapeTraitement,
        structureId: string,
        headers?: Record<string, string>
    ): Observable<ApiResponse<any>> {
        return this.getPageFromUrl(
            NonConformiteUrlConfig.GET_NON_CONFORMITE_BY_ETAPE_SUMIT+`/${etapeTraitement}/${structureId}`,
            headers
        );
    }

    nonConformiteReceptionUpdate
        (demandes: any[]
        ): Observable<ApiResponse<any>> {
        const httpHeaders = this.buildNcHeaders();
        return this.http.put<ApiResponse<any>>(NonConformiteUrlConfig.UPDATE_NON_CONFORMITE, demandes, {
            headers: httpHeaders
        });
    }

    // nonConformiteReceptionUpdate(demandes: any[]): Observable<HttpResponse<any>> {
    //     console.log('Route vers le BACKEND Demandes->',demandes);
        
    //     return this.http.put<any>(NonConformiteUrlConfig.UPDATE_NON_CONFORMITE , demandes, {observe: 'response'});
    // }


    getNonConformiteImputed(userId :string,etapeTraitement :EtapeTraitement): Observable<HttpResponse<Array<any>>> {
        return this.http.get<Array<any>>(NonConformiteUrlConfig.GET_NON_CONFORMITE_IMPUTED+userId+`/${etapeTraitement}`, {observe: 'response', headers: {'X-Skip-Loader': 'true'}});
    }

    /**
     * Variante qui retourne directement la liste
     */
    // findAllNcAsList(
    //     page: number = 0,
    //     size: number = 10,
    //     status?: string,
    //     id?: any,
    //     headers?: Record<string, string>
    // ): Observable<NonConformite[]> {
    //     return this.findAllNc(page, size, status, id, headers).pipe(
    //         map(res => res.data?.content ?? [])
    //     );
    // }

    /**
     * Helper métier lisible : NC archivées par structure
     */
    // findArchivedByStructure(
    //     structureId: string,
    //     page: number = 0,
    //     size: number = 10
    // ): Observable<ApiResponse<NonConformite>> {
    //     return this.findAllNc(page, size, NonConformStatus.ARCHIVED, structureId);
    // }

    /**
     * Helper métier lisible : brouillons par structure
     */
    // findDraftByStructure(
    //     structureId: string,
    //     page: number = 0,
    //     size: number = 10
    // ): Observable<ApiResponse<NonConformite>> {
    //     return this.findAllNc(page, size, NonConformStatus.DRAFT, structureId);
    // }
}

    