import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { QualiUrlConfig, BaseCrudService } from '@core';
import { OrigineNonConformite } from '../models';



@Injectable({providedIn: 'root'})
export class OrigineNonConformiteService extends BaseCrudService<OrigineNonConformite, string> {
    constructor(public override http: HttpClient) {
        super(http, QualiUrlConfig.TYPE_NON_CONFORMITE_ROOT_URL);
    }
}