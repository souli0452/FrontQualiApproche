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

const AUDITS = UrlConfig.AUDIT_ROOT_URL;
const CONSTATS = UrlConfig.AUDIT_CONSTATS_URL;
const CHECKLISTS = UrlConfig.AUDIT_CHECKLISTS_URL;
const AUDITEURS = UrlConfig.AUDIT_AUDITEURS_URL;
const EVALS_AUDITEUR = UrlConfig.AUDIT_EVALUATIONS_AUDITEUR_URL;
const EVALS_RQAPBF = UrlConfig.AUDIT_EVALUATIONS_RQAPBF_URL;
const REF_RQAPBF = UrlConfig.AUDIT_REFERENTIEL_RQAPBF_URL;
const TYPES_AUDIT = UrlConfig.AUDIT_TYPES_AUDIT_URL;
const TYPES_CONSTAT = UrlConfig.AUDIT_TYPES_CONSTAT_URL;
const SITES = UrlConfig.AUDIT_SITES_URL;

@Injectable({ providedIn: 'root' })
export class AuditGestionService extends BaseCrudService<Audit, string> {

    constructor(public override http: HttpClient) {
        super(http, AUDITS);
    }

    // ---- Tableau de bord ----

    getTableauDeBord(annee?: number): Observable<ApiItemResponse<TableauDeBord>> {
        const params = annee ? this.buildParams({ annee }) : undefined;
        return this.http.get<ApiItemResponse<TableauDeBord>>(
            `${AUDITS}/tableau-de-bord`,
            params ? { params } : {}
        );
    }

    // ---- Avancement ----

    getAvancement(auditId: string): Observable<ApiItemResponse<AvancementAudit>> {
        return this.http.get<ApiItemResponse<AvancementAudit>>(
            `${AUDITS}/${auditId}/avancement`
        );
    }

    // ---- Cycle de vie (PUT — transitions d'état backend) ----

    validerAudit(auditId: string): Observable<ApiItemResponse<Audit>> {
        return this.http.put<ApiItemResponse<Audit>>(
            `${AUDITS}/${auditId}/valider`, null
        );
    }

    demarrerAudit(auditId: string): Observable<ApiItemResponse<Audit>> {
        return this.http.put<ApiItemResponse<Audit>>(
            `${AUDITS}/${auditId}/demarrer`, null
        );
    }

    annulerAudit(auditId: string, motif?: string): Observable<ApiItemResponse<Audit>> {
        return this.http.put<ApiItemResponse<Audit>>(
            `${AUDITS}/${auditId}/annuler`,
            motif ? { motif } : null
        );
    }

    cloturerAudit(auditId: string): Observable<ApiItemResponse<Audit>> {
        return this.http.put<ApiItemResponse<Audit>>(
            `${AUDITS}/${auditId}/cloturer`, null
        );
    }

    validerProgramme(annee: number): Observable<ApiItemResponse<any>> {
        return this.http.put<ApiItemResponse<any>>(
            `${AUDITS}/valider-programme`,
            null,
            { params: this.buildParams({ annee }) }
        );
    }

    // ---- Rapport ----

    getRapport(auditId: string): Observable<ApiItemResponse<RapportAudit>> {
        return this.http.get<ApiItemResponse<RapportAudit>>(
            `${AUDITS}/${auditId}/rapport`
        );
    }

    uploadRapport(auditId: string, fichier: File): Observable<ApiItemResponse<Audit>> {
        const formData = new FormData();
        formData.append('fichier', fichier);
        return this.http.post<ApiItemResponse<Audit>>(
            `${AUDITS}/${auditId}/rapport/fichier`, formData
        );
    }

    sauvegarderConclusions(
        auditId: string,
        payload: { conclusionsRapport?: string; recommandationsRapport?: string }
    ): Observable<ApiItemResponse<Audit>> {
        return this.http.put<ApiItemResponse<Audit>>(
            `${AUDITS}/${auditId}/rapport/redaction`, payload
        );
    }

    telechargerRapportFichier(auditId: string): Observable<Blob> {
        return this.http.get(
            `${AUDITS}/${auditId}/rapport/fichier`,
            { responseType: 'blob' }
        );
    }

    exporterRapport(auditId: string, format: 'PDF' | 'WORD'): Observable<Blob> {
        return this.http.get(
            `${AUDITS}/${auditId}/rapport/export`,
            { responseType: 'blob', params: this.buildParams({ format }) }
        );
    }

    // ---- Écarts & actions de maîtrise des risques ----

