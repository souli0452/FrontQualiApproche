import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Risque } from '../../models/risque.model';
import { BaseCrudService } from '@core/services/base-crud.service';
import { UrlConfig } from '@core/services/url-config';

@Injectable({ providedIn: 'root' })
export class RisqueService extends BaseCrudService<Risque, string> {
    constructor(public override http: HttpClient) {
        super(http, UrlConfig.RISQUE_ROOT_URL);
    }
}