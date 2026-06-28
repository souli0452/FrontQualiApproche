import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { QualiCrudService } from '../quali-crud.service';
import { QualiUrlConfig } from '../quali-url-configs';
import { BaseCrudService } from '../base-crud.service';
import { OrigineNonConformite } from '../../models/non-conformite.model';



@Injectable({providedIn: 'root'})
export class OrigineNonConformiteService extends BaseCrudService<OrigineNonConformite, string> {
    constructor(public override http: HttpClient) {
        super(http, QualiUrlConfig.TYPE_NON_CONFORMITE_ROOT_URL);
    }
}