import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams, HttpResponse } from '@angular/common/http';
import { BehaviorSubject, catchError, forkJoin, map, Observable, of } from 'rxjs';
import { NonConformiteUrlConfig } from '../components/config/proc-non-conformite.urls.configs';
import { ApiItemResponse, ApiResponse } from '../../../models/response.model';
import { CriteriaDto } from '../../../models/criteria.model';
import { NcNotificationsResumeDto, NotificationClocheDto } from '../models/nc-notifications';
import { BaseCrudService } from '@core/services/base-crud.service';
import { AppNotificationService } from '@core/notifications/app-notification.service';
import { QualiUrlConfig } from '@core/services/url-config';
import { NonConformite } from '../models/non-conformite.model';
import { EtapeTraitement } from '../models/nc-status.model';
import { NcStats } from '../models/nc-stats.model';

/**
 * Service principal et canonique du module **Non-Conformité**.
 *
 * <p>Centralise l'intégralité des opérations HTTP et de la logique métier liée aux Non-Conformités :
 * création, soumission, traitement de workflow, upload de preuves, génération de la fiche de clôture,
 * recherche multi-critères, statistiques et notifications réactives.</p>
 */
@Injectable({ providedIn: 'root' })
export class NonConformiteService extends BaseCrudService<NonConformite, string> {

    constructor(
        public override http: HttpClient,
        private appNotificationService: AppNotificationService
    ) {
        super(http, QualiUrlConfig.NON_CONFORMITE_ROOT_URL);
    }

    // =========================================================================
    // 1. ÉTAT RÉACTIF & NOTIFICATIONS (BADGES DE NAVIGATION)
    // =========================================================================

    /**
     * Flux réactif contenant les compteurs de dossiers en attente par étape.
     * Alimente directement les badges dynamiques du sous-menu / layout Non-Conformité.
     */
    public notificationsNC$ = new BehaviorSubject<{
        aTraiter: number;    // Non-Conformités en attente de traitement (onglet Traitement & alerte 1)
        planAction: number;  // Actions correctives à réaliser (onglet Plan d'action & alerte 2)
    }>({
        aTraiter: 0,
        planAction: 0
    });


        // =========================================================================
    // NOTIFICATIONS OFFICIELLES BACKEND
    // =========================================================================

    /**
     * Récupère le résumé chiffré des alertes NC pour alimenter les badges du menu (Sidebar).
     * @backend GET `${QualiUrlConfig.NON_CONFORMITE_ROOT_URL}/notifications/resume`
     */
    getResumeNotifications(): Observable<NcNotificationsResumeDto> {
        return this.http.get<NcNotificationsResumeDto>(
            `${QualiUrlConfig.NON_CONFORMITE_ROOT_URL}/notifications/resume`
        );
    }

    /**
    * Récupère la ventilation exacte des NC attendant l'utilisateur par étape (calculé par le moteur de workflow).
    * @backend GET `${QualiUrlConfig.NON_CONFORMITE_ROOT_URL}/dashboard/par-etape`
    */
    getNonConformitesParEtape(): Observable<{ [etape: string]: number }> {
        return this.http.get<{ [etape: string]: number }>(
            `${QualiUrlConfig.NON_CONFORMITE_ROOT_URL}/dashboard/par-etape`
        );
    }


    /**
     * Récupère toutes les notifications consolidées pour la cloche (TopBar).
     * Interroge la passerelle API qui agrège Amélioration, Support et Référentiel.
     * @backend GET `${QualiUrlConfig.NON_CONFORMITE_ROOT_URL}/notifications/cloche`
     */
    getNotificationsCloche(): Observable<NotificationClocheDto[]> {
        return this.http.get<ApiItemResponse<NotificationClocheDto[]>>(`${QualiUrlConfig.NON_CONFORMITE_ROOT_URL}/notifications`).pipe(
            map(response => response?.data || [])
        );
    }

