import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BaseCrudService, UrlConfig } from '@core';
import { Reglementation } from '../../models/reglementation.model';

@Injectable({ providedIn: 'root' })
export class ReglementationService extends BaseCrudService<Reglementation, string> {
    constructor(public override http: HttpClient) {
        super(http, UrlConfig.REGLEMENTATION_ROOT_URL);
    }
}