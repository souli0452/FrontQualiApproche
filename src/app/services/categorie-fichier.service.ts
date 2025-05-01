import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {QualiCrudService} from "./quali-crud.service";
import {QualiUrlConfig} from "./quali-url-configs";
import {CategorieFichier} from "../models";




@Injectable({providedIn: 'root'})
export class CategorieFichierService extends QualiCrudService<CategorieFichier, string> {
    constructor(public override http: HttpClient) {
        super(http, QualiUrlConfig.CATEGORIE_FICHIER_ROOT_URL);
    }
}