    transmettreEcarts(auditId: string): Observable<ApiItemResponse<any>> {
        return this.http.put<ApiItemResponse<any>>(
            `${AUDITS}/${auditId}/transmettre-ecarts`, null
        );
    }

    getActionsMaitriseRisques(auditId: string): Observable<ApiItemResponse<ActionMaitriseRisque[]>> {
        return this.http.get<ApiItemResponse<ActionMaitriseRisque[]>>(
            `${AUDITS}/${auditId}/actions-risque`
        );
    }

    sauvegarderActionsMaitriseRisques(
        auditId: string,
        actions: ActionMaitriseRisque[]
    ): Observable<ApiItemResponse<ActionMaitriseRisque[]>> {
        return this.http.put<ApiItemResponse<ActionMaitriseRisque[]>>(
            `${AUDITS}/${auditId}/actions-risque`, actions
        );
    }

    setEfficaciteAction(
        auditId: string,
        actionId: string,
        efficacite: NiveauEfficacite
    ): Observable<ApiItemResponse<ActionMaitriseRisque>> {
        return this.http.put<ApiItemResponse<ActionMaitriseRisque>>(
            `${AUDITS}/${auditId}/actions-risque/${actionId}/efficacite`,
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
            `${CONSTATS}/all`,
            { params: this.buildParams(p) }
        );
    }

    getConstatById(id: string): Observable<ApiItemResponse<ConstatAudit>> {
        return this.http.get<ApiItemResponse<ConstatAudit>>(
            `${CONSTATS}/get/${id}`
        );
    }

    creerConstat(payload: Partial<ConstatAudit>): Observable<ApiItemResponse<ConstatAudit>> {
        return this.http.post<ApiItemResponse<ConstatAudit>>(
            `${CONSTATS}/create`, payload
        );
    }

    mettreAJourConstat(id: string, payload: Partial<ConstatAudit>): Observable<ApiItemResponse<ConstatAudit>> {
        return this.http.put<ApiItemResponse<ConstatAudit>>(
            `${CONSTATS}/update/${id}`, payload
        );
    }

    supprimerConstat(id: string): Observable<ApiItemResponse<any>> {
        return this.http.delete<ApiItemResponse<any>>(
            `${CONSTATS}/delete/${id}`
        );
    }

    // Transitions 3-états (PUT — BROUILLON → COMPILE → PUBLIE)

    validerConstat(id: string): Observable<ApiItemResponse<ConstatAudit>> {
        return this.http.put<ApiItemResponse<ConstatAudit>>(
            `${CONSTATS}/${id}/valider`, null
        );
    }

    retirerConstat(id: string): Observable<ApiItemResponse<ConstatAudit>> {
        return this.http.put<ApiItemResponse<ConstatAudit>>(
            `${CONSTATS}/${id}/retirer`, null
        );
    }

    publierConstat(id: string): Observable<ApiItemResponse<ConstatAudit>> {
        return this.http.put<ApiItemResponse<ConstatAudit>>(
            `${CONSTATS}/${id}/publier`, null
        );
    }

    publierMesConstats(auditId: string): Observable<ApiItemResponse<any>> {
        return this.http.put<ApiItemResponse<any>>(
            `${CONSTATS}/publier-mes-constats`,
            null,
            { params: this.buildParams({ auditId }) }
        );
    }

    getMesBrouillons(auditId: string): Observable<ApiResponse<ConstatAudit>> {
        return this.http.get<ApiResponse<ConstatAudit>>(
            `${CONSTATS}/mes-brouillons`,
            { params: this.buildParams({ auditId }) }
        );
    }

    getMesPoints(auditId: string): Observable<ApiResponse<ConstatAudit>> {
        return this.http.get<ApiResponse<ConstatAudit>>(
            `${CONSTATS}/mes-points`,
            { params: this.buildParams({ auditId }) }
        );
    }

    getSyntheseConstats(auditId: string): Observable<ApiItemResponse<CompilationConstats>> {
        return this.http.get<ApiItemResponse<CompilationConstats>>(
            `${CONSTATS}/synthese`,
            { params: this.buildParams({ auditId }) }
        );
    }

    // ---- Preuves ----

    getPreuves(constatId: string): Observable<ApiResponse<PreuveConstat>> {
        return this.http.get<ApiResponse<PreuveConstat>>(
            `${CONSTATS}/${constatId}/preuves`
        );
    }

    ajouterPreuve(constatId: string, fichier: File): Observable<ApiItemResponse<PreuveConstat>> {
        const formData = new FormData();
        formData.append('fichier', fichier);
        return this.http.post<ApiItemResponse<PreuveConstat>>(
            `${CONSTATS}/${constatId}/preuves`, formData
        );
    }

