import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { QualiCrudService } from '../quali-crud.service';
import { NiveauNonConformite } from '../../models';
import { QualiUrlConfig } from '../quali-url-configs';
import { BaseCrudService } from '../base-crud.service';



@Injectable({providedIn: 'root'})
// export class NiveauNonConformiteService extends QualiCrudService<NiveauNonConformite, string> {
//     constructor(public override http: HttpClient) {
//         super(http, QualiUrlConfig.NIVEAU_NON_CONFORMITE_ROOT_URL);
//     }

export class NiveauNonConformiteService extends BaseCrudService<NiveauNonConformite> {
    constructor(public override  http: HttpClient) {
        super(http, QualiUrlConfig.NIVEAU_NON_CONFORMITE_ROOT_URL);
    }
}