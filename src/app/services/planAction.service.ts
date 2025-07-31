import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {QualiCrudService} from "./quali-crud.service";
import {QualiUrlConfig} from "./quali-url-configs";
import {Formation} from "../models";



@Injectable({providedIn: 'root'})
export class PlanActionService extends QualiCrudService<Formation, string> {
    constructor(public override http: HttpClient) {
        super(http, QualiUrlConfig.PLAN_ACTION_ROOT_URL);
    }
}
