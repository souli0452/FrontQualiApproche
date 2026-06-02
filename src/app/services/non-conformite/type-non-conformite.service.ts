import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {NonConformite, TypeNonConformite} from "../../models";
import { QualiCrudService } from '../quali-crud.service';
import { QualiUrlConfig } from '../quali-url-configs';



@Injectable({providedIn: 'root'})
export class TypeNonConformiteService extends QualiCrudService<TypeNonConformite, string> {
    constructor(public override http: HttpClient) {
        super(http, QualiUrlConfig.TYPE_NON_CONFORMITE_ROOT_URL);
    }
}