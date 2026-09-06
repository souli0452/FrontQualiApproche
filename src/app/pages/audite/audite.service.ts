import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BaseCrudService, UrlConfig } from '@core';
import { Audite } from '../../models/audite.model';

@Injectable({ providedIn: 'root' })
export class AuditService extends BaseCrudService<Audite, string> {
    constructor(public override http: HttpClient) {
        super(http, UrlConfig.AUDIT_ROOT_URL);
    }
}
