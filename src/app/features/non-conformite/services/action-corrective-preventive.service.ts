import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { BaseCrudService } from '@core/services/base-crud.service';
import { UrlConfig } from '@core/services/url-config';
import { ActionCorrectivePreventive } from '../models/plan-action.model';

@Injectable({providedIn: 'root'})
export class ActionCorrectivePreventiveService extends BaseCrudService<ActionCorrectivePreventive, string> {
    constructor(public override http: HttpClient) {
        super(http, UrlConfig.ACTION_CORRECTIVE_PREVENTIVE_ROOT_URL);
    }
}