    /**
     * Déclenche un rafraîchissement précis des pastilles/badges NC dans toute l'application.
     * Interroge directement les deux mêmes sources que les tables réelles de chaque onglet.
     */
    rafraichirNotifications(): void {
        forkJoin({
            ncRes:    this.nonConformiteATraiterPage(0, 1).pipe(catchError(() => of(null))),
            plansRes: this.planActionsATraiterPage(0, 1).pipe(catchError(() => of(null)))
        }).subscribe({
            next: ({ ncRes, plansRes }) => {
                // 1. Compteur réel des dossiers NC de l'onglet Traitement
                const ncData = (ncRes as any)?.data ?? ncRes ?? {};
                const dossiersATraiter = ncData?.totalElements ?? ncData?.total ?? 0;

                // 2. Compteur réel des plans d'action de l'onglet Plan d'action
                const plansData = (plansRes as any)?.data ?? plansRes ?? {};
                const planAction = plansData?.totalElements ?? plansData?.total ?? 0;

                // 🚀 3. Badge global pour la Sidebar (ex: 0 NC + 1 Plan = 1)
                this.appNotificationService.setModuleBadge('NC', dossiersATraiter + planAction);

                // 4. Émission des compteurs dédiés pour chaque onglet
                this.notificationsNC$.next({
                    aTraiter: dossiersATraiter,
                    planAction: planAction
                });
            },
            error: (err) => {
                console.warn('Erreur lors du rafraîchissement des notifications NC', err);
            }
        });
    }



        /**
     * Marque une notification comme lue dans le workflow-service.
     * @backend POST `/workflow-service/api/v1/notifications/{id}/lue`
     */
    marquerNotificationLue(id: string): Observable<any> {
        return this.http.post<any>(`${QualiUrlConfig.NON_CONFORMITE_ROOT_URL}/notifications/${id}/lue`, {})
    }




    // =========================================================================
    // 2. RECHERCHE MULTI-CRITÈRES & CONSULTATION
    // =========================================================================

    /**
     * Recherche avancée filtrée et paginée côté serveur (Spring Boot Data / JPA Specification).
     *
     * <p>Point d'entrée principal pour tous les tableaux de bord et filtres : les critères voyagent
     * dans le corps de la requête (POST) afin de supporter un grand nombre de filtres sans tronquer l'URL.</p>
     *
     * @param criteres Objet de critères (mots-clés, statut, structure, criticité, origines, dates...)
     * @param page Numéro de page (0-indexed)
     * @param size Nombre d'éléments par page
     * @param sort Champ et direction de tri (ex: 'createdAt,desc')
     * @backend POST `${QualiUrlConfig.NON_CONFORMITE_ROOT_URL}/search`
     */
    rechercher(
        criteres: CriteriaDto,
        page: number = 0,
        size: number = 10,
        sort: string = 'createdAt,desc'
    ): Observable<ApiResponse<any>> {
        const params = new HttpParams().set('page', page).set('size', size).set('sort', sort);
        return this.http.post<ApiResponse<any>>(
            `${QualiUrlConfig.NON_CONFORMITE_ROOT_URL}/search`,
            criteres,
            { params }
        );
    }

    /**
     * Récupère le détail complet d'une non-conformité par son identifiant.
     *
     * @param id Identifiant unique de la non-conformité
     * @param headers En-têtes HTTP optionnels
     * @backend GET `${this.uri}/get/{id}`
     * @suggestionNomPlusExplicite `getDetailNonConformite(id)` ou `getById(id)`
     */
    findNCById(id: string, headers?: Record<string, string>): Observable<ApiItemResponse<NonConformite>> {
        const httpHeaders = this.buildNcHeaders(headers);
        return this.http.get<ApiItemResponse<NonConformite>>(`${this.uri}/get/${id}`, {
            headers: httpHeaders
        });
    }

    /**
     * Récupère la liste brute paginée de toutes les non-conformités sans critères spécifiques.
     *
     * @backend GET `${AMELIORATION_SERVICE}/non-conformite/all`
     * @suggestionNomPlusExplicite `getToutesLesNonConformites(page, size)`
     */
    nonConformiteGetAll(
        page: number = 0,
        size: number = 10,
        filters?: Record<string, any>,
        headers?: Record<string, string>
    ): Observable<ApiResponse<any>> {
        const params = this.buildParams({ page, size, ...filters });
        const httpHeaders = this.buildHeaders(headers);
        return this.http.get<ApiResponse<any>>(NonConformiteUrlConfig.GET_NON_CONFORMITE_ALL, {
            params,
            headers: httpHeaders
        });
    }