    supprimerPreuve(preuveId: string): Observable<ApiItemResponse<any>> {
        return this.http.delete<ApiItemResponse<any>>(
            `${CONSTATS}/preuves/${preuveId}`
        );
    }

    telechargerPreuve(preuveId: string): Observable<Blob> {
        return this.http.get(
            `${CONSTATS}/preuves/${preuveId}/fichier`,
            { responseType: 'blob' }
        );
    }

    // ---- Plan d'audit (nested /audits/{auditId}/plan/) ----

    getPlanAudit(auditId: string): Observable<ApiItemResponse<PlanAudit>> {
        return this.http.get<ApiItemResponse<PlanAudit>>(
            `${AUDITS}/${auditId}/plan/`
        );
    }

    sauvegarderPlanAudit(auditId: string, payload: Partial<PlanAudit>): Observable<ApiItemResponse<PlanAudit>> {
        return this.http.put<ApiItemResponse<PlanAudit>>(
            `${AUDITS}/${auditId}/plan/`, payload
        );
    }

    partagerPlan(auditId: string): Observable<ApiItemResponse<PlanAudit>> {
        return this.http.put<ApiItemResponse<PlanAudit>>(
            `${AUDITS}/${auditId}/plan/partager`, null
        );
    }

    telechargerPlan(auditId: string): Observable<Blob> {
        return this.http.get(
            `${AUDITS}/${auditId}/plan/fichier`,
            { responseType: 'blob' }
        );
    }

    // ---- Signatures (nested /audits/{auditId}/signatures) ----

    getSignatures(auditId: string): Observable<ApiResponse<SignatureAudit>> {
        return this.http.get<ApiResponse<SignatureAudit>>(
            `${AUDITS}/${auditId}/signatures`
        );
    }

    signerAudit(auditId: string): Observable<ApiItemResponse<SignatureAudit>> {
        return this.http.put<ApiItemResponse<SignatureAudit>>(
            `${AUDITS}/${auditId}/signatures/signer`, null
        );
    }

    refuserSignature(auditId: string, motif: string): Observable<ApiItemResponse<SignatureAudit>> {
        return this.http.put<ApiItemResponse<SignatureAudit>>(
            `${AUDITS}/${auditId}/signatures/refuser`, { motif }
        );
    }

    // ---- Checklists ----

    getChecklists(page = 0, size = 50): Observable<ApiResponse<any>> {
        return this.http.get<ApiResponse<any>>(
            `${CHECKLISTS}/all`,
            { params: this.buildParams({ page, size }) }
        );
    }

    getChecklistById(id: string): Observable<ApiItemResponse<any>> {
        return this.http.get<ApiItemResponse<any>>(
            `${CHECKLISTS}/get/${id}`
        );
    }

    creerChecklist(payload: any): Observable<ApiItemResponse<any>> {
        return this.http.post<ApiItemResponse<any>>(`${CHECKLISTS}/create`, payload);
    }

    mettreAJourChecklist(id: string, payload: any): Observable<ApiItemResponse<any>> {
        return this.http.put<ApiItemResponse<any>>(
            `${CHECKLISTS}/update/${id}`, payload
        );
    }

    supprimerChecklist(id: string): Observable<ApiItemResponse<any>> {
        return this.http.delete<ApiItemResponse<any>>(
            `${CHECKLISTS}/delete/${id}`
        );
    }

    publierChecklist(id: string): Observable<ApiItemResponse<any>> {
        return this.http.put<ApiItemResponse<any>>(
            `${CHECKLISTS}/${id}/publier`, null
        );
    }

    archiverChecklist(id: string): Observable<ApiItemResponse<any>> {
        return this.http.put<ApiItemResponse<any>>(
            `${CHECKLISTS}/${id}/archiver`, null
        );
    }

    dupliquerChecklist(id: string): Observable<ApiItemResponse<any>> {
        return this.http.post<ApiItemResponse<any>>(
            `${CHECKLISTS}/${id}/dupliquer`, null
        );
    }

    // ---- Auditeurs ----

    getAuditeurs(page = 0, size = 50): Observable<ApiResponse<AuditeurFiche>> {
        return this.http.get<ApiResponse<AuditeurFiche>>(
            `${AUDITEURS}/all`,
            { params: this.buildParams({ page, size }) }
        );
    }

    getAuditeurById(id: string): Observable<ApiItemResponse<AuditeurFiche>> {
        return this.http.get<ApiItemResponse<AuditeurFiche>>(
            `${AUDITEURS}/get/${id}`
        );
    }

