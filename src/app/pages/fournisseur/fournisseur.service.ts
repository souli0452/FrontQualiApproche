import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Fournisseur } from '../../models/fournisseur.model';
import { BaseCrudService } from '@core/services/base-crud.service';
import { UrlConfig } from '@core/services/url-config';

@Injectable({ providedIn: 'root' })
export class FournisseurService extends BaseCrudService<Fournisseur, string> {
    constructor(public override http: HttpClient) {
        super(http, UrlConfig.FOURNISSEUR_ROOT_URL);
    }
}
