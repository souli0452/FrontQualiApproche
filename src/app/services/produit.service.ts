import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {QualiCrudService} from "./quali-crud.service";
import {QualiUrlConfig} from "./quali-url-configs";
import { Produit } from '../models/produit.model';


@Injectable({providedIn: 'root'})
export class ProduitService extends QualiCrudService<Produit, string> {
    constructor(public override http: HttpClient) {
        super(http, QualiUrlConfig.PRODUIT_ROOT_URL);
    }
}