    creerAuditeur(payload: Partial<AuditeurFiche>): Observable<ApiItemResponse<AuditeurFiche>> {
        return this.http.post<ApiItemResponse<AuditeurFiche>>(
            `${AUDITEURS}/create`, payload
        );
    }

    mettreAJourAuditeur(id: string, payload: Partial<AuditeurFiche>): Observable<ApiItemResponse<AuditeurFiche>> {
        return this.http.put<ApiItemResponse<AuditeurFiche>>(
            `${AUDITEURS}/update/${id}`, payload
        );
    }

    supprimerAuditeur(id: string): Observable<ApiItemResponse<any>> {
        return this.http.delete<ApiItemResponse<any>>(
            `${AUDITEURS}/delete/${id}`
        );
    }

    verifierDisponibilite(auditeurId: string, dateDebut: string, dateFin: string): Observable<ApiItemResponse<any>> {
        return this.http.get<ApiItemResponse<any>>(
            `${AUDITEURS}/${auditeurId}/disponibilite`,
            { params: this.buildParams({ dateDebut, dateFin }) }
        );
    }

    verifierConflitInteret(auditeurId: string, auditId: string): Observable<ApiItemResponse<any>> {
        return this.http.get<ApiItemResponse<any>>(
            `${AUDITEURS}/${auditeurId}/conflit-interet`,
            { params: this.buildParams({ auditId }) }
        );
    }

    // ---- Évaluations auditeur ----

    getEvaluationsAuditeur(auditId: string): Observable<ApiResponse<EvaluationAuditeur>> {
        return this.http.get<ApiResponse<EvaluationAuditeur>>(
            `${EVALS_AUDITEUR}/all`,
            { params: this.buildParams({ auditId }) }
        );
    }

    creerEvaluationAuditeur(payload: Partial<EvaluationAuditeur>): Observable<ApiItemResponse<EvaluationAuditeur>> {
        return this.http.post<ApiItemResponse<EvaluationAuditeur>>(
            `${EVALS_AUDITEUR}/create`, payload
        );
    }

    mettreAJourEvaluationAuditeur(
        id: string,
        payload: Partial<EvaluationAuditeur>
    ): Observable<ApiItemResponse<EvaluationAuditeur>> {
        return this.http.put<ApiItemResponse<EvaluationAuditeur>>(
            `${EVALS_AUDITEUR}/update/${id}`, payload
        );
    }

    validerEvaluationAuditeur(id: string): Observable<ApiItemResponse<EvaluationAuditeur>> {
        return this.http.put<ApiItemResponse<EvaluationAuditeur>>(
            `${EVALS_AUDITEUR}/${id}/valider`, null
        );
    }

    // ---- Évaluation RQAPBF ----

    getEvaluationRQAPBF(auditId: string): Observable<ApiItemResponse<EvaluationRQAPBF>> {
        return this.http.get<ApiItemResponse<EvaluationRQAPBF>>(
            `${EVALS_RQAPBF}/by-audit/${auditId}`
        );
    }

    sauvegarderNotations(
        evalId: string,
        notations: Partial<NotationCritere>[]
    ): Observable<ApiItemResponse<EvaluationRQAPBF>> {
        return this.http.put<ApiItemResponse<EvaluationRQAPBF>>(
            `${EVALS_RQAPBF}/update/${evalId}/notations`, notations
        );
    }

    publierEvaluationRQAPBF(evalId: string): Observable<ApiItemResponse<EvaluationRQAPBF>> {
        return this.http.put<ApiItemResponse<EvaluationRQAPBF>>(
            `${EVALS_RQAPBF}/${evalId}/publier`, null
        );
    }

    // ---- Référentiel RQAPBF ----

    getReferentielRQAPBF(): Observable<ApiItemResponse<NoeudReferentiel[]>> {
        return this.http.get<ApiItemResponse<NoeudReferentiel[]>>(REF_RQAPBF);
    }

    // ---- Données de référence ----

    getTypesAudit(): Observable<ApiResponse<TypeAuditRef>> {
        return this.http.get<ApiResponse<TypeAuditRef>>(`${TYPES_AUDIT}/all`);
    }

    getTypesConstat(): Observable<ApiResponse<TypeConstatRef>> {
        return this.http.get<ApiResponse<TypeConstatRef>>(`${TYPES_CONSTAT}/all`);
    }

    getSitesAudit(): Observable<ApiResponse<SiteAudit>> {
        return this.http.get<ApiResponse<SiteAudit>>(`${SITES}/all`);
    }
}
