import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BaseCrudService } from '@core/services/base-crud.service';
import { QualiUrlConfig, UrlConfig } from '@core/services/url-config';
import { OrigineNonConformite } from '../models/referentiel.model';


@Injectable({providedIn: 'root'})
export class OrigineNonConformiteService extends BaseCrudService<OrigineNonConformite, string> {
    constructor(public override http: HttpClient) {
        super(http, QualiUrlConfig.TYPE_NON_CONFORMITE_ROOT_URL);
    }
}