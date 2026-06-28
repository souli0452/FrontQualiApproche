import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {QualiUrlConfig} from "../quali-url-configs";
import { BaseCrudService } from '../base-crud.service';
import { ActionNonConformite } from '../../models/non-conformite.model';


@Injectable({providedIn: 'root'})
export class ActionNonConformiteService extends BaseCrudService<ActionNonConformite, string> {
    constructor(public override http: HttpClient) {
        super(http, QualiUrlConfig.ACTION_NON_CONFORMITE_ROOT_URL);
    }
}