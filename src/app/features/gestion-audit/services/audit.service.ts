import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, forkJoin, map, of } from 'rxjs';
import { AppNotificationService } from '@core/notifications/app-notification.service';
import { BaseCrudService } from '@core/services/base-crud.service';
import { UrlConfig } from '@core/services/url-config';
import {
    Audit, ConstatAudit, PlanAudit, SignatureAudit,
    AvancementAudit, TableauDeBord, CompilationConstats,
    RapportAudit, NoeudReferentiel, NotationCritere,
    EvaluationRQAPBF, AuditeurFiche, EvaluationAuditeur, ChecklistAudit,
    TypeAuditRef, TypeConstatRef, SiteAudit, PreuveConstat,
    PointControle, ComparaisonPeriodes, TransmissionEcarts,
    NotificationsAuditResume, NotificationAudit
} from '../models/audit.model';
import { ApiItemResponse, ApiResponse } from '../../../models/response.model';
import { NiveauEfficacite, NiveauNotationRQAPBF } from '../models/audit-enums';

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

/** Le message du serveur, à afficher tel quel plutôt qu'un message générique. */

/** Les filtres du portefeuille des auditeurs (A4), tels que le serveur les lit. */
export interface FiltresVivier {
    statut?: string;
    structureId?: string;
    certification?: string;
    nonEvalues?: boolean;
    /** Tranche de moyenne d'un niveau : minimum exclu, maximum compris. */
    moyenneMin?: number | null;
    moyenneMax?: number | null;
}
export function messageErreur(erreur: unknown, defaut: string): string {
    const e = erreur as HttpErrorResponse;
    return e?.error?.message || e?.error?.error || defaut;
}

/** Une liste servie à plat, ou paginée d'office par le GlobalResponseHandler du serveur. */
export function contenu<T>(res: any): T[] {
    const d = res?.data ?? res;
    return (Array.isArray(d) ? d : d?.content ?? []) as T[];
}

@Injectable({ providedIn: 'root' })
export class AuditGestionService extends BaseCrudService<Audit, string> {

    constructor(public override http: HttpClient, private appNotificationService: AppNotificationService) {
        super(http, AUDITS);
    }

    // ---- Notifications : badges des onglets, pastille du menu, cloche ----

    /** Les compteurs des onglets du module, comme `notificationsNC$` pour les non-conformités. */
    readonly notificationsAudit$ = new BehaviorSubject<NotificationsAuditResume>({
        total: 0, programme: 0, constats: 0, suivi: 0, checklists: 0, signatures: 0
    });

    getResumeNotifications(): Observable<NotificationsAuditResume> {
        return this.http.get<any>(`${AUDITS}/notifications/resume`).pipe(map(r => r?.data ?? r));
    }

    /** Les lignes de la cloche, recalculées par le serveur à chaque appel. */
    getNotificationsCloche(): Observable<NotificationAudit[]> {
        return this.http.get<any>(`${AUDITS}/notifications`).pipe(map(r => {
            const d = r?.data ?? r;
            return Array.isArray(d) ? d : (d?.data ?? d?.content ?? []);
        }));
    }

    /** Relit les compteurs et les pousse aux onglets et à la pastille du menu ; à appeler après un geste. */
    rafraichirNotifications(): void {
        this.getResumeNotifications().pipe(catchError(() => of(null))).subscribe(r => {
            if (!r) return;
            this.notificationsAudit$.next(r);
            this.appNotificationService.setModuleBadge('AUDIT', r.total ?? 0);
        });
    }

    // ---- Programme : la liste se lit à la racine `/audits`, la fiche à `/get/{id}` ----

    override findAll(page?: number, size?: number, filters?: Record<string, any>): Observable<ApiResponse<Audit>> {
        const f = { ...filters };
        if (Array.isArray(f['statuts'])) f['statuts'] = f['statuts'].join(',');
        return this.http.get<ApiResponse<Audit>>(AUDITS, { params: this.buildParams({ ...f, page, size }) });
    }

