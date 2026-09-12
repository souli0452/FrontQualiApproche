import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BaseCrudService } from '@core/services/base-crud.service';
import { UrlConfig } from '@core/services/url-config';
import { Produit } from '../../models/produit.model';

@Injectable({ providedIn: 'root' })
export class ProduitService extends BaseCrudService<Produit, string> {
    constructor(public override http: HttpClient) {
        super(http, UrlConfig.PRODUIT_ROOT_URL);
    }
}
