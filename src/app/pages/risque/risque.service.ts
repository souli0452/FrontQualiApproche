import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BaseCrudService, UrlConfig } from '@core';
import { Risque } from '../../models/risque.model';

@Injectable({ providedIn: 'root' })
export class RisqueService extends BaseCrudService<Risque, string> {
    constructor(public override http: HttpClient) {
        super(http, UrlConfig.RISQUE_ROOT_URL);
    }
}