    override findById(id: string): Observable<ApiItemResponse<Audit>> {
        return this.http.get<ApiItemResponse<Audit>>(`${AUDITS}/get/${id}`);
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

    annulerAudit(auditId: string): Observable<ApiItemResponse<Audit>> {
        return this.http.put<ApiItemResponse<Audit>>(`${AUDITS}/${auditId}/annuler`, null);
    }

    cloturerAudit(auditId: string): Observable<ApiItemResponse<Audit>> {
        return this.http.put<ApiItemResponse<Audit>>(
            `${AUDITS}/${auditId}/cloturer`, null
        );
    }

    /** Valide d'un geste plusieurs audits planifiés du programme. */
    validerProgramme(auditIds: string[]): Observable<ApiItemResponse<Audit[]>> {
        return this.http.put<ApiItemResponse<Audit[]>>(`${AUDITS}/programme/valider`, auditIds);
    }

    // ---- Suivi du programme (D16–D18) ----

    comparer(debut1: string, fin1: string, debut2: string, fin2: string): Observable<ApiItemResponse<ComparaisonPeriodes>> {
        return this.http.get<ApiItemResponse<ComparaisonPeriodes>>(`${AUDITS}/comparaison`, {
            params: this.buildParams({ debut1, fin1, debut2, fin2 })
        });
    }

    /** Les écarts RQAP-BF publiés, page par page : toute la direction, ou un audit (`auditId`). */
    getEcartsRqapbf(filtres: Record<string, any> = {}, page = 0, size = 10): Observable<ApiResponse<NotationCritere>> {
        return this.http.get<ApiResponse<NotationCritere>>(
            `${AUDITS}/ecarts-rqapbf`,
            { params: this.buildParams({ ...filtres, page, size }) }
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
        payload: { conclusions?: string; recommandations?: string }
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

    /** Renvoie au module Non-conformités les écarts publiés qui n'y ont pas encore de dossier. */
    transmettreEcarts(auditId: string): Observable<ApiItemResponse<TransmissionEcarts>> {
        return this.http.put<ApiItemResponse<TransmissionEcarts>>(
            `${AUDITS}/${auditId}/transmettre-ecarts`, null
        );
    }

    /**
     * L'efficacité d'une action de maîtrise des risques. Les actions elles-mêmes voyagent avec
     * l'audit (`actionsMaitriseRisques`) : elles se saisissent par `updateObject`.
     */
    setEfficaciteAction(auditId: string, actionId: string, niveau: NiveauEfficacite): Observable<ApiItemResponse<Audit>> {
        return this.http.put<ApiItemResponse<Audit>>(
            `${AUDITS}/${auditId}/actions-risque/${actionId}/efficacite`,
            null,
            { params: this.buildParams({ niveau }) }
        );
    }

    // ---- Constats ----

    /**
     * La compilation d'équipe d'un audit (constats versés et publiés), filtrée ici par statut :
     * le serveur sert la liste entière. Les brouillons de l'appelant se lisent par `getMesBrouillons`.
     */
    getConstats(auditId: string, statut?: string): Observable<ApiResponse<ConstatAudit>> {
        return this.http
            .get<ApiResponse<ConstatAudit>>(`${CONSTATS}/all`, { params: this.buildParams({ auditId, page: 0, size: 1000 }) })
            .pipe(map(res => {
                const tous = contenu<ConstatAudit>(res).filter(c => !statut || c.statut === statut);
                return { ...res, data: { content: tous, totalElements: tous.length } } as ApiResponse<ConstatAudit>;
            }));
    }

    /**
     * Ce que l'appelant voit des constats d'un audit : la compilation d'équipe (compilés et
     * publiés) et ses propres brouillons, que `/all` ne sert pas.
     */
    constatsDeLAudit(auditId: string): Observable<ConstatAudit[]> {
        return forkJoin([this.getConstats(auditId), this.getMesBrouillons(auditId)]).pipe(
            map(([equipe, brouillons]) => {
                const tous = [...contenu<ConstatAudit>(brouillons), ...contenu<ConstatAudit>(equipe)];
                return tous.filter((c, i) => tous.findIndex(x => x.id === c.id) === i);
            })
        );
    }

    getConstatById(id: string): Observable<ApiItemResponse<ConstatAudit>> {
        return this.http.get<ApiItemResponse<ConstatAudit>>(
            `${CONSTATS}/get/${id}`
        );
    }

    /** Le constat naît brouillon dans l'audit `payload.auditId`, passé en paramètre comme l'attend le serveur. */
    creerConstat(payload: Partial<ConstatAudit>): Observable<ApiItemResponse<ConstatAudit>> {
        return this.http.post<ApiItemResponse<ConstatAudit>>(
            `${CONSTATS}/create`, payload, { params: this.buildParams({ auditId: payload.auditId }) }
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

    /** L'équipe renvoie un constat compilé à son auteur, avec un motif facultatif. */
    retirerConstat(id: string, motif?: string): Observable<ApiItemResponse<ConstatAudit>> {
        return this.http.put<ApiItemResponse<ConstatAudit>>(
            `${CONSTATS}/${id}/retirer`, motif ? { motif } : null
        );
    }

    /** « Valider ce groupe » (une nature) ou « L'équipe est d'accord — valider tout » (sans nature). */
    validerCompilation(auditId: string, natureId?: string): Observable<ApiItemResponse<ConstatAudit[]>> {
        return this.http.put<ApiItemResponse<ConstatAudit[]>>(
            `${CONSTATS}/valider-compilation`, null, { params: this.buildParams({ auditId, natureId }) }
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

    getMesPoints(auditId: string): Observable<ApiResponse<PointControle>> {
        return this.http.get<ApiResponse<PointControle>>(
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
        formData.append('fichiers', fichier);
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
            `${CONSTATS}/preuves/${preuveId}`,
            { responseType: 'blob' }
        );
    }

    // ---- Plan d'audit (nested /audits/{auditId}/plan/) ----

    getPlanAudit(auditId: string): Observable<ApiItemResponse<PlanAudit>> {
        return this.http.get<ApiItemResponse<PlanAudit>>(`${AUDITS}/${auditId}/plan`);
    }

    sauvegarderPlanAudit(auditId: string, payload: Partial<PlanAudit>): Observable<ApiItemResponse<PlanAudit>> {
        return this.http.put<ApiItemResponse<PlanAudit>>(`${AUDITS}/${auditId}/plan`, payload);
    }

    validerPlan(auditId: string): Observable<ApiItemResponse<PlanAudit>> {
        return this.http.put<ApiItemResponse<PlanAudit>>(`${AUDITS}/${auditId}/plan/valider`, null);
    }

    /** Un plan reçu tout fait (PDF, Word…) plutôt que rédigé dans l'application. */
    chargerPlan(auditId: string, fichier: File): Observable<ApiItemResponse<PlanAudit>> {
        const formData = new FormData();
        formData.append('fichier', fichier);
        return this.http.post<ApiItemResponse<PlanAudit>>(`${AUDITS}/${auditId}/plan/fichier`, formData);
    }

    /** Le plan rédigé, mis en page en PDF ou en Word. */
    exporterPlan(auditId: string, format: 'PDF' | 'WORD'): Observable<Blob> {
        return this.http.get(`${AUDITS}/${auditId}/plan/export`, { responseType: 'blob', params: this.buildParams({ format }) });
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

    /** Pose le circuit : les signataires (identifiants d'utilisateur), sans ordre imposé. */
    poserCircuitSignature(auditId: string, signataires: Partial<SignatureAudit>[]): Observable<ApiResponse<SignatureAudit>> {
        return this.http.put<ApiResponse<SignatureAudit>>(`${AUDITS}/${auditId}/signatures`, signataires);
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

    /** L'écran des checklists, page par page ; `statut`, `search` et `sort` bornent la page. */
    pageChecklists(page: number, size: number, filtres: Record<string, any> = {}): Observable<ApiResponse<ChecklistAudit>> {
        return this.http.get<ApiResponse<ChecklistAudit>>(CHECKLISTS, { params: this.buildParams({ ...filtres, page, size }) });
    }

    /** Toutes les checklists, pour les listes de choix. */
    getChecklists(): Observable<ApiResponse<ChecklistAudit>> {
        return this.http.get<ApiResponse<ChecklistAudit>>(`${CHECKLISTS}/all`);
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

    /**
     * L'écran du vivier, page par page. Le serveur ne connaît pas les noms : une recherche se
     * résout d'abord dans l'annuaire, et `utilisateurIds` borne la page aux personnes trouvées.
     */
    pageAuditeurs(page: number, size: number, utilisateurIds?: string[], filtres: FiltresVivier = {}): Observable<ApiResponse<AuditeurFiche>> {
        const params: Record<string, any> = { page, size };
        if (utilisateurIds) params['utilisateurIds'] = utilisateurIds.join(',');
        if (filtres.statut) params['statut'] = filtres.statut;
        if (filtres.structureId) params['structureId'] = filtres.structureId;
        if (filtres.certification) params['certification'] = filtres.certification;
        if (filtres.nonEvalues) params['nonEvalues'] = true;
        if (filtres.moyenneMin != null) params['moyenneMin'] = filtres.moyenneMin;
        if (filtres.moyenneMax != null) params['moyenneMax'] = filtres.moyenneMax;
        return this.http.get<ApiResponse<AuditeurFiche>>(AUDITEURS, { params: this.buildParams(params) });
    }

    /** Le vivier entier, pour les listes de choix. */
    getAuditeurs(): Observable<ApiResponse<AuditeurFiche>> {
        return this.http.get<ApiResponse<AuditeurFiche>>(`${AUDITEURS}/all`);
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

    /** Libre sur la période, hors l'audit `auditIdExclu` (celui qu'on modifie). */
    verifierDisponibilite(auditeurId: string, debut: string, fin: string, auditIdExclu?: string): Observable<ApiItemResponse<boolean>> {
        return this.http.get<ApiItemResponse<boolean>>(
            `${AUDITEURS}/${auditeurId}/disponibilite`,
            { params: this.buildParams({ debut, fin, auditId: auditIdExclu }) }
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

    validerEvaluationAuditeur(id: string): Observable<ApiItemResponse<EvaluationAuditeur>> {
        return this.http.put<ApiItemResponse<EvaluationAuditeur>>(
            `${EVALS_AUDITEUR}/${id}/valider`, null
        );
    }

    // ---- Évaluation RQAPBF ----

    /** Les évaluations RQAP-BF d'un audit, de la plus ancienne à la plus récente. */
    getEvaluationsRQAPBF(auditId: string): Observable<EvaluationRQAPBF[]> {
        return this.http
            .get(`${EVALS_RQAPBF}/all`, { params: this.buildParams({ auditId }) })
            .pipe(map(res => contenu<EvaluationRQAPBF>(res)));
    }

    /** La dernière évaluation RQAP-BF de l'audit ; `data` nul s'il n'en a pas encore. */
    getEvaluationRQAPBF(auditId: string): Observable<ApiItemResponse<EvaluationRQAPBF | null>> {
        return this.getEvaluationsRQAPBF(auditId).pipe(
            map(evals => ({ data: evals.length ? evals[evals.length - 1] : null, message: '', statusCode: 200 }))
        );
    }

    creerEvaluationRQAPBF(auditId: string): Observable<ApiItemResponse<EvaluationRQAPBF>> {
        return this.http.post<ApiItemResponse<EvaluationRQAPBF>>(
            `${EVALS_RQAPBF}/create`, null, { params: this.buildParams({ auditId }) }
        );
    }

    sauvegarderNotations(evalId: string, notations: Partial<NotationCritere>[]): Observable<ApiItemResponse<EvaluationRQAPBF>> {
        return this.http.put<ApiItemResponse<EvaluationRQAPBF>>(`${EVALS_RQAPBF}/${evalId}/notations`, notations);
    }

    publierCritereRQAPBF(evalId: string, noeudId: string): Observable<ApiItemResponse<EvaluationRQAPBF>> {
        return this.http.put<ApiItemResponse<EvaluationRQAPBF>>(`${EVALS_RQAPBF}/${evalId}/notations/${noeudId}/publier`, null);
    }

    /** Publie les critères en brouillon d'un niveau, ou de tous les niveaux sans `niveau`. */
    publierEvaluationRQAPBF(evalId: string, niveau?: NiveauNotationRQAPBF): Observable<ApiItemResponse<EvaluationRQAPBF>> {
        return this.http.put<ApiItemResponse<EvaluationRQAPBF>>(
            `${EVALS_RQAPBF}/${evalId}/publier-groupe`, null, { params: this.buildParams({ niveau }) }
        );
    }

    /** Publie tout ce qui est noté et fige l'évaluation : les résultats deviennent officiels. */
    validerEvaluationRQAPBF(evalId: string): Observable<ApiItemResponse<EvaluationRQAPBF>> {
        return this.http.put<ApiItemResponse<EvaluationRQAPBF>>(`${EVALS_RQAPBF}/${evalId}/valider`, null);
    }

    getEcartsEvaluationRQAPBF(evalId: string): Observable<NotationCritere[]> {
        return this.http.get(`${EVALS_RQAPBF}/${evalId}/ecarts`).pipe(map(res => contenu<NotationCritere>(res)));
    }

    // ---- Référentiel RQAPBF ----

    getReferentielRQAPBF(): Observable<ApiItemResponse<NoeudReferentiel[]>> {
        return this.http.get<ApiItemResponse<NoeudReferentiel[]>>(`${REF_RQAPBF}/all`);
    }

    creerNoeud(noeud: Partial<NoeudReferentiel>): Observable<ApiItemResponse<NoeudReferentiel>> {
        return this.http.post<ApiItemResponse<NoeudReferentiel>>(`${REF_RQAPBF}/create`, noeud);
    }

    modifierNoeud(id: string, noeud: Partial<NoeudReferentiel>): Observable<ApiItemResponse<NoeudReferentiel>> {
        return this.http.put<ApiItemResponse<NoeudReferentiel>>(`${REF_RQAPBF}/update/${id}`, noeud);
    }

    /** Refusé par le serveur si le nœud a des descendants, ou si le critère a déjà été noté. */
    supprimerNoeud(id: string): Observable<unknown> {
        return this.http.delete(`${REF_RQAPBF}/delete/${id}`);
    }

    // ---- Données de référence ----

    getTypesAudit(): Observable<ApiResponse<TypeAuditRef>> {
        return this.http.get<ApiResponse<TypeAuditRef>>(`${TYPES_AUDIT}/all`);
    }

    getTypesConstat(): Observable<ApiResponse<TypeConstatRef>> {
        return this.http.get<ApiResponse<TypeConstatRef>>(`${TYPES_CONSTAT}/all`);
    }

    /** Les sites, retirés compris (`actif` à faux) : un site retiré reste lisible sur les audits qui le portent. */
    getSitesAudit(): Observable<ApiResponse<SiteAudit>> {
        return this.http.get<ApiResponse<SiteAudit>>(`${SITES}/all`, { params: this.buildParams({ inactifs: true }) });
    }
}
