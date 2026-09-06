import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { QualiUrlConfig, BaseCrudService } from '@core';
import { CategorieProcessus } from '../models/categorie-processus.model';


@Injectable({providedIn: 'root'})
export class CategorieProcessusService extends BaseCrudService<CategorieProcessus, string> {
    constructor(public override http: HttpClient) {
        super(http, QualiUrlConfig.TYPE_PROCESSUS_ROOT_URL);
    }
}
