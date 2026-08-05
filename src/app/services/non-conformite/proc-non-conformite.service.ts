import { Injectable } from '@angular/core';
import {HttpClient, HttpParams, HttpResponse} from "@angular/common/http";
import {Observable} from "rxjs";
import {map} from "rxjs/operators";
import { EtapeTraitement } from '../../enums/enums';
import { BehaviorSubject } from 'rxjs';
import { NonConformiteUrlConfig } from '../../components/non-conformite/config/proc-non-conformite.urls.configs';
import { ApiItemResponse, ApiResponse } from '../../models/response.model';
import { NonConformite } from '../../models/non-conformite.model';

@Injectable({
  providedIn: 'root'
})
export class ProcNonConformiteService {

  constructor(private http: HttpClient) { }

    // Récupération du statut global de l'onglet Vue d'ensemble
    public notificationsNC$ = new BehaviorSubject<any>({
        total: 0,
        brouillons: 0,
        imputees: 0,
        reception: 0,
        validationRQ: 0,
        enAttenteValidation: 0,
        validationPilote: 0,
        cloture: 0,
        affectation: 0,
        nonTraiter: 0
    });

    // getNonConformiteByEtape(etapeTraitement :EtapeTraitement): Observable<HttpResponse<Array<any>>> {
    //     return this.http.get<Array<any>>(NonConformiteUrlConfig.GET_NON_CONFORMITE_BY_STATUS_ROOT_URL+etapeTraitement, {observe: 'response', headers: {'X-Skip-Loader': 'true'}});
    // }

    getNonConformiteByEtape(etapeTraitement: EtapeTraitement): Observable<ApiResponse<any>> {
        return this.http.get<ApiResponse<any>>(
            NonConformiteUrlConfig.GET_NON_CONFORMITE_BY_STATUS_ROOT_URL + etapeTraitement,
            { headers: { 'X-Skip-Loader': 'true' } }
        );
    }

    // getNonConformiteByEtapeAndOrigin(etapeTraitement :EtapeTraitement,structureId:string): Observable<HttpResponse<Array<any>>> {
    //     return this.http.get<Array<any>>(NonConformiteUrlConfig.GET_NON_CONFORMITE_BY_ETAPE_ORIGIN+etapeTraitement+`/${structureId}`, {observe: 'response', headers: {'X-Skip-Loader': 'true'}});
    // }

    getNonConformiteByEtapeAndOrigin(
        etapeTraitement: EtapeTraitement,
        structureId: string
    ): Observable<ApiResponse<NonConformite>> {
        return this.http.get<ApiResponse<NonConformite>>(
            NonConformiteUrlConfig.GET_NON_CONFORMITE_BY_ETAPE_ORIGIN + etapeTraitement + `/${structureId}`,
            {
                headers: { 'X-Skip-Loader': 'true' }
            }
        );
    }

