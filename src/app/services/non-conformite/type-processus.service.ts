import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {QualiCrudService} from "../quali-crud.service";
import {QualiUrlConfig} from "../quali-url-configs";
import {TypeProcessus} from "../../models";



@Injectable({providedIn: 'root'})
export class TypeProcessusService extends QualiCrudService<TypeProcessus, string> {
    constructor(public override http: HttpClient) {
        super(http, QualiUrlConfig.TYPE_PROCESSUS_ROOT_URL);
    }
}