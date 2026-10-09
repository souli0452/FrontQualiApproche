import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BaseCrudService } from '@core/services/base-crud.service';
import { UrlConfig } from '@core/services/url-config';
import { Formation } from '../../models/formation.model';

@Injectable({ providedIn: 'root' })
export class FormationService extends BaseCrudService<Formation, string> {
    constructor(public override http: HttpClient) {
        super(http, UrlConfig.FORMATION_ROOT_URL);
    }
}