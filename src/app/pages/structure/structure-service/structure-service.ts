import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Structure } from '../structure-config/structure';
import { StructureEndpoint } from '../structure-config/strucuture-url-config';
import { createRequestOption, formatUrl } from '../../../utils';
import { TypeStructure } from '../../../enums';


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

    public getAllStructure(typeStructure?: TypeStructure, directionId?: string): Observable<HttpResponse<Array<Structure>>> {
        const params = createRequestOption({typeStructure, directionId});
        return this.http.get<Array<Structure>>(StructureEndpoint.STRUCTURE_ROOT_URL, {observe: 'response', params});
    }
    public getAllStructures(): Observable<HttpResponse<Array<Structure>>> {
        return this.http.get<Array<Structure>>(StructureEndpoint.STRUCTURE_ALL_ROOT_URL, {observe: 'response'});
    }
    public getAllDirections(typeStructure?: TypeStructure): Observable<HttpResponse<Array<Structure>>> {
        const params = createRequestOption({typeStructure});
        return this.http.get<Array<Structure>>(StructureEndpoint.STRUCTURE_ROOT_URL, {observe: 'response', params});
    }

    getByStructureId(id: string | undefined): Observable<any> {
        return this.http.get(formatUrl(StructureEndpoint.STRUCTURE_BY_ID_URL, id));
    }
}
