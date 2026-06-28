import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {QualiUrlConfig} from "./quali-url-configs";
import { BaseCrudService } from './base-crud.service';
import { Formation } from '../models/formation.model';



@Injectable({providedIn: 'root'})
export class FormationService extends BaseCrudService<Formation, string> {
    constructor(public override http: HttpClient) {
        super(http, QualiUrlConfig.FORMATION_ROOT_URL);
    }
}