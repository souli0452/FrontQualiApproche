import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {QualiCrudService} from "./quali-crud.service";
import {QualiUrlConfig} from "./quali-url-configs";
import {Formation} from "../models";



@Injectable({providedIn: 'root'})
export class ConfigGlobalService extends QualiCrudService<any, string> {
    constructor(public override http: HttpClient) {
        super(http, QualiUrlConfig.CG_ROOT_URL);
    }
}
