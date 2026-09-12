import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Reglementation } from '../../models/reglementation.model';
import { BaseCrudService } from '@core/services/base-crud.service';
import { UrlConfig } from '@core/services/url-config';

@Injectable({ providedIn: 'root' })
export class ReglementationService extends BaseCrudService<Reglementation, string> {
    constructor(public override http: HttpClient) {
        super(http, UrlConfig.REGLEMENTATION_ROOT_URL);
    }
}