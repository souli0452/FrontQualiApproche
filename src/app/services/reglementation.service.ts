import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {QualiCrudService} from "./quali-crud.service";
import {QualiUrlConfig} from "./quali-url-configs";
import {Reglementation} from "../models";




@Injectable({providedIn: 'root'})
export class ReglementationService extends QualiCrudService<Reglementation, string> {
    constructor(public override http: HttpClient) {
        super(http, QualiUrlConfig.REGLEMENTATION_ROOT_URL);
    }
}