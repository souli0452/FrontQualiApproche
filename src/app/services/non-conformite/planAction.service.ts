import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { QualiCrudService } from '../quali-crud.service';
import { QualiUrlConfig } from '../quali-url-configs';
import { Formation } from '../../models/formation.model';



@Injectable({providedIn: 'root'})
export class PlanActionService extends QualiCrudService<Formation, string> {
    constructor(public override http: HttpClient) {
        super(http, QualiUrlConfig.PLAN_ACTION_ROOT_URL);
    }

    /**
     * Dépose un justificatif sur un plan d'action et rend la pièce enregistrée.
     *
     * <p>Le dialogue de traitement convertissait les fichiers en base64 et les posait sur l'objet
     * envoyé au serveur, où rien ne les enregistrait : l'écran annonçait le succès, la pièce
     * disparaissait au rechargement, et le responsable qualité appréciait l'efficacité d'une
     * action sans les justificatifs qu'on croyait avoir fournis.</p>
     */
    deposerFichier(planActionId: string, fichier: File): Observable<any> {
        const corps = new FormData();
        corps.append('file', fichier, fichier.name);
        return this.http
            .post<any>(`${QualiUrlConfig.PLAN_ACTION_ROOT_URL}/${planActionId}/fichiers`, corps)
            .pipe(map((reponse) => reponse?.data ?? reponse));
    }

    /**
     * Relit une action corrective, état de son circuit compris.
     *
     * <p>À appeler après une décision : les actions ouvertes à l'appelant changent avec l'étape, et
     * la ligne affichée porterait sinon l'étape précédente.</p>
     */
    relire(planActionId: string): Observable<any> {
        return this.http
            .get<any>(`${QualiUrlConfig.PLAN_ACTION_ROOT_URL}/${planActionId}`)
            .pipe(map((reponse) => reponse?.data ?? reponse));
    }

    /** Justificatifs déjà déposés sur un plan d'action. */
    fichiers(planActionId: string): Observable<any[]> {
        return this.http
            .get<any>(`${QualiUrlConfig.PLAN_ACTION_ROOT_URL}/${planActionId}/fichiers`)
            .pipe(map((reponse) => reponse?.data ?? reponse ?? []));
    }
}
