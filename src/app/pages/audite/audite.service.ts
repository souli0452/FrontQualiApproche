import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Audite } from '../../models/audite.model';
import { BaseCrudService } from '@core/services/base-crud.service';
import { UrlConfig } from '@core/services/url-config';

@Injectable({ providedIn: 'root' })
export class AuditService extends BaseCrudService<Audite, string> {
    constructor(public override http: HttpClient) {
        super(http, UrlConfig.AUDIT_ROOT_URL);
    }
}