    /**
     * Récupère les non-conformités avec filtre d'état et pagination.
     *
     * @backend GET `${AMELIORATION_SERVICE}/non-conformite/`
     * @suggestionNomPlusExplicite `getNonConformitesParStatut(page, size, status)`
     */
    getAllNC(
        page: number = 0,
        size: number = 10,
        status?: string,
        id?: any,
        headers?: Record<string, string>
    ): Observable<ApiResponse<NonConformite>> {
        return this.getPageFromUrl(
            NonConformiteUrlConfig.GET_NON_CONFORMITE_BY_STATUS_ROOT_URL,
            { page, size, status, id },
            headers
        );
    }

    // =========================================================================
    // 3. DÉCLARATION, BROUILLONS & SOUMISSION INITIALE
    // =========================================================================

    /**
     * Enregistre une nouvelle déclaration de non-conformité et la transmet immédiatement
     * dans le circuit de validation (passage direct à la première étape, pilote).
     *
     * @param payload Données de la non-conformité saisie
     * @backend POST `${QualiUrlConfig.NON_CONFORMITE_ROOT_URL}/create?soumettre=true`
     */
    creerEtSoumettre(payload: Partial<NonConformite>): Observable<ApiItemResponse<NonConformite>> {
        return this.http.post<ApiItemResponse<NonConformite>>(
            `${QualiUrlConfig.NON_CONFORMITE_ROOT_URL}/create`,
            payload,
            { params: new HttpParams().set('soumettre', true) }
        );
    }

    /**
     * Soumet au circuit de validation une déclaration précédemment conservée à l'état de brouillon.
     *
     * @param id Identifiant de la non-conformité brouillon
     * @backend POST `${QualiUrlConfig.NON_CONFORMITE_ROOT_URL}/{id}/soumettre`
     */
    soumettre(id: string): Observable<ApiItemResponse<NonConformite>> {
        return this.http.post<ApiItemResponse<NonConformite>>(
            `${QualiUrlConfig.NON_CONFORMITE_ROOT_URL}/${id}/soumettre`,
            {}
        );
    }

    /**
     * Liste toutes les non-conformités déclarées par un utilisateur (sans pagination).
     *
     * @param userId Identifiant ou email de l'auteur
     * @backend GET `${AMELIORATION_SERVICE}/non-conformite/user/{userId}`
     * @suggestionNomPlusExplicite `getMesDeclarations(userId)` ou `getNonConformitesParAuteur(userId)`
     */
    getNCByUser(userId: string): Observable<NonConformite[]> {
        return this.getListFromUrl(
            `${NonConformiteUrlConfig.GET_NON_CONFORMITE_BY_STATUS_ROOT_URL}user/${userId}`
        );
    }

    /**
     * Liste paginée des déclarations soumises par un utilisateur donné.
     *
     * @param userId Identifiant ou email de l'auteur
     * @param page Numéro de page
     * @param size Taille de page
     * @backend GET `${AMELIORATION_SERVICE}/non-conformite/user/{userId}`
     * @suggestionNomPlusExplicite `getDeclarationsUtilisateurPaginees(userId, page, size)`
     */
    nonConformiteParUtilisateurGetPagination(
        userId: string,
        page: number = 0,
        size: number = 10
    ): Observable<ApiResponse<NonConformite>> {
        const params = this.buildParams({ page, size });
        return this.http.get<ApiResponse<NonConformite>>(
            `${NonConformiteUrlConfig.GET_NON_CONFORMITE_BY_STATUS_ROOT_URL}user/${userId}`,
            { params }
        );
    }

    // =========================================================================
    // 4. MOTEUR DE CIRCUIT & DÉCISIONS À PRENDRE (WORKFLOW)
    // =========================================================================

    /**
     * Retourne la page paginée des non-conformités à traiter par l'appelant (par défaut 10 éléments).
     * @backend GET `${AMELIORATION_SERVICE}/non-conformite/a-traiter`
     */
    nonConformiteATraiterPage(page: number = 0, size: number = 10): Observable<ApiResponse<any>> {
        return this.getPageFromUrl(NonConformiteUrlConfig.NON_CONFORMITE_A_TRAITER, { page, size });
    }

