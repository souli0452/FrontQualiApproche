import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {QualiCrudService} from "./quali-crud.service";
import {QualiUrlConfig} from "./quali-url-configs";
import { Audite } from '../models/audite.model';

@Injectable({providedIn: 'root'})
export class AuditService extends QualiCrudService<Audite, string> {
    constructor(public override http: HttpClient) {
        super(http, QualiUrlConfig.AUDIT_ROOT_URL);
    }
}
