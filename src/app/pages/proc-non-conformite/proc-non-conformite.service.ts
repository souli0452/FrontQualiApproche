import { Injectable } from '@angular/core';
import {HttpClient, HttpResponse} from "@angular/common/http";
import {Observable} from "rxjs";
import {NonConformiteUrlConfig} from "./proc-non-conformite.urls.configs";
import { EtapeTraitement } from '../../enums';


@Injectable({
  providedIn: 'root'
})
export class ProcNonConformiteService {

  constructor(private http: HttpClient) { }

    getNonConformiteByEtape(etapeTraitement :EtapeTraitement): Observable<HttpResponse<Array<any>>> {
        return this.http.get<Array<any>>(NonConformiteUrlConfig.GET_NON_CONFORMITE_BY_STATUS_ROOT_URL+etapeTraitement, {observe: 'response'});
    }
    updateNomConformite(demande: any, id: string): Observable<HttpResponse<any>> {
        return this.http.post<any>(NonConformiteUrlConfig.UPDATE_NON_CONFORMITE + id, demande, {observe: 'response'});
    }
}
