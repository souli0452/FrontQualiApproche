import { Injectable } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';
import { AuditGestionService } from './audit.service';
import { TypeAuditRef, TypeConstatRef, SiteAudit } from '../models/audit.model';
import { ApiResponse } from '../../../models/response.model';

@Injectable({ providedIn: 'root' })
export class AuditReferentielService {

    private typesAudit$?: Observable<ApiResponse<TypeAuditRef>>;
    private typesConstat$?: Observable<ApiResponse<TypeConstatRef>>;
    private sites$?: Observable<ApiResponse<SiteAudit>>;

    constructor(private auditService: AuditGestionService) {}

    getTypesAudit(): Observable<ApiResponse<TypeAuditRef>> {
        this.typesAudit$ ??= this.auditService.getTypesAudit().pipe(shareReplay(1));
        return this.typesAudit$;
    }

    getTypesConstat(): Observable<ApiResponse<TypeConstatRef>> {
        this.typesConstat$ ??= this.auditService.getTypesConstat().pipe(shareReplay(1));
        return this.typesConstat$;
    }

    getSitesAudit(): Observable<ApiResponse<SiteAudit>> {
        this.sites$ ??= this.auditService.getSitesAudit().pipe(shareReplay(1));
        return this.sites$;
    }

    invalidate(): void {
        this.typesAudit$ = undefined;
        this.typesConstat$ = undefined;
        this.sites$ = undefined;
    }
}
