import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { QualiCrudService } from '../quali-crud.service';
import { Formation } from '../../models';
import { QualiUrlConfig } from '../quali-url-configs';



@Injectable({providedIn: 'root'})
export class PlanActionService extends QualiCrudService<Formation, string> {
    constructor(public override http: HttpClient) {
        super(http, QualiUrlConfig.PLAN_ACTION_ROOT_URL);
    }
}
