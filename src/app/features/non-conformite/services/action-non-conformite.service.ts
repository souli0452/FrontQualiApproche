import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BaseCrudService } from '@core/services/base-crud.service';
import { QualiUrlConfig } from '@core/services/url-config';
import { ActionNonConformite } from '../models/plan-action.model';


@Injectable({providedIn: 'root'})
export class ActionNonConformiteService extends BaseCrudService<ActionNonConformite, string> {
    constructor(public override http: HttpClient) {
        super(http, QualiUrlConfig.ACTION_NON_CONFORMITE_ROOT_URL);
    }
}