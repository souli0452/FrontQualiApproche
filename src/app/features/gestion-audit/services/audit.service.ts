import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseCrudService } from '@core/services/base-crud.service';
import { UrlConfig } from '@core/services/url-config';
import {
    Audit, ConstatAudit, PlanAudit, SignatureAudit,
    AvancementAudit, TableauDeBord, CompilationConstats,
    RapportAudit, NoeudReferentiel, NotationCritere,
    EvaluationRQAPBF, AuditeurFiche, EvaluationAuditeur,
    TypeAuditRef, TypeConstatRef, SiteAudit, PreuveConstat,
    ActionMaitriseRisque
} from '../models/audit.model';
import { ApiItemResponse, ApiResponse } from '../../../models/response.model';
import { NiveauEfficacite } from '../models/audit-enums';

@Injectable({ providedIn: 'root' })
export class AuditGestionService extends BaseCrudService<Audit, string> {

    constructor(public override http: HttpClient) {
        super(http, UrlConfig.AUDIT_ROOT_URL);
    }

    // ---- Tableau de bord ----

    getTableauDeBord(annee?: number): Observable<ApiItemResponse<TableauDeBord>> {
        const params = annee ? this.buildParams({ annee }) : undefined;
        return this.http.get<ApiItemResponse<TableauDeBord>>(
            `${UrlConfig.AUDIT_ROOT_URL}/tableau-de-bord`,
            params ? { params } : {}
        );
    }

    // ---- Avancement ----

    getAvancement(auditId: string): Observable<ApiItemResponse<AvancementAudit>> {
        return this.http.get<ApiItemResponse<AvancementAudit>>(
            `${UrlConfig.AUDIT_ROOT_URL}/${auditId}/avancement`
        );
    }

    // ---- Cycle de vie ----

    validerAudit(auditId: string): Observable<ApiItemResponse<Audit>> {
        return this.http.post<ApiItemResponse<Audit>>(
            `${UrlConfig.AUDIT_ROOT_URL}/${auditId}/valider`, null
        );
    }

    demarrerAudit(auditId: string): Observable<ApiItemResponse<Audit>> {
        return this.http.post<ApiItemResponse<Audit>>(
            `${UrlConfig.AUDIT_ROOT_URL}/${auditId}/demarrer`, null
        );
    }

    annulerAudit(auditId: string, motif?: string): Observable<ApiItemResponse<Audit>> {
        return this.http.post<ApiItemResponse<Audit>>(
            `${UrlConfig.AUDIT_ROOT_URL}/${auditId}/annuler`,
            motif ? { motif } : null
        );
    }

    cloturerAudit(auditId: string): Observable<ApiItemResponse<Audit>> {
        return this.http.post<ApiItemResponse<Audit>>(
            `${UrlConfig.AUDIT_ROOT_URL}/${auditId}/cloturer`, null
        );
    }

    // ---- Rapport ----

    getRapport(auditId: string): Observable<ApiItemResponse<RapportAudit>> {
        return this.http.get<ApiItemResponse<RapportAudit>>(
            `${UrlConfig.AUDIT_ROOT_URL}/${auditId}/rapport`
        );
    }

    uploadRapport(auditId: string, fichier: File): Observable<ApiItemResponse<Audit>> {
        const formData = new FormData();
        formData.append('fichier', fichier);
        return this.http.post<ApiItemResponse<Audit>>(
            `${UrlConfig.AUDIT_ROOT_URL}/${auditId}/rapport`, formData
        );
    }

    sauvegarderConclusions(
        auditId: string,
        payload: { conclusionsRapport?: string; recommandationsRapport?: string }
    ): Observable<ApiItemResponse<Audit>> {
        return this.http.put<ApiItemResponse<Audit>>(
            `${UrlConfig.AUDIT_ROOT_URL}/${auditId}/rapport/redaction`, payload
        );
    }

    telechargerRapportFichier(auditId: string): Observable<Blob> {
        return this.http.get(
            `${UrlConfig.AUDIT_ROOT_URL}/${auditId}/rapport/fichier`,
            { responseType: 'blob' }
        );
    }

    exporterRapportPdf(auditId: string): Observable<Blob> {
        return this.http.get(
            `${UrlConfig.AUDIT_ROOT_URL}/${auditId}/rapport/export/pdf`,
            { responseType: 'blob' }
        );
    }

    exporterRapportWord(auditId: string): Observable<Blob> {
        return this.http.get(
            `${UrlConfig.AUDIT_ROOT_URL}/${auditId}/rapport/export/word`,
            { responseType: 'blob' }
        );
    }

    // ---- Écarts & actions de maîtrise des risques ----

