import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { QualiUrlConfig } from '@core/services/url-config';
import { ClientPlateforme, NouveauClient, RapportDeCreation } from './clients.model';

/** Les clients de l'installation (referentiel-service, rôle PLATEFORME_ADMIN). */
@Injectable({ providedIn: 'root' })
export class ClientsService {
    private readonly url = QualiUrlConfig.PLATEFORME_CLIENTS_URL;

    constructor(private http: HttpClient) {}

    /** La liste arrive enveloppée (`data.clients`) : une liste nue serait paginée par le serveur. */
    lister(): Observable<ClientPlateforme[]> {
        return this.http.get<any>(this.url).pipe(map(r => r?.data?.clients ?? []));
    }

    creer(client: NouveauClient): Observable<RapportDeCreation> {
        return this.http.post<any>(this.url, client).pipe(map(r => r?.data ?? r));
    }

    /** Rejoue la pose du paramétrage par défaut du client dans chaque service ; rend les échecs. */
    amorcer(id: string): Observable<Record<string, unknown>> {
        return this.http.post<any>(`${this.url}/${id}/amorce`, {}).pipe(map(r => r?.data?.echecs ?? {}));
    }

    /** Rend à chaque client les lignes écrites avant le cloisonnement ; rend le rapport par service. */
    rattraper(): Observable<Record<string, unknown>> {
        return this.http.post<any>(`${this.url}/rattrapage`, {}).pipe(map(r => r?.data ?? {}));
    }
}
