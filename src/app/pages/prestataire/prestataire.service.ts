import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Prestataire } from '../../models/prestataire.model';
import { BaseCrudService } from '@core/services/base-crud.service';
import { UrlConfig } from '@core/services/url-config';

@Injectable({ providedIn: 'root' })
export class PrestataireService extends BaseCrudService<Prestataire, string> {
    constructor(public override http: HttpClient) {
        super(http, UrlConfig.PRESTATAIRE_ROOT_URL);
    }
}
