import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {QualiCrudService} from "../quali-crud.service";
import {QualiUrlConfig} from "../quali-url-configs";
import {ActionNonConformite } from "../../models";
import { BaseCrudService } from '../base-crud.service';



@Injectable({providedIn: 'root'})
export class ActionNonConformiteService extends BaseCrudService<ActionNonConformite, string> {
    constructor(public override http: HttpClient) {
        super(http, QualiUrlConfig.ACTION_NON_CONFORMITE_ROOT_URL);
    }
}