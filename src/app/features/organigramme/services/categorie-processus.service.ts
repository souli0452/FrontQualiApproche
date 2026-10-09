import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CategorieProcessus } from '../models/categorie-processus.model';
import { UrlConfig } from '@core/services/url-config';
import { BaseCrudService } from '@core/services/base-crud.service';


@Injectable({providedIn: 'root'})
export class CategorieProcessusService extends BaseCrudService<CategorieProcessus, string> {
    constructor(public override http: HttpClient) {
        super(http, UrlConfig.TYPE_PROCESSUS_ROOT_URL);
    }
}
