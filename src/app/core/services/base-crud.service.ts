import { HttpClient, HttpHeaders, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ApiItemResponse, ApiResponse } from '../../models/response.model';
import { OptionsLoadEvent, OptionsLoadResult } from '../../shared/ui/lazy-options.model';

export interface CrudOperations<T, ID = string> {
    save?(t: T): Observable<HttpResponse<T> | ApiItemResponse<T>>;
    create?(payload: Partial<T>): Observable<ApiItemResponse<T>>;
    update(t: T): Observable<ApiItemResponse<T> | HttpResponse<T>>;
    findAll(page?: number, size?: number): Observable<ApiResponse<T>>;
    GetAllObjects?(page: number, size: number): Observable<ApiResponse<T>>;
    findById?(id: ID): Observable<ApiItemResponse<T> | HttpResponse<T>>;
    delete(id: ID): Observable<any>;
}

export abstract class BaseCrudService<T, ID = string> implements CrudOperations<T, ID> {
    protected constructor(
        protected http: HttpClient,
        protected uri: string
    ) {}

    /**
     * Construit proprement les HttpParams depuis un objet
     */
    protected buildParams(params?: Record<string, any>): HttpParams {
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

    /**
     * Construit proprement les headers
     */
    protected buildHeaders(headers?: Record<string, string>): HttpHeaders {
        let httpHeaders = new HttpHeaders();

        if (!headers) return httpHeaders;

        Object.keys(headers).forEach((key) => {
            httpHeaders = httpHeaders.set(key, headers[key]);
        });

        return httpHeaders;
    }

    /**
     * Récupération paginée standard
     * Exemple endpoint: /all?page=0&size=20
     */
    findAll(
        page?: number,
        size?: number,
        filters?: Record<string, any>,
        headers?: Record<string, string>
    ): Observable<ApiResponse<T>> {
        const queryParams: Record<string, any> = { ...filters };
        if (page !== undefined) queryParams['page'] = page;
        if (size !== undefined) queryParams['size'] = size;
        const params = this.buildParams(queryParams);
        const httpHeaders = this.buildHeaders(headers);

        return this.http.get<ApiResponse<T>>(`${this.uri}/all`, {
            params,
            headers: httpHeaders
        });
    }

    /**
     * Alias de pagination pour compatibilité avec l'ancien QualiCrudService
     */
    GetAllObjects(page: number, size: number): Observable<ApiResponse<T>> {
        return this.findAll(page, size);
    }

    /**
     * Récupère uniquement la liste content[]
     * Très pratique pour les select box
     */
    findAllAsList(
        page: number = 0,
        size: number = 1000,
        filters?: Record<string, any>,
        headers?: Record<string, string>
    ): Observable<T[]> {
        return this.findAll(page, size, filters, headers).pipe(
            map((res) => res.data?.content ?? [])
        );
    }

    /**
     * Récupération par id
     * Exemple endpoint: /{id}
     */
    findById(id: ID, headers?: Record<string, string>): Observable<ApiItemResponse<T>> {
        const httpHeaders = this.buildHeaders(headers);

        return this.http.get<ApiItemResponse<T>>(`${this.uri}/${id}`, {
            headers: httpHeaders
        });
    }

    /**
     * Création standard
     */
    create(payload: Partial<T>, headers?: Record<string, string>): Observable<ApiItemResponse<T>> {
        const httpHeaders = this.buildHeaders(headers);

        return this.http.post<ApiItemResponse<T>>(`${this.uri}/create`, payload, {
            headers: httpHeaders
        });
    }

    /**
     * Sauvegarde avec observation de réponse complète (compatibilité QualiCrudService)
     */
    save(payload: T, headers?: Record<string, string>): Observable<HttpResponse<T>> {
        const httpHeaders = this.buildHeaders(headers);

        return this.http.post<T>(`${this.uri}/create`, payload, {
            headers: httpHeaders,
            observe: 'response'
        });
    }

    /**
     * Mise à jour par ID
     */
    updateObject(id: ID, payload: Partial<T>, headers?: Record<string, string>): Observable<ApiItemResponse<T>> {
        const httpHeaders = this.buildHeaders(headers);

        return this.http.put<ApiItemResponse<T>>(`${this.uri}/update/${id}`, payload, {
            headers: httpHeaders
        });
    }

    /**
     * Mise à jour globale
     */
    update(payload: T, headers?: Record<string, string>): Observable<ApiItemResponse<T>> {
        const httpHeaders = this.buildHeaders(headers);

        return this.http.put<ApiItemResponse<T>>(
            `${this.uri}/update`,
            payload,
            { headers: httpHeaders }
        );
    }

    /**
     * Suppression
     */
    delete(id: ID, headers?: Record<string, string>): Observable<ApiItemResponse<any>> {
        const httpHeaders = this.buildHeaders(headers);

        return this.http.delete<ApiItemResponse<any>>(`${this.uri}/delete/${id}`, {
            headers: httpHeaders
        });
    }

    /**
     * GET custom avec réponse paginée
     * Exemple: /user/{userId}/imputed
     */
    customGetPage(
        path: string,
        filters?: Record<string, any>,
        headers?: Record<string, string>
    ): Observable<ApiResponse<T>> {
        const params = this.buildParams(filters);
        const httpHeaders = this.buildHeaders(headers);

        return this.http.get<ApiResponse<T>>(`${this.uri}${path}`, {
            params,
            headers: httpHeaders
        });
    }

    /**
     * GET custom avec liste directe content[]
     * Pratique si tu veux éviter res.data.content partout
     */
    customGetList(
        path: string,
        filters?: Record<string, any>,
        headers?: Record<string, string>
    ): Observable<T[]> {
        return this.customGetPage(path, filters, headers).pipe(
            map((res) => res.data?.content ?? [])
        );
    }

    /**
     * GET custom quand tu veux garder HttpResponse complet
     */
    customGetPageResponse(
        path: string,
        filters?: Record<string, any>,
        headers?: Record<string, string>
    ): Observable<HttpResponse<ApiResponse<T>>> {
        const params = this.buildParams(filters);
        const httpHeaders = this.buildHeaders(headers);

        return this.http.get<ApiResponse<T>>(`${this.uri}${path}`, {
            params,
            headers: httpHeaders,
            observe: 'response'
        });
    }

    /**
     * Suppression multiple
     */
    deleteMany(items: T[], headers?: Record<string, string>): Observable<ApiItemResponse<any>> {
        const httpHeaders = this.buildHeaders(headers);

        return this.http.put<ApiItemResponse<any>>(
            `${this.uri}/delete-multiple`,
            items,
            { headers: httpHeaders }
        );
    }

    /**
     * Changement de statut unitaire
     */
    updateStatus(id: ID, status: string, headers?: Record<string, string>): Observable<ApiItemResponse<any>> {
        const params = this.buildParams({ id, status });
        const httpHeaders = this.buildHeaders(headers);

        return this.http.patch<ApiItemResponse<any>>(
            `${this.uri}/change-status`,
            null,
            {
                params,
                headers: httpHeaders
            }
        );
    }

    /**
     * Changement de statut multiple
     */
    updateManyStatus(items: T[], status: string, headers?: Record<string, string>): Observable<ApiItemResponse<any>> {
        const httpHeaders = this.buildHeaders(headers);
        const params = this.buildParams({ status });

        return this.http.patch<ApiItemResponse<any>>(
            `${this.uri}/change-many-status`,
            items,
            {
                params,
                headers: httpHeaders
            }
        );
    }

    /**
     * Endpoint paginé interrogé par `chargerOptions`.
     */
    protected urlDesOptions(): string {
        return this.uri;
    }

    /**
     * Alimente une liste déroulante page par page, à brancher tel quel sur `app-select-input`
     * et `app-multiselect-input` : `[loadOptions]="service.chargerOptions"`.
     */
    readonly chargerOptions = (event: OptionsLoadEvent): Observable<OptionsLoadResult<T>> =>
        this.http
            .get<ApiResponse<T>>(this.urlDesOptions(), {
                params: this.buildParams({ page: event.page, size: event.limit, search: event.search })
            })
            .pipe(
                map((res: any) => {
                    const donnees = res?.data ?? res;
                    if (Array.isArray(donnees)) {
                        return { options: donnees as T[], totalRecords: donnees.length, hasMore: false };
                    }
                    const options = (donnees?.content ?? []) as T[];
                    return {
                        options,
                        totalRecords: donnees?.totalElements ?? options.length,
                        hasMore: donnees?.last === undefined ? undefined : !donnees.last
                    };
                })
            );
}

export { BaseCrudService as QualiCrudService };