    /**
     * Retourne les non-conformités sur lesquelles l'utilisateur connecté doit impérativement statuer.
     *
     * <p>C'est le moteur de workflow backend qui résout dynamiquement la liste en croisant les habilitations
     * de l'étape courante avec les rôles de l'agent. Chaque ligne retournée porte l'état précis du circuit.</p>
     *
     * @param page Numéro de page
     * @param size Taille de page (par défaut 200 pour couvrir l'ensemble des onglets de travail)
     * @backend GET `${AMELIORATION_SERVICE}/non-conformite/a-traiter`
     */
    nonConformiteATraiter(page: number = 0, size: number = 200): Observable<NonConformite[]> {
        return this.getListFromUrl(NonConformiteUrlConfig.NON_CONFORMITE_A_TRAITER, { page, size });
    }

    /**
     * Retourne la page paginée des actions à traiter par l'appelant (par défaut 10 éléments).
     * @backend GET `${AMELIORATION_SERVICE}/plan-action/a-traiter`
     */
    planActionsATraiterPage(page: number = 0, size: number = 10): Observable<ApiResponse<any>> {
        return this.getPageFromUrl(NonConformiteUrlConfig.PLAN_ACTION_A_TRAITER, { page, size });
    }

    /**
     * Retourne les actions correctives / préventives sur lesquelles l'utilisateur a une décision à prendre.
     *
     * @param page Numéro de page
     * @param size Taille de page
     * @backend GET `${AMELIORATION_SERVICE}/plan-action/a-traiter`
     */
    planActionsATraiter(page: number = 0, size: number = 200): Observable<any[]> {
        return this.getListFromUrl(NonConformiteUrlConfig.PLAN_ACTION_A_TRAITER, { page, size });
    }

    /**
     * Récupère la liste des dossiers positionnés à une étape spécifique de traitement.
     *
     * @param etapeTraitement Étape du workflow (SOUMISSION, RECEPTION, VALIDATION, CLOTURE...)
     * @backend GET `${AMELIORATION_SERVICE}/non-conformite/{etapeTraitement}`
     * @suggestionNomPlusExplicite `getDossiersParEtape(etapeTraitement)`
     */
    getNonConformiteByEtape(etapeTraitement: EtapeTraitement): Observable<NonConformite[]> {
        return this.getListFromUrl(
            `${NonConformiteUrlConfig.GET_NON_CONFORMITE_BY_STATUS_ROOT_URL}${etapeTraitement}`,
            {},
            { 'X-Skip-Loader': 'true' }
        );
    }

    /**
     * Récupère les dossiers filtrés par étape de traitement et par structure émettrice.
     *
     * @param etapeTraitement Étape du workflow
     * @param structureId Identifiant de la structure organisationnelle
     * @backend GET `${AMELIORATION_SERVICE}/non-conformite/structure/origin/{etapeTraitement}/{structureId}`
     */
    getNonConformiteByEtapeAndOrigin(
        etapeTraitement: EtapeTraitement,
        structureId: string
    ): Observable<ApiResponse<NonConformite>> {
        return this.http.get<ApiResponse<NonConformite>>(
            `${NonConformiteUrlConfig.GET_NON_CONFORMITE_BY_ETAPE_ORIGIN}${etapeTraitement}/${structureId}`,
            { headers: { 'X-Skip-Loader': 'true' } }
        );
    }

    /**
     * Récupère les dossiers soumis au sein d'une structure donnée à une étape donnée.
     *
     * @backend GET `${AMELIORATION_SERVICE}/non-conformite/structure/soumission/{etapeTraitement}/{structureId}`
     */
    nonConformiteParStructureEtTraitementGet(
        etapeTraitement: EtapeTraitement,
        structureId: string,
        headers?: Record<string, string>
    ): Observable<ApiResponse<any>> {
        return this.getPageFromUrl(
            `${NonConformiteUrlConfig.GET_NON_CONFORMITE_BY_ETAPE_SUMIT}${etapeTraitement}/${structureId}`,
            headers
        );
    }

    /**
     * Récupère les non-conformités imputées / confiées à un agent précis pour une étape donnée.
     *
     * @backend GET `${AMELIORATION_SERVICE}/non-conformite/imputed/{userId}/{etapeTraitement}`
     * @suggestionNomPlusExplicite `getDossiersImputes(userId, etape, page, size)`
     */
    nonConformiteImputesGetPagination(
        userId: string,
        etapeTraitement: EtapeTraitement,
        page: number = 0,
        size: number = 10,
        filters?: Record<string, any>,
        headers?: Record<string, string>
    ): Observable<ApiResponse<any>> {
        const params = this.buildParams({ page, size, ...filters });
        const httpHeaders = this.buildHeaders(headers);
        return this.http.get<ApiResponse<any>>(
            `${NonConformiteUrlConfig.GET_NON_CONFORMITE_IMPUTED}${userId}/${etapeTraitement}`,
            { params, headers: httpHeaders }
        );
    }

