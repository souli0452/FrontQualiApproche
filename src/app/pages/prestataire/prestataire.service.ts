import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BaseCrudService, UrlConfig } from '@core';
import { Prestataire } from '../../models/prestataire.model';

@Injectable({ providedIn: 'root' })
export class PrestataireService extends BaseCrudService<Prestataire, string> {
    constructor(public override http: HttpClient) {
        super(http, UrlConfig.PRESTATAIRE_ROOT_URL);
    }
}
