import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseCrudService } from '@core/services/base-crud.service';
import { UrlConfig } from '@core/services/url-config';
import { Audit, ConstatAudit, AuditStats, PlanActiviteAudit } from '../models/audit.model';
import { ApiItemResponse, ApiResponse } from '../../../models/response.model';
import { StatutConstat } from '../models/audit-enums';

@Injectable({ providedIn: 'root' })
export class AuditGestionService extends BaseCrudService<Audit, string> {

    constructor(public override http: HttpClient) {
        super(http, UrlConfig.AUDIT_ROOT_URL);
    }

    getDashboardStats(): Observable<ApiItemResponse<AuditStats>> {
        return this.http.get<ApiItemResponse<AuditStats>>(`${UrlConfig.AUDIT_ROOT_URL}/stats/dashboard`);
    }

    rechercher(
        filtres: Record<string, any>,
        page = 0,
        size = 10
    ): Observable<ApiResponse<Audit>> {
        return this.findAll(page, size, filtres);
    }

    // ---- Plan d'audit ----

    getPlanActivites(auditId: string): Observable<ApiItemResponse<PlanActiviteAudit[]>> {
        return this.http.get<ApiItemResponse<PlanActiviteAudit[]>>(
            `${UrlConfig.AUDIT_ROOT_URL}/${auditId}/plan-activites`
        );
    }

    savePlanActivites(auditId: string, activites: PlanActiviteAudit[]): Observable<ApiItemResponse<PlanActiviteAudit[]>> {
        return this.http.put<ApiItemResponse<PlanActiviteAudit[]>>(
            `${UrlConfig.AUDIT_ROOT_URL}/${auditId}/plan-activites`,
            activites
        );
    }

    // ---- Constats ----

    getConstats(auditId: string, page = 0, size = 50): Observable<ApiResponse<any>> {
        return this.http.get<ApiResponse<any>>(`${UrlConfig.AUDIT_ROOT_URL}/${auditId}/constats`, {
            params: this.buildParams({ page, size })
        });
    }

    creerConstat(auditId: string, constat: Partial<ConstatAudit>): Observable<ApiItemResponse<ConstatAudit>> {
        return this.http.post<ApiItemResponse<ConstatAudit>>(
            `${UrlConfig.AUDIT_ROOT_URL}/${auditId}/constats/create`,
            constat
        );
    }

    mettreAJourConstat(auditId: string, constatId: string, constat: Partial<ConstatAudit>): Observable<ApiItemResponse<ConstatAudit>> {
        return this.http.put<ApiItemResponse<ConstatAudit>>(
            `${UrlConfig.AUDIT_ROOT_URL}/${auditId}/constats/${constatId}`,
            constat
        );
    }

    changerStatutConstat(auditId: string, constatId: string, statut: StatutConstat): Observable<ApiItemResponse<ConstatAudit>> {
        return this.http.patch<ApiItemResponse<ConstatAudit>>(
            `${UrlConfig.AUDIT_ROOT_URL}/${auditId}/constats/${constatId}/statut`,
            null,
            { params: this.buildParams({ statut }) }
        );
    }

    supprimerConstat(auditId: string, constatId: string): Observable<ApiItemResponse<any>> {
        return this.http.delete<ApiItemResponse<any>>(
            `${UrlConfig.AUDIT_ROOT_URL}/${auditId}/constats/${constatId}`
        );
    }

    // ---- Rapport ----

    telechargerRapport(auditId: string): Observable<Blob> {
        return this.http.get(`${UrlConfig.AUDIT_ROOT_URL}/${auditId}/rapport`, { responseType: 'blob' });
    }
}
