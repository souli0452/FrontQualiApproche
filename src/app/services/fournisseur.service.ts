import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {QualiCrudService} from "./quali-crud.service";
import {QualiUrlConfig} from "./quali-url-configs";
import { Fournisseur } from '../models/fournisseur.model';

@Injectable({providedIn: 'root'})
export class FournisseurService extends QualiCrudService<Fournisseur, string> {
    constructor(public override http: HttpClient) {
        super(http, QualiUrlConfig.FOURNISSEUR_ROOT_URL);
    }
}
