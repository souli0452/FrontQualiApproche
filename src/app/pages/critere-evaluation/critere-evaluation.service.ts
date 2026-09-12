import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { CritereEvaluation } from '../../models/critere-evaluation.model';
import { BaseCrudService } from '@core/services/base-crud.service';
import { UrlConfig } from '@core/services/url-config';

@Injectable({ providedIn: 'root' })
export class CritereEvaluationService extends BaseCrudService<CritereEvaluation, string> {
    constructor(public override http: HttpClient) {
        super(http, UrlConfig.CRITERE_EVALUATION_ROOT_URL);
    }
}
