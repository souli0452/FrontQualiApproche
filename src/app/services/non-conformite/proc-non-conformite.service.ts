import { Injectable } from '@angular/core';
import {HttpClient, HttpResponse} from "@angular/common/http";
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

    getNonConformiteImputed(userId :string,etapeTraitement :EtapeTraitement): Observable<HttpResponse<Array<any>>> {
        return this.http.get<Array<any>>(NonConformiteUrlConfig.GET_NON_CONFORMITE_IMPUTED+userId+`/${etapeTraitement}`, {observe: 'response', headers: {'X-Skip-Loader': 'true'}});
    }
    updateNomConformite(demande: any, id: string): Observable<HttpResponse<any>> {
        // « UPDATE_NON_CONFORMITE » vise /update/many : lui accoler un identifiant donnait
        // « /update/many<id> », que rien ne dessert — l'appel partait en 404 sans que l'écran
        // s'en aperçoive.
        return this.http.put<any>(NonConformiteUrlConfig.miseAJour(id), demande, {observe: 'response'});
    }
    updateNomConformites(demandes: any[]): Observable<HttpResponse<any>> {
        console.log('Route vers le BACKEND Demandes->',demandes);
        
        return this.http.put<any>(NonConformiteUrlConfig.UPDATE_NON_CONFORMITE , demandes, {observe: 'response'});
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
    getNCByUser(userId: string): Observable<ApiResponse<NonConformite>> {
        return this.http.get<ApiResponse<NonConformite>>(
            NonConformiteUrlConfig.GET_NON_CONFORMITE_BY_STATUS_ROOT_URL + "user/" + userId
        );
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
            .post<ApiItemResponse<string>>(NonConformiteUrlConfig.fichiers(nonConformiteId), corps, {
                headers: { 'X-Skip-Loader': 'true' }
            })
            .pipe(map((reponse) => reponse.data));
    }

    /** Adresse de téléchargement d'un fichier déposé, désigné par sa référence. */
    urlFichier(nonConformiteId: string, reference: string): string {
        return `${NonConformiteUrlConfig.fichiers(nonConformiteId)}/contenu?reference=${encodeURIComponent(reference)}`;
    }

    /**
     * Fiche de clôture d'un dossier, telle que le serveur l'édite.
     *
     * <p>Le contenu arrive brut — c'est un PDF, pas une enveloppe {@code ApiResponse} — et le
     * serveur refuse en 409 un dossier encore en circuit : c'est lui qui détient la règle.</p>
     */
    ficheCloture(nonConformiteId: string): Observable<Blob> {
        return this.http.get(NonConformiteUrlConfig.ficheCloture(nonConformiteId), { responseType: 'blob' });
    }

}
