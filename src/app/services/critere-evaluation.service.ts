import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {QualiCrudService} from "./quali-crud.service";
import {QualiUrlConfig} from "./quali-url-configs";
import { CritereEvaluation } from '../models/critere-evaluation.model';

@Injectable({providedIn: 'root'})
export class CritereEvaluationService extends QualiCrudService<CritereEvaluation, string> {
    constructor(public override http: HttpClient) {
        super(http, QualiUrlConfig.CRITERE_EVALUATION_ROOT_URL);
    }
}
