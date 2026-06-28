import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {QualiUrlConfig} from "./quali-url-configs";
import { BaseCrudService } from './base-crud.service';

@Injectable({providedIn: 'root'})
export class ConfigGlobalService extends BaseCrudService<any, string> {
    constructor(public override http: HttpClient) {
        super(http, QualiUrlConfig.CG_ROOT_URL);
    }
}