    getNonConformiteByEtapeAndSumit(etapeTraitement :EtapeTraitement,structureId:string): Observable<HttpResponse<Array<any>>> {
        return this.http.get<Array<any>>(NonConformiteUrlConfig.GET_NON_CONFORMITE_BY_ETAPE_SUMIT+etapeTraitement+`/${structureId}`, {observe: 'response', headers: {'X-Skip-Loader': 'true'}});
    }
    getNonConformiteImputed(userId :string,etapeTraitement :EtapeTraitement): Observable<HttpResponse<Array<any>>> {
        return this.http.get<Array<any>>(NonConformiteUrlConfig.GET_NON_CONFORMITE_IMPUTED+userId+`/${etapeTraitement}`, {observe: 'response', headers: {'X-Skip-Loader': 'true'}});
    }
    getNonConformiteAll(): Observable<HttpResponse<Array<any>>> {
        return this.http.get<Array<any>>(NonConformiteUrlConfig.GET_NON_CONFORMITE_ALL, {observe: 'response', headers: {'X-Skip-Loader': 'true'}});
    }
    getNonConformiteAllStructure(id:any): Observable<HttpResponse<Array<any>>> {
        return this.http.get<Array<any>>(NonConformiteUrlConfig.GET_NON_CONFORMITE_ALL+`/structure/${id}`, {observe: 'response', headers: {'X-Skip-Loader': 'true'}});
    }
    getNonConformiteByStrcuture(id:any): Observable<HttpResponse<Array<any>>> {
        return this.http.get<Array<any>>(NonConformiteUrlConfig.GET_NON_CONFORMITE_ALL_By_Structure+id, {observe: 'response', headers: {'X-Skip-Loader': 'true'}});
    }
    updateNomConformite(demande: any, id: string): Observable<HttpResponse<any>> {
        return this.http.put<any>(NonConformiteUrlConfig.UPDATE_NON_CONFORMITE + id, demande, {observe: 'response'});
    }
    updateNomConformites(demandes: any[]): Observable<HttpResponse<any>> {
        console.log('Route vers le BACKEND Demandes->',demandes);
        
        return this.http.put<any>(NonConformiteUrlConfig.UPDATE_NON_CONFORMITE , demandes, {observe: 'response'});
    }
    getPlanActions(email:string,status:any): Observable<HttpResponse<Array<any>>> {
        return this.http.get<Array<any>>(NonConformiteUrlConfig.GET_PLAN_ACTION+email+`/${status}`, {observe: 'response'});
    }
    getPlanActionsAll(email:string): Observable<HttpResponse<Array<any>>> {
        return this.http.get<Array<any>>(NonConformiteUrlConfig.GET_PLAN_ACTION_ALL+email, {observe: 'response'});
    }
    /**
     * Enregistre un plan d'action proposé sur une non-conformité.
     *
     * <p>Écrit dès que l'agent le valide, et non gardé en mémoire jusqu'à la soumission : les plans
     * s'accumulaient auparavant dans l'objet de la fiche, et n'étaient persistés que par le bouton
     * de soumission. Ce bouton ayant cédé la place à la décision du circuit, une saisie non
     * enregistrée aurait été perdue sans que rien ne le dise.</p>
     */
    createPlanAction(planAction: any): Observable<HttpResponse<any>> {
        return this.http.post<any>(NonConformiteUrlConfig.CREATE_PLAN_ACTION, planAction, { observe: 'response' });
    }

    /**
     * Supprime un plan d'action qui n'a pas encore été confié à son responsable.
     *
     * <p>Le serveur refuse la suppression d'un plan engagé : il pilote un circuit et porte
     * l'historique des décisions prises sur lui.</p>
     */
    deletePlanAction(id: string): Observable<HttpResponse<any>> {
        return this.http.delete<any>(`${NonConformiteUrlConfig.DELETE_PLAN_ACTION}/${id}`, { observe: 'response' });
    }

    updatePlanAction(demande: any): Observable<HttpResponse<any>> {
        return this.http.put<any>(NonConformiteUrlConfig.UPDATE_PLAN_ACTION , demande, {observe: 'response'});
    }
    getStatsNfStruct(anne:any): Observable<HttpResponse<any>> {
        return this.http.get<any>(NonConformiteUrlConfig.GET_Stat_BY_STATUS_ROOT_URL+`/${anne}`, {observe: 'response'});
    }
    getStatsMensuel(anne:any): Observable<HttpResponse<any>> {
        return this.http.get<any>(NonConformiteUrlConfig.GET_Stat_MENSUEL_ROOT_URL+anne, {observe: 'response'});
    }
    getStatsMensuelStatus(anne:any): Observable<HttpResponse<any>> {
        return this.http.get<any>(NonConformiteUrlConfig.GET_Stat_MENSUEL_STATUS_ROOT_URL+anne, {observe: 'response'});
    }
    getStatsMensuelService(anne:any,serviceId:any): Observable<HttpResponse<any>> {
        return this.http.get<any>(NonConformiteUrlConfig.GET_Stat_MENSUEL_STATUS_ROOT_URL+anne+"/"+serviceId, {observe: 'response'});
    }
    getStatsMensuelStatusService(anne:any,id:any): Observable<HttpResponse<any>> {
        return this.http.get<any>(NonConformiteUrlConfig.GET_Stat_MENSUEL_STATUS_ROOT_URL+anne+"/service/"+id, {observe: 'response'});
    }
    getStatsPlanAction(anne:any): Observable<HttpResponse<any>> {
        return this.http.get<any>(NonConformiteUrlConfig.STAT_PLAN_ACTION_ALL+anne, {observe: 'response'});
    }
    getStatsByNiveau(anne:any,id:any): Observable<HttpResponse<any>> {
        return this.http.get<any>(NonConformiteUrlConfig.GET_Stat_MENSUEL_NIVEAU_ROOT_URL+anne+"/service/"+id, {observe: 'response'});
    }
    getDashboardRQ(): Observable<HttpResponse<any>> {
        return this.http.get<any>(NonConformiteUrlConfig.GET_NON_CONFORMITE_BY_STATUS_ROOT_URL + "/dashboard/rq", { observe: 'response' });
    }

