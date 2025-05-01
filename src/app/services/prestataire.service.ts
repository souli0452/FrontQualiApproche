import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {QualiCrudService} from "./quali-crud.service";
import {QualiUrlConfig} from "./quali-url-configs";
import {Prestataire} from "../models";



@Injectable({providedIn: 'root'})
export class PrestataireService extends QualiCrudService<Prestataire, string> {
    constructor(public override http: HttpClient) {
        super(http, QualiUrlConfig.PRESTATAIRE_ROOT_URL);
    }
}
