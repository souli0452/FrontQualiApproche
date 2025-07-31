import { Injectable } from '@angular/core';
import {HttpClient, HttpResponse} from "@angular/common/http";
import {Observable} from "rxjs";
import {NonConformiteUrlConfig} from "./proc-non-conformite.urls.configs";
import { EtapeTraitement } from '../../enums';


@Injectable({
  providedIn: 'root'
})
export class ProcNonConformiteService {

  constructor(private http: HttpClient) { }

    getNonConformiteByEtape(etapeTraitement :EtapeTraitement): Observable<HttpResponse<Array<any>>> {
        return this.http.get<Array<any>>(NonConformiteUrlConfig.GET_NON_CONFORMITE_BY_STATUS_ROOT_URL+etapeTraitement, {observe: 'response'});
    }
    getNonConformiteByEtapeAndOrigin(etapeTraitement :EtapeTraitement,structureId:string): Observable<HttpResponse<Array<any>>> {
        return this.http.get<Array<any>>(NonConformiteUrlConfig.GET_NON_CONFORMITE_BY_ETAPE_ORIGIN+etapeTraitement+`/${structureId}`, {observe: 'response'});
    }
    getNonConformiteByEtapeAndSumit(etapeTraitement :EtapeTraitement,structureId:string): Observable<HttpResponse<Array<any>>> {
        return this.http.get<Array<any>>(NonConformiteUrlConfig.GET_NON_CONFORMITE_BY_ETAPE_SUMIT+etapeTraitement+`/${structureId}`, {observe: 'response'});
    }
    getNonConformiteImputed(userId :string,etapeTraitement :EtapeTraitement): Observable<HttpResponse<Array<any>>> {
        return this.http.get<Array<any>>(NonConformiteUrlConfig.GET_NON_CONFORMITE_IMPUTED+userId+`/${etapeTraitement}`, {observe: 'response'});
    }
    getNonConformiteAll(): Observable<HttpResponse<Array<any>>> {
        return this.http.get<Array<any>>(NonConformiteUrlConfig.GET_NON_CONFORMITE_ALL, {observe: 'response'});
    }
    updateNomConformite(demande: any, id: string): Observable<HttpResponse<any>> {
        return this.http.put<any>(NonConformiteUrlConfig.UPDATE_NON_CONFORMITE + id, demande, {observe: 'response'});
    }
    updateNomConformites(demandes: any[]): Observable<HttpResponse<any>> {
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
}
