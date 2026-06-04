import { Injectable } from '@angular/core';
import {HttpClient, HttpParams, HttpResponse} from "@angular/common/http";
import {Observable} from "rxjs";
import { EtapeTraitement } from '../../enums';
import { BehaviorSubject } from 'rxjs';
import { NonConformiteUrlConfig } from '../../components/non-conformite/config/proc-non-conformite.urls.configs';

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

    getNonConformiteByEtape(etapeTraitement :EtapeTraitement): Observable<HttpResponse<Array<any>>> {
        return this.http.get<Array<any>>(NonConformiteUrlConfig.GET_NON_CONFORMITE_BY_STATUS_ROOT_URL+etapeTraitement, {observe: 'response', headers: {'X-Skip-Loader': 'true'}});
    }
    getNonConformiteByEtapeAndOrigin(etapeTraitement :EtapeTraitement,structureId:string): Observable<HttpResponse<Array<any>>> {
        return this.http.get<Array<any>>(NonConformiteUrlConfig.GET_NON_CONFORMITE_BY_ETAPE_ORIGIN+etapeTraitement+`/${structureId}`, {observe: 'response', headers: {'X-Skip-Loader': 'true'}});
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
    updatePlanAction(demande: any): Observable<HttpResponse<any>> {
        return this.http.put<any>(NonConformiteUrlConfig.UPDATE_PLAN_ACTION , demande, {observe: 'response'});
    }
    rejectNc(demande: any): Observable<HttpResponse<any>> {
        return this.http.put<any>(NonConformiteUrlConfig.GET_NON_CONFORMITE_REJECT , demande, {observe: 'response'});
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
    rejetPlanAction(demande: any): Observable<HttpResponse<any>> {
        return this.http.put<any>(NonConformiteUrlConfig.REJET_PLAN_ACTION , demande, {observe: 'response'});
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
    validatePlanAction(demande: any): Observable<HttpResponse<any>> {
        return this.http.put<any>(NonConformiteUrlConfig.VALIDATE_NON_CONFORMITE_ALL , demande, {observe: 'response'});
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

    getNCByUser(userId:string): Observable<HttpResponse<any>> {
        return this.http.get<any>(NonConformiteUrlConfig.GET_NON_CONFORMITE_BY_STATUS_ROOT_URL + "user/"+userId, { observe: 'response' });
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

}