    /**
     * Récupère l'ensemble des dossiers imputés à un utilisateur, tous statuts confondus.
     *
     * @backend GET `${AMELIORATION_SERVICE}/non-conformite/user/{userId}/imputed`
     */
    nonConformiteImputeParUtilisateur(userId: string): Observable<HttpResponse<any>> {
        return this.http.get<any>(
            `${NonConformiteUrlConfig.GET_NON_CONFORMITE_BY_STATUS_ROOT_URL}user/${userId}/imputed`,
            { observe: 'response' }
        );
    }

    /**
     * Récupère les non-conformités en attente de visa par le Responsable Qualité (RQ).
     *
     * @backend GET `${AMELIORATION_SERVICE}/non-conformite/{etapeTraitement}`
     */
    nonConformiteValidationRQGet(etapeTraitement: EtapeTraitement): Observable<NonConformite[]> {
        return this.getListFromUrl(
            `${NonConformiteUrlConfig.GET_NON_CONFORMITE_BY_STATUS_ROOT_URL}${etapeTraitement}`,
            {},
            { 'X-Skip-Loader': 'true' }
        );
    }

    // =========================================================================
    // 5. MISES À JOUR DES FICHES DE NON-CONFORMITÉ
    // =========================================================================

    /**
     * Met à jour une fiche de non-conformité ciblée par son identifiant.
     *
     * @param demande Données mises à jour
     * @param id Identifiant du dossier
     * @backend PUT `${AMELIORATION_SERVICE}/non-conformite/update/{id}`
     */
    updateNonConformite(demande: any, id: string): Observable<HttpResponse<any>> {
        return this.http.put<any>(NonConformiteUrlConfig.miseAJour(id), demande, { observe: 'response' });
    }

    /**
     * @deprecated Alias conservé pour rétrocompatibilité (corrige la faute de frappe historique Nom/Non).
     * Préférer l'utilisation de {@see updateNonConformite}.
     */
    updateNomConformite(demande: any, id: string): Observable<HttpResponse<any>> {
        return this.updateNonConformite(demande, id);
    }

    /**
     * Met à jour en lot (batch) plusieurs non-conformités à la fois.
     *
     * @param demandes Tableau de fiches à mettre à jour
     * @backend PUT `${AMELIORATION_SERVICE}/non-conformite/update/many`
     */
    updateNomConformites(demandes: any[]): Observable<HttpResponse<any>> {
        return this.http.put<any>(NonConformiteUrlConfig.UPDATE_NON_CONFORMITE, demandes, { observe: 'response' });
    }

    /**
     * Alias de mise à jour en lot avec retour typé ApiResponse.
     */
    nonConformiteUpdate(demandes: any[]): Observable<ApiResponse<any>> {
        const httpHeaders = this.buildNcHeaders();
        return this.http.put<ApiResponse<any>>(NonConformiteUrlConfig.UPDATE_NON_CONFORMITE, demandes, {
            headers: httpHeaders
        });
    }

    // =========================================================================
    // 6. PLANS D'ACTION RATTACHÉS (ACTIONS CORRECTIVES)
    // =========================================================================

    /**
     * Enregistre un nouveau plan d'action rattaché à une non-conformité.
     *
     * @param planAction Objet plan d'action
     * @backend POST `${AMELIORATION_SERVICE}/plan-action/create`
     */
    createPlanAction(planAction: any): Observable<HttpResponse<any>> {
        return this.http.post<any>(NonConformiteUrlConfig.CREATE_PLAN_ACTION, planAction, { observe: 'response' });
    }

    /**
     * Modifie un plan d'action existant.
     *
     * @param demande Données du plan d'action à actualiser
     * @backend PUT `${AMELIORATION_SERVICE}/plan-action/update`
     */
    updatePlanAction(demande: any): Observable<HttpResponse<any>> {
        return this.http.put<any>(NonConformiteUrlConfig.UPDATE_PLAN_ACTION, demande, { observe: 'response' });
    }

