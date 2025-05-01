import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {QualiCrudService} from "./quali-crud.service";
import {QualiUrlConfig} from "./quali-url-configs";
import {NiveauNonConformite} from "../models";



@Injectable({providedIn: 'root'})
export class NiveauNonConformiteService extends QualiCrudService<NiveauNonConformite, string> {
    constructor(public override http: HttpClient) {
        super(http, QualiUrlConfig.NIVEAU_NON_CONFORMITE_ROOT_URL);
    }
}