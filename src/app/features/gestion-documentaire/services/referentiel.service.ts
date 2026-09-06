import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { BaseCrudService, QualiUrlConfig } from '@core';
import { DomaineApplication, NiveauConfidentialite, PrioriteDocument } from '../models';
import { OptionsLoadEvent, OptionsLoader } from '../../../shared/ui/lazy-options.model';

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

    override findAll(
        page: number = 0,
        size: number = 10,
        filters?: Record<string, any>,
        headers?: Record<string, string>
    ): Observable<any> {
        const params = this.buildParams({ page, size, ...filters });
        const httpHeaders = this.buildHeaders(headers);
        return this.http.get<any>(this.uri, {
            params,
            headers: httpHeaders
        });
    }
}

@Injectable({ providedIn: 'root' })
export class NiveauConfidentialiteService extends BaseCrudService<NiveauConfidentialite, string> {
    constructor(public override http: HttpClient) {
        super(http, QualiUrlConfig.NIVEAU_CONFIDENTIALITE_ROOT_URL);
    }
    
    override findAll(
        page: number = 0,
        size: number = 10,
        filters?: Record<string, any>,
        headers?: Record<string, string>
    ): Observable<any> {
        const params = this.buildParams({ page, size, ...filters });
        const httpHeaders = this.buildHeaders(headers);
        return this.http.get<any>(this.uri, {
            params,
            headers: httpHeaders
        });
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

    /**
     * Chargeur pour les listes déroulantes de recherche : les seuls niveaux permis à l'appelant.
     *
     * <p>Le filtre s'applique ici et non au serveur, contrairement aux autres référentiels : cette
     * liste-là est servie entière — elle est courte et déjà restreinte aux droits de l'appelant —
     * si bien que chercher dedans ne peut rien laisser hors de portée.</p>
     */
    readonly chargerOptionsFiltrables: OptionsLoader<NiveauConfidentialite> = (event: OptionsLoadEvent) =>
        this.filtrables().pipe(
            map((niveaux) => {
                const terme = (event.search ?? '').trim().toLowerCase();
                const retenus = terme ? niveaux.filter((n) => (n.libelle ?? '').toLowerCase().includes(terme)) : niveaux;
                return { options: retenus, totalRecords: retenus.length, hasMore: false };
            })
        );
}

@Injectable({ providedIn: 'root' })
export class DomaineApplicationService extends BaseCrudService<DomaineApplication, string> {
    constructor(public override http: HttpClient) {
        super(http, QualiUrlConfig.DOMAINE_APPLICATION_ROOT_URL);
    }

    override findAll(
        page: number = 0,
        size: number = 10,
        filters?: Record<string, any>,
        headers?: Record<string, string>
    ): Observable<any> {
        const params = this.buildParams({ page, size, ...filters });
        const httpHeaders = this.buildHeaders(headers);
        return this.http.get<any>(this.uri, {
            params,
            headers: httpHeaders
        });
    }

    liste(): Observable<DomaineApplication[]> {
        return this.http.get<any>(`${QualiUrlConfig.DOMAINE_APPLICATION_ROOT_URL}/all`).pipe(
            map(res => res?.data ?? res ?? [])
        );
    }
}