    /**
     * Alias de mise à jour du plan d'action.
     */
    nonConformiteUpdatePlanAction(demande: any): Observable<HttpResponse<any>> {
        return this.updatePlanAction(demande);
    }

    /**
     * Supprime un plan d'action qui n'a pas encore été engagé dans le circuit.
     *
     * @param id Identifiant du plan d'action
     * @backend DELETE `${AMELIORATION_SERVICE}/plan-action/delete/{id}`
     */
    deletePlanAction(id: string): Observable<HttpResponse<any>> {
        return this.http.delete<any>(`${NonConformiteUrlConfig.DELETE_PLAN_ACTION}/${id}`, { observe: 'response' });
    }

    /**
     * Liste paginée des plans d'action filtrés par l'adresse email du responsable et leur statut.
     *
     * @backend GET `${AMELIORATION_SERVICE}/plan-action/all/by-email/{email}/{status}`
     */
    nonConformitePlanActionsGetPagination(
        email: string,
        status: any,
        page: number = 0,
        size: number = 5,
        filters?: Record<string, any>,
        headers?: Record<string, string>
    ): Observable<ApiResponse<any>> {
        const params = this.buildParams({ page, size, ...filters });
        const httpHeaders = this.buildHeaders(headers);
        return this.http.get<ApiResponse<any>>(
            `${NonConformiteUrlConfig.GET_PLAN_ACTION}${email}/${status}`,
            { params, headers: httpHeaders }
        );
    }

    // =========================================================================
    // 7. PIÈCES JOINTES, PREUVES & DOCUMENTS OFFICIELS
    // =========================================================================

    /**
     * Dépose un fichier justificatif en multipart sur une non-conformité et retourne sa référence unique.
     *
     * <p>Le fichier rejoint le serveur d'objets (MinIO/S3), classé sous le sigle de la structure.
     * La référence rendue est ensuite transportée par le circuit de workflow.</p>
     *
     * @param nonConformiteId Identifiant de la non-conformité
     * @param fichier Fichier binaire à téléverser
     * @backend POST `${AMELIORATION_SERVICE}/non-conformite/{id}/fichiers`
     */
    deposerFichier(nonConformiteId: string, fichier: File): Observable<string> {
        const corps = new FormData();
        corps.append('file', fichier);
        return this.http
            .post<ApiItemResponse<string>>(NonConformiteUrlConfig.fichiers(nonConformiteId), corps, {
                headers: { 'X-Skip-Loader': 'true' }
            })
            .pipe(map((reponse) => reponse.data));
    }

    /**
     * Construit l'URL absolue de téléchargement ou de prévisualisation d'un fichier hébergé.
     *
     * @param nonConformiteId Identifiant de la non-conformité
     * @param reference Référence unique du fichier déposé
     */
    urlFichier(nonConformiteId: string, reference: string): string {
        return `${NonConformiteUrlConfig.fichiers(nonConformiteId)}/contenu?reference=${encodeURIComponent(reference)}`;
    }

    /**
     * Télécharge la fiche PDF officielle récapitulative d'une non-conformité clôturée.
     *
     * <p>Générée à la volée par le backend (identification, constats, plans d'action réalisés, visas).
     * Refusée en HTTP 409 par le serveur si le dossier n'a pas encore atteint le statut CLÔTURÉ.</p>
     *
     * @param nonConformiteId Identifiant de la non-conformité
     * @backend GET `${AMELIORATION_SERVICE}/non-conformite/{id}/fiche-cloture`
     */
    ficheCloture(nonConformiteId: string): Observable<Blob> {
        return this.http.get(NonConformiteUrlConfig.ficheCloture(nonConformiteId), { responseType: 'blob' });
    }

    // =========================================================================
    // 8. STATISTIQUES, TABLEAUX DE BORD & TENDANCES
    // =========================================================================

    /**
     * Récupère les compteurs d'occurrences par statut pour une structure donnée.
     *
     * @param structureId Identifiant de la structure
     * @backend GET `${QualiUrlConfig.NON_CONFORMITE_ROOT_URL}/count-by-status/{structureId}`
     * @suggestionNomPlusExplicite `getCompteursParStatut(structureId)`
     */
    getCountByStatus(structureId: any): Observable<HttpResponse<Array<NcStats>>> {
        return this.http.get<any>(
            `${QualiUrlConfig.NON_CONFORMITE_ROOT_URL}/count-by-status/${structureId}`,
            { observe: 'response' }
        );
    }

