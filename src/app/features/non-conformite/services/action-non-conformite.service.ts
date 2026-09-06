import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { QualiUrlConfig, BaseCrudService } from '@core';
import { ActionNonConformite } from '../models';


@Injectable({providedIn: 'root'})
export class ActionNonConformiteService extends BaseCrudService<ActionNonConformite, string> {
    constructor(public override http: HttpClient) {
        super(http, QualiUrlConfig.ACTION_NON_CONFORMITE_ROOT_URL);
    }
}