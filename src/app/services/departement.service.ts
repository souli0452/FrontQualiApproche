import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {QualiCrudService} from "./quali-crud.service";
import {QualiUrlConfig} from "./quali-url-configs";
import { Departement } from '../models/departement.model';



@Injectable({providedIn: 'root'})
export class DepartementService extends QualiCrudService<Departement, string> {
    constructor(public override http: HttpClient) {
        super(http, QualiUrlConfig.DEPARTEMENT_ROOT_URL);
    }
}
