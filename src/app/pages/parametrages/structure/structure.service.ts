import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { Structure } from './structure.model';
import { StructureEndpoint } from './structure-url-config';
import { createRequestOption } from '../../../utils/global/global-utils';
import { TypeStructure } from '../../../enums/enums';
import { ApiResponse, PaginatedData } from '../../../models/response.model';
import { OptionsLoadEvent, OptionsLoader } from '../../../shared/ui/lazy-options.model';
import { formatUrl } from '../../../utils/formatage/formatage-utils';


@Injectable({providedIn: 'root'})
export class StructureService {

    constructor(private http: HttpClient) {
    }

    public createStructure(demande: Structure): Observable<HttpResponse<Structure>> {
        return this.http.post<Structure>(StructureEndpoint.STRUCTURE_CREATE_URL, demande, {observe: 'response'});
    }

    public updateStructure(demande: Structure): Observable<HttpResponse<Structure>> {
        return this.http.put<Structure>(StructureEndpoint.STRUCTURE_UPDATE_URL, demande, {observe: 'response'});
    }

    public deleteStructure(id: string): Observable<HttpResponse<Structure>> {
        return this.http.delete<Structure>(formatUrl(StructureEndpoint.STRUCTURE_DELETE_URL, id), {observe: 'response'});
    }

    public getAllStructure(typeStructure?: TypeStructure, directionId?: string): Observable<PaginatedData<Structure>> {
    const params = createRequestOption({ typeStructure, directionId });
    
    // On appelle l'API en typant la réponse avec notre enveloppe globale
    return this.http.get<ApiResponse<Structure>>(`${StructureEndpoint.STRUCTURE_ROOT_URL}`, { params })
        .pipe(
            // On extrait uniquement les données de la pagination
            map(response => response.data)
        );
    }

    public getAllStructures(page: number = 0, size: number = 10): Observable<ApiResponse<Structure>> {
        return this.http.get<ApiResponse<Structure>>(`${StructureEndpoint.STRUCTURE_ROOT_URL}?page=${page}&size=${size}`);
    }

    /**
     * Chargeur des structures pour les listes déroulantes : page par page, recherche servie par
     * le serveur sur le libellé long comme sur le libellé court.
     *
     * <p>Fonction fléchée, donc utilisable telle quelle en entrée de composant :
     * `[loadOptions]="structureService.chargerOptions"`.</p>
     */
    readonly chargerOptions: OptionsLoader<Structure> = (event: OptionsLoadEvent) =>
        this.http
            .get<ApiResponse<Structure>>(StructureEndpoint.STRUCTURE_ROOT_URL, {
                params: { page: event.page, size: event.limit, ...(event.search ? { search: event.search } : {}) }
            })
            .pipe(
                map((res: any) => {
                    const donnees = res?.data ?? res;
                    const options = (donnees?.content ?? (Array.isArray(donnees) ? donnees : [])) as Structure[];
                    return {
                        options,
                        totalRecords: donnees?.totalElements ?? options.length,
                        hasMore: donnees?.last === undefined ? undefined : !donnees.last
                    };
                })
            );

    // getByStructureId(id: string | undefined): Observable<any> {
    //     return this.http.get(formatUrl(StructureEndpoint.STRUCTURE_BY_ID_URL, id));
    // }
    getByStructureId(id: string | undefined): Observable<any> {
        return this.http.get(
            formatUrl(StructureEndpoint.STRUCTURE_BY_ID_URL, id),
            {
                withCredentials: true
            }
        );
    }
}
