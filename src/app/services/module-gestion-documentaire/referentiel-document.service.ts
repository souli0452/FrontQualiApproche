import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { BaseCrudService } from '../base-crud.service';
import { QualiUrlConfig } from '../quali-url-configs';
import { DomaineApplication, NiveauConfidentialite, PrioriteDocument } from '../../models/referentiel-document.model';

/**
 * Les deux services reprennent `BaseCrudService` — mêmes chemins que les autres référentiels — et
 * n'ajoutent que la liste complète `/all`.
 *
 * Cette liste échappe volontairement à la pagination : un sélecteur tronqué aux dix premières
 * valeurs tairait les suivantes sans que rien ne l'indique, et le serveur la sert donc entière.
 */
@Injectable({ providedIn: 'root' })
export class PrioriteDocumentService extends BaseCrudService<PrioriteDocument, string> {
    constructor(public override http: HttpClient) {
        super(http, QualiUrlConfig.PRIORITE_DOCUMENT_ROOT_URL);
    }

    liste(): Observable<PrioriteDocument[]> {
        return this.http.get<any>(`${QualiUrlConfig.PRIORITE_DOCUMENT_ROOT_URL}/all`).pipe(
            map(res => res?.data ?? res ?? [])
        );
    }
}

@Injectable({ providedIn: 'root' })
export class NiveauConfidentialiteService extends BaseCrudService<NiveauConfidentialite, string> {
    constructor(public override http: HttpClient) {
        super(http, QualiUrlConfig.NIVEAU_CONFIDENTIALITE_ROOT_URL);
    }

    liste(): Observable<NiveauConfidentialite[]> {
        return this.http.get<any>(`${QualiUrlConfig.NIVEAU_CONFIDENTIALITE_ROOT_URL}/all`).pipe(
            map(res => res?.data ?? res ?? [])
        );
    }

    /**
     * Niveaux proposables comme critère de recherche : ceux que l'appelant a le droit de voir.
     *
     * <p>Distincte de `liste()`, qui sert la gestion du référentiel. Filtrer sur un niveau
     * inaccessible ne rendrait aucun document — le serveur écarte ces documents en amont — et le
     * proposer trahirait un classement qui ne nous regarde pas. C'est support-service qui tranche,
     * puisque c'est lui qui applique la restriction.</p>
     */
    filtrables(): Observable<NiveauConfidentialite[]> {
        return this.http
            .get<any>(`${QualiUrlConfig.QMS_DOCUMENT_ROOT_URL}/filtres/niveaux-confidentialite`)
            .pipe(map(res => res?.data ?? res ?? []));
    }
}

@Injectable({ providedIn: 'root' })
export class DomaineApplicationService extends BaseCrudService<DomaineApplication, string> {
    constructor(public override http: HttpClient) {
        super(http, QualiUrlConfig.DOMAINE_APPLICATION_ROOT_URL);
    }

    liste(): Observable<DomaineApplication[]> {
        return this.http.get<any>(`${QualiUrlConfig.DOMAINE_APPLICATION_ROOT_URL}/all`).pipe(
            map(res => res?.data ?? res ?? [])
        );
    }
}
