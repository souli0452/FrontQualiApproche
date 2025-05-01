import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {QualiCrudService} from "./quali-crud.service";
import {QualiUrlConfig} from "./quali-url-configs";
import {Reclamation} from "../models";




@Injectable({providedIn: 'root'})
export class ReclamationService extends QualiCrudService<Reclamation, string> {
    constructor(public override http: HttpClient) {
        super(http, QualiUrlConfig.RECLAMATION_ROOT_URL);
    }
}