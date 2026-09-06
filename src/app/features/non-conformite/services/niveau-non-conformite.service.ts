import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { QualiUrlConfig, BaseCrudService } from '@core';
import { NiveauNonConformite } from '../models';



@Injectable({providedIn: 'root'})
export class NiveauNonConformiteService extends BaseCrudService<NiveauNonConformite> {
    constructor(public override  http: HttpClient) {
        super(http, QualiUrlConfig.NIVEAU_NON_CONFORMITE_ROOT_URL);
    }
}