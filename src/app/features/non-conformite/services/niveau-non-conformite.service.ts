import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { QualiUrlConfig } from '@core/services/url-config';
import { BaseCrudService } from '@core/services/base-crud.service';
import { NiveauNonConformite } from '../models/referentiel.model';

@Injectable({providedIn: 'root'})
export class NiveauNonConformiteService extends BaseCrudService<NiveauNonConformite> {
    constructor(public override  http: HttpClient) {
        super(http, QualiUrlConfig.NIVEAU_NON_CONFORMITE_ROOT_URL);
    }
}