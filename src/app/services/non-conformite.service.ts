import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import {QualiCrudService} from "./quali-crud.service";
import {QualiUrlConfig} from "./quali-url-configs";
import {NonConformite} from "../models";
import { Observable } from 'rxjs';
import { NonConformStatus } from '../enums';
import { NcStats } from '../models/statsNc';



@Injectable({providedIn: 'root'})
export class NonConformiteService extends QualiCrudService<NonConformite, string> {
    constructor(public override http: HttpClient) {
        super(http, QualiUrlConfig.NON_CONFORMITE_ROOT_URL);
    }

    getCountByStatus(id:any): Observable<HttpResponse<Array<NcStats>>> {
        return this.http.get<any>(`${QualiUrlConfig.NON_CONFORMITE_ROOT_URL}/count-by-status/${id}`, {observe: 'response'});
    }
}