    /**
     * Métriques pour le tableau de bord individuel de l'agent.
     *
     * @backend GET `${AMELIORATION_SERVICE}/non-conformite/dashboard/user/{id}`
     */
    nonConformiteDashboardAgent(id: string): Observable<HttpResponse<any>> {
        return this.http.get<any>(
            `${NonConformiteUrlConfig.GET_NON_CONFORMITE_BY_STATUS_ROOT_URL}dashboard/user/${id}`,
            { observe: 'response' }
        );
    }

    /**
     * Métriques globales pour le tableau de bord du Responsable Qualité (RQ).
     *
     * @backend GET `${AMELIORATION_SERVICE}/non-conformite/dashboard/rq`
     */
    nonConformiteDashboardRq(): Observable<HttpResponse<any>> {
        return this.http.get<any>(
            `${NonConformiteUrlConfig.GET_NON_CONFORMITE_BY_STATUS_ROOT_URL}dashboard/rq`,
            { observe: 'response' }
        );
    }

    /**
     * Métriques pour le tableau de bord du Pilote de processus.
     *
     * @backend GET `${AMELIORATION_SERVICE}/non-conformite/dashboard/pilot/{structureId}`
     */
    nonConformiteDashboardPilot(structureId: string): Observable<HttpResponse<any>> {
        return this.http.get<any>(
            `${NonConformiteUrlConfig.GET_NON_CONFORMITE_BY_STATUS_ROOT_URL}dashboard/pilot/${structureId}`,
            { observe: 'response' }
        );
    }

    /**
     * Données d'évolution temporelle des non-conformités (historique mensuel/annuel pour graphiques Chart.js).
     *
     * @param annee Année d'analyse
     * @param mois Mois optionnel
     * @param structureId Identifiant de la structure pour filtrer localement
     * @backend GET `${AMELIORATION_SERVICE}/non-conformite/stats/evolution`
     * @suggestionNomPlusExplicite `getStatistiquesEvolution(annee, mois, structureId)`
     */
    nonConformiteEvolutionGet(annee: number, mois?: number, structureId?: string): Observable<HttpResponse<any>> {
        let params = new HttpParams().set('annee', annee.toString());
        if (mois !== undefined && mois !== null) {
            params = params.set('mois', mois.toString());
        }
        if (structureId) {
            params = params.set('structureId', structureId);
        }
        return this.http.get<any>(
            `${NonConformiteUrlConfig.GET_NON_CONFORMITE_BY_STATUS_ROOT_URL}stats/evolution`,
            { params, observe: 'response' }
        );
    }

    // =========================================================================
    // 9. HELPERS INTERNES (CONSTRUCTION DE PARAMÈTRES & HEADERS)
    // =========================================================================

    private buildNcParams(params?: Record<string, any>): HttpParams {
        let httpParams = new HttpParams();
        if (!params) return httpParams;

        Object.keys(params).forEach((key) => {
            const value = params[key];
            if (value !== null && value !== undefined && value !== '') {
                httpParams = httpParams.set(key, value);
            }
        });
        return httpParams;
    }

    private buildNcHeaders(headers?: Record<string, string>): HttpHeaders {
        let httpHeaders = new HttpHeaders();
        if (!headers) return httpHeaders;

        Object.keys(headers).forEach((key) => {
            httpHeaders = httpHeaders.set(key, headers[key]);
        });
        return httpHeaders;
    }

    private getPageFromUrl(
        url: string,
        params?: Record<string, any>,
        headers?: Record<string, string>
    ): Observable<ApiResponse<NonConformite>> {
        return this.http.get<ApiResponse<NonConformite>>(url, {
            params: this.buildNcParams(params),
            headers: this.buildNcHeaders(headers)
        });
    }

    private getListFromUrl(
        url: string,
        params?: Record<string, any>,
        headers?: Record<string, string>
    ): Observable<NonConformite[]> {
        return this.getPageFromUrl(url, params, headers).pipe(
            map((res: any) => res.data?.content ?? [])
        );
    }

    toutesLesNonConformites(page: number = 0, size: number = 200): Observable<NonConformite[]> {
        return this.getListFromUrl(NonConformiteUrlConfig.GET_NON_CONFORMITE_ALL, { page, size });
    }

}