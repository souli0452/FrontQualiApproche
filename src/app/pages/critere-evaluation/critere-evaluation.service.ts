import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BaseCrudService, UrlConfig } from '@core';
import { CritereEvaluation } from '../../models/critere-evaluation.model';

@Injectable({ providedIn: 'root' })
export class CritereEvaluationService extends BaseCrudService<CritereEvaluation, string> {
    constructor(public override http: HttpClient) {
        super(http, UrlConfig.CRITERE_EVALUATION_ROOT_URL);
    }
}
