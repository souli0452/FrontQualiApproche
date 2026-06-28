import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { QualiUrlConfig } from '../quali-url-configs';
import { BaseCrudService } from '../base-crud.service';
import { NiveauNonConformite } from '../../models/non-conformite.model';



@Injectable({providedIn: 'root'})
export class NiveauNonConformiteService extends BaseCrudService<NiveauNonConformite> {
    constructor(public override  http: HttpClient) {
        super(http, QualiUrlConfig.NIVEAU_NON_CONFORMITE_ROOT_URL);
    }
}