    transmettreEcarts(auditId: string): Observable<ApiItemResponse<any>> {
        return this.http.post<ApiItemResponse<any>>(
            `${UrlConfig.AUDIT_ROOT_URL}/${auditId}/transmettre-ecarts`, null
        );
    }

    getActionsMaitriseRisques(auditId: string): Observable<ApiItemResponse<ActionMaitriseRisque[]>> {
        return this.http.get<ApiItemResponse<ActionMaitriseRisque[]>>(
            `${UrlConfig.AUDIT_ROOT_URL}/${auditId}/actions-risque`
        );
    }

    sauvegarderActionsMaitriseRisques(
        auditId: string,
        actions: ActionMaitriseRisque[]
    ): Observable<ApiItemResponse<ActionMaitriseRisque[]>> {
        return this.http.put<ApiItemResponse<ActionMaitriseRisque[]>>(
            `${UrlConfig.AUDIT_ROOT_URL}/${auditId}/actions-risque`, actions
        );
    }

    setEfficaciteAction(
        auditId: string,
        actionId: string,
        efficacite: NiveauEfficacite
    ): Observable<ApiItemResponse<ActionMaitriseRisque>> {
        return this.http.patch<ApiItemResponse<ActionMaitriseRisque>>(
            `${UrlConfig.AUDIT_ROOT_URL}/${auditId}/actions-risque/${actionId}/efficacite`,
            null,
            { params: this.buildParams({ efficacite }) }
        );
    }

    // ---- Constats ----

    getConstats(
        auditId: string,
        statut?: string,
        page = 0,
        size = 50
    ): Observable<ApiResponse<ConstatAudit>> {
        const p: Record<string, any> = { auditId, page, size };
        if (statut) p['statut'] = statut;
        return this.http.get<ApiResponse<ConstatAudit>>(
            UrlConfig.AUDIT_CONSTATS_URL,
            { params: this.buildParams(p) }
        );
    }

    getConstatById(id: string): Observable<ApiItemResponse<ConstatAudit>> {
        return this.http.get<ApiItemResponse<ConstatAudit>>(
            `${UrlConfig.AUDIT_CONSTATS_URL}/${id}`
        );
    }

    creerConstat(payload: Partial<ConstatAudit>): Observable<ApiItemResponse<ConstatAudit>> {
        return this.http.post<ApiItemResponse<ConstatAudit>>(
            UrlConfig.AUDIT_CONSTATS_URL, payload
        );
    }

    mettreAJourConstat(id: string, payload: Partial<ConstatAudit>): Observable<ApiItemResponse<ConstatAudit>> {
        return this.http.put<ApiItemResponse<ConstatAudit>>(
            `${UrlConfig.AUDIT_CONSTATS_URL}/${id}`, payload
        );
    }

    supprimerConstat(id: string): Observable<ApiItemResponse<any>> {
        return this.http.delete<ApiItemResponse<any>>(
            `${UrlConfig.AUDIT_CONSTATS_URL}/${id}`
        );
    }

    validerConstat(id: string): Observable<ApiItemResponse<ConstatAudit>> {
        return this.http.post<ApiItemResponse<ConstatAudit>>(
            `${UrlConfig.AUDIT_CONSTATS_URL}/${id}/valider`, null
        );
    }

    retirerConstat(id: string): Observable<ApiItemResponse<ConstatAudit>> {
        return this.http.post<ApiItemResponse<ConstatAudit>>(
            `${UrlConfig.AUDIT_CONSTATS_URL}/${id}/retirer`, null
        );
    }

    publierConstat(id: string): Observable<ApiItemResponse<ConstatAudit>> {
        return this.http.post<ApiItemResponse<ConstatAudit>>(
            `${UrlConfig.AUDIT_CONSTATS_URL}/${id}/publier`, null
        );
    }

    publierMesConstats(auditId: string): Observable<ApiItemResponse<any>> {
        return this.http.post<ApiItemResponse<any>>(
            `${UrlConfig.AUDIT_CONSTATS_URL}/publier-mes-constats`,
            null,
            { params: this.buildParams({ auditId }) }
        );
    }

    getMesBrouillons(auditId: string): Observable<ApiResponse<ConstatAudit>> {
        return this.http.get<ApiResponse<ConstatAudit>>(
            `${UrlConfig.AUDIT_CONSTATS_URL}/mes-brouillons`,
            { params: this.buildParams({ auditId }) }
        );
    }

    getMesPoints(auditId: string): Observable<ApiResponse<ConstatAudit>> {
        return this.http.get<ApiResponse<ConstatAudit>>(
            `${UrlConfig.AUDIT_CONSTATS_URL}/mes-points`,
            { params: this.buildParams({ auditId }) }
        );
    }

    getSyntheseConstats(auditId: string): Observable<ApiItemResponse<CompilationConstats>> {
        return this.http.get<ApiItemResponse<CompilationConstats>>(
            `${UrlConfig.AUDIT_CONSTATS_URL}/synthese`,
            { params: this.buildParams({ auditId }) }
        );
    }

    getPreuves(constatId: string): Observable<ApiResponse<PreuveConstat>> {
        return this.http.get<ApiResponse<PreuveConstat>>(
            `${UrlConfig.AUDIT_CONSTATS_URL}/${constatId}/preuves`
        );
    }

    ajouterPreuve(constatId: string, fichier: File): Observable<ApiItemResponse<PreuveConstat>> {
        const formData = new FormData();
        formData.append('fichier', fichier);
        return this.http.post<ApiItemResponse<PreuveConstat>>(
            `${UrlConfig.AUDIT_CONSTATS_URL}/${constatId}/preuves`, formData
        );
    }

    supprimerPreuve(constatId: string, preuveId: string): Observable<ApiItemResponse<any>> {
        return this.http.delete<ApiItemResponse<any>>(
            `${UrlConfig.AUDIT_CONSTATS_URL}/${constatId}/preuves/${preuveId}`
        );
    }

    telechargerPreuve(constatId: string, preuveId: string): Observable<Blob> {
        return this.http.get(
            `${UrlConfig.AUDIT_CONSTATS_URL}/${constatId}/preuves/${preuveId}/fichier`,
            { responseType: 'blob' }
        );
    }

    // ---- Plan d'audit ----

    getPlanAudit(auditId: string): Observable<ApiItemResponse<PlanAudit>> {
        return this.http.get<ApiItemResponse<PlanAudit>>(
            UrlConfig.AUDIT_PLANS_URL,
            { params: this.buildParams({ auditId }) }
        );
    }

    sauvegarderPlanAudit(payload: Partial<PlanAudit>): Observable<ApiItemResponse<PlanAudit>> {
        return payload.id
            ? this.http.put<ApiItemResponse<PlanAudit>>(
                `${UrlConfig.AUDIT_PLANS_URL}/${payload.id}`, payload
              )
            : this.http.post<ApiItemResponse<PlanAudit>>(
                UrlConfig.AUDIT_PLANS_URL, payload
              );
    }

    partagerPlan(planId: string): Observable<ApiItemResponse<PlanAudit>> {
        return this.http.post<ApiItemResponse<PlanAudit>>(
            `${UrlConfig.AUDIT_PLANS_URL}/${planId}/partager`, null
        );
    }

    telechargerPlan(planId: string): Observable<Blob> {
        return this.http.get(
            `${UrlConfig.AUDIT_PLANS_URL}/${planId}/fichier`,
            { responseType: 'blob' }
        );
    }

    // ---- Signatures ----

    getSignatures(auditId: string): Observable<ApiResponse<SignatureAudit>> {
        return this.http.get<ApiResponse<SignatureAudit>>(
            UrlConfig.AUDIT_SIGNATURES_URL,
            { params: this.buildParams({ auditId }) }
        );
    }

    signer(signatureId: string): Observable<ApiItemResponse<SignatureAudit>> {
        return this.http.post<ApiItemResponse<SignatureAudit>>(
            `${UrlConfig.AUDIT_SIGNATURES_URL}/${signatureId}/signer`, null
        );
    }

    refuserSignature(signatureId: string, motif: string): Observable<ApiItemResponse<SignatureAudit>> {
        return this.http.post<ApiItemResponse<SignatureAudit>>(
            `${UrlConfig.AUDIT_SIGNATURES_URL}/${signatureId}/refuser`,
            { motif }
        );
    }

    // ---- Checklists ----

    getChecklists(page = 0, size = 50): Observable<ApiResponse<any>> {
        return this.http.get<ApiResponse<any>>(
            UrlConfig.AUDIT_CHECKLISTS_URL,
            { params: this.buildParams({ page, size }) }
        );
    }

    getChecklistById(id: string): Observable<ApiItemResponse<any>> {
        return this.http.get<ApiItemResponse<any>>(
            `${UrlConfig.AUDIT_CHECKLISTS_URL}/${id}`
        );
    }

    creerChecklist(payload: any): Observable<ApiItemResponse<any>> {
        return this.http.post<ApiItemResponse<any>>(UrlConfig.AUDIT_CHECKLISTS_URL, payload);
    }

    mettreAJourChecklist(id: string, payload: any): Observable<ApiItemResponse<any>> {
        return this.http.put<ApiItemResponse<any>>(
            `${UrlConfig.AUDIT_CHECKLISTS_URL}/${id}`, payload
        );
    }

    supprimerChecklist(id: string): Observable<ApiItemResponse<any>> {
        return this.http.delete<ApiItemResponse<any>>(
            `${UrlConfig.AUDIT_CHECKLISTS_URL}/${id}`
        );
    }

    // ---- Auditeurs ----

    getAuditeurs(page = 0, size = 50): Observable<ApiResponse<AuditeurFiche>> {
        return this.http.get<ApiResponse<AuditeurFiche>>(
            UrlConfig.AUDIT_AUDITEURS_URL,
            { params: this.buildParams({ page, size }) }
        );
    }

    getAuditeurById(id: string): Observable<ApiItemResponse<AuditeurFiche>> {
        return this.http.get<ApiItemResponse<AuditeurFiche>>(
            `${UrlConfig.AUDIT_AUDITEURS_URL}/${id}`
        );
    }

    creerAuditeur(payload: Partial<AuditeurFiche>): Observable<ApiItemResponse<AuditeurFiche>> {
        return this.http.post<ApiItemResponse<AuditeurFiche>>(
            UrlConfig.AUDIT_AUDITEURS_URL, payload
        );
    }

    mettreAJourAuditeur(id: string, payload: Partial<AuditeurFiche>): Observable<ApiItemResponse<AuditeurFiche>> {
        return this.http.put<ApiItemResponse<AuditeurFiche>>(
            `${UrlConfig.AUDIT_AUDITEURS_URL}/${id}`, payload
        );
    }

    // ---- Évaluations auditeur ----

    getEvaluationsAuditeur(auditId: string): Observable<ApiResponse<EvaluationAuditeur>> {
        return this.http.get<ApiResponse<EvaluationAuditeur>>(
            UrlConfig.AUDIT_EVALUATIONS_AUDITEUR_URL,
            { params: this.buildParams({ auditId }) }
        );
    }

    creerEvaluationAuditeur(payload: Partial<EvaluationAuditeur>): Observable<ApiItemResponse<EvaluationAuditeur>> {
        return this.http.post<ApiItemResponse<EvaluationAuditeur>>(
            UrlConfig.AUDIT_EVALUATIONS_AUDITEUR_URL, payload
        );
    }

    mettreAJourEvaluationAuditeur(
        id: string,
        payload: Partial<EvaluationAuditeur>
    ): Observable<ApiItemResponse<EvaluationAuditeur>> {
        return this.http.put<ApiItemResponse<EvaluationAuditeur>>(
            `${UrlConfig.AUDIT_EVALUATIONS_AUDITEUR_URL}/${id}`, payload
        );
    }

    // ---- Évaluation RQAPBF ----

    getEvaluationRQAPBF(auditId: string): Observable<ApiItemResponse<EvaluationRQAPBF>> {
        return this.http.get<ApiItemResponse<EvaluationRQAPBF>>(
            `${UrlConfig.AUDIT_EVALUATIONS_RQAPBF_URL}/${auditId}`
        );
    }

    sauvegarderNotations(
        auditId: string,
        notations: Partial<NotationCritere>[]
    ): Observable<ApiItemResponse<EvaluationRQAPBF>> {
        return this.http.post<ApiItemResponse<EvaluationRQAPBF>>(
            `${UrlConfig.AUDIT_EVALUATIONS_RQAPBF_URL}/${auditId}/notations`, notations
        );
    }

    publierEvaluationRQAPBF(auditId: string): Observable<ApiItemResponse<EvaluationRQAPBF>> {
        return this.http.post<ApiItemResponse<EvaluationRQAPBF>>(
            `${UrlConfig.AUDIT_EVALUATIONS_RQAPBF_URL}/${auditId}/publier`, null
        );
    }

    // ---- Référentiel RQAPBF ----

    getReferentielRQAPBF(): Observable<ApiItemResponse<NoeudReferentiel[]>> {
        return this.http.get<ApiItemResponse<NoeudReferentiel[]>>(
            UrlConfig.AUDIT_REFERENTIEL_RQAPBF_URL
        );
    }

    // ---- Données de référence ----

    getTypesAudit(): Observable<ApiResponse<TypeAuditRef>> {
        return this.http.get<ApiResponse<TypeAuditRef>>(UrlConfig.AUDIT_TYPES_AUDIT_URL);
    }

    getTypesConstat(): Observable<ApiResponse<TypeConstatRef>> {
        return this.http.get<ApiResponse<TypeConstatRef>>(UrlConfig.AUDIT_TYPES_CONSTAT_URL);
    }

    getSitesAudit(): Observable<ApiResponse<SiteAudit>> {
        return this.http.get<ApiResponse<SiteAudit>>(UrlConfig.AUDIT_SITES_URL);
    }
}
