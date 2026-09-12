import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BaseCrudService } from '@core/services/base-crud.service';
import { UrlConfig } from '@core/services/url-config';
import { Reclamation } from '../../models/reclamation.model';

@Injectable({ providedIn: 'root' })
export class ReclamationService extends BaseCrudService<Reclamation, string> {
    constructor(public override http: HttpClient) {
        super(http, UrlConfig.RECLAMATION_ROOT_URL);
    }
}