import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {QualiCrudService} from "./quali-crud.service";
import {QualiUrlConfig} from "./quali-url-configs";
import {Risque} from "../models";

@Injectable({providedIn: 'root'})
export class RisqueService extends QualiCrudService<Risque, string> {
    constructor(public override http: HttpClient) {
        super(http, QualiUrlConfig.RISQUE_ROOT_URL);
    }
} 