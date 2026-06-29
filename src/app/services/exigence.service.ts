import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {QualiCrudService} from "./quali-crud.service";
import {QualiUrlConfig} from "./quali-url-configs";
import { Exigence } from '../models/exigence.model';



@Injectable({providedIn: 'root'})
export class ExigenceService extends QualiCrudService<Exigence, string> {
    constructor(public override http: HttpClient) {
        super(http, QualiUrlConfig.Exigence_ROOT_URL);
    }
}
