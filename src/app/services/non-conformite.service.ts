import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {QualiCrudService} from "./quali-crud.service";
import {QualiUrlConfig} from "./quali-url-configs";
import {NonConformite} from "../models";



@Injectable({providedIn: 'root'})
export class NonConformiteService extends QualiCrudService<NonConformite, string> {
    constructor(public override http: HttpClient) {
        super(http, QualiUrlConfig.NON_CONFORMITE_ROOT_URL);
    }
}