import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BaseCrudService, UrlConfig } from '@core';
import { Fournisseur } from '../../models/fournisseur.model';

@Injectable({ providedIn: 'root' })
export class FournisseurService extends BaseCrudService<Fournisseur, string> {
    constructor(public override http: HttpClient) {
        super(http, UrlConfig.FOURNISSEUR_ROOT_URL);
    }
}