    findImputedByUserId(userId:string): Observable<HttpResponse<any>> {
        return this.http.get<any>(NonConformiteUrlConfig.GET_NON_CONFORMITE_BY_STATUS_ROOT_URL + "user/"+userId+"/imputed", { observe: 'response' });
    }

    getNCByUser(userId: string): Observable<ApiResponse<NonConformite>> {
        return this.http.get<ApiResponse<NonConformite>>(
            NonConformiteUrlConfig.GET_NON_CONFORMITE_BY_STATUS_ROOT_URL + "user/" + userId
        );
    }


    

    getUserDashboard(id: string): Observable<HttpResponse<any>> {
        // let params = this.buildFilterParams(filters);
        return this.http.get<any>(NonConformiteUrlConfig.GET_NON_CONFORMITE_BY_STATUS_ROOT_URL + "dashboard/user/" + id, { observe: 'response' });
    }

    getPilotDashboard(structureId:string): Observable<HttpResponse<any>> {
        return this.http.get<any>(NonConformiteUrlConfig.GET_NON_CONFORMITE_BY_STATUS_ROOT_URL + "dashboard/pilot/" + structureId, { observe: 'response' });
    }

    getNcEvolution(annee: number, mois?: number, structureId?: string): Observable<HttpResponse<any>> {
        let params = new HttpParams().set('annee', annee.toString());
        if (mois !== undefined && mois !== null) {
            params = params.set('mois', mois.toString());
        }
        if (structureId) {
            params = params.set('structureId', structureId);
        }
        return this.http.get<any>(NonConformiteUrlConfig.GET_NON_CONFORMITE_BY_STATUS_ROOT_URL + "stats/evolution", { params, observe: 'response' });
    }

    getByNiveau(niveauId: string): Observable<HttpResponse<any>> {
        return this.http.get<any>(NonConformiteUrlConfig.GET_NON_CONFORMITE_BY_STATUS_ROOT_URL + "by-niveau/" + niveauId, { observe: 'response' });
    }

    /**
     * Dépose un fichier sur une non-conformité et rend la référence de l'objet créé.
     *
     * <p>C'est le contrat attendu par le dialogue de décision du circuit : « déposer d'abord,
     * référencer ensuite ». Le fichier part en multipart et rejoint le serveur d'objets, rangé par
     * le serveur sous le sigle de la structure — les fichiers de la non-conformité transitaient
     * jusqu'ici en base64 dans le corps de la requête, pour finir sur le disque du service.</p>
     */
    deposerFichier(nonConformiteId: string, fichier: File): Observable<string> {
        const corps = new FormData();
        corps.append('file', fichier);
        return this.http
            .post<ApiItemResponse<string>>(NonConformiteUrlConfig.fichiers(nonConformiteId), corps)
            .pipe(map((reponse) => reponse.data));
    }

    /** Adresse de téléchargement d'un fichier déposé, désigné par sa référence. */
    urlFichier(nonConformiteId: string, reference: string): string {
        return `${NonConformiteUrlConfig.fichiers(nonConformiteId)}/contenu?reference=${encodeURIComponent(reference)}`;
    }

}
