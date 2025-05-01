import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {QualiCrudService} from "./quali-crud.service";
import {QualiUrlConfig} from "./quali-url-configs";
import {ActionCorrectivePreventive} from "../models";


@Injectable({providedIn: 'root'})
export class ActionCorrectivePreventiveService extends QualiCrudService<ActionCorrectivePreventive, string> {
    constructor(public override http: HttpClient) {
        super(http, QualiUrlConfig.ACTION_CORRECTIVE_PREVENTIVE_ROOT_URL);
    }
}
