import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';

import { QualiUrlConfig } from './quali-url-configs';

/** Nature de la valeur d'un réglage, telle que le serveur l'énumère. */
export type NatureParametre = 'TEXTE' | 'COURRIEL' | 'TELEPHONE' | 'URL' | 'IMAGE' | 'ADRESSE' | 'NOMBRE';

/**
 * Réglage de l'organisation : un couple clé/valeur.
 *
 * <p>La clé fait l'identité du réglage — c'est par elle que le serveur le désigne pour composer le
 * pied des courriels ou mettre le responsable qualité en copie. Elle n'est donc pas modifiable après
 * création : le serveur refuse un renommage en 409 plutôt que de l'ignorer en silence.</p>
 */
export interface Parametre {
    id?: string;
    cle: string;
    valeur?: string | null;
    libelle: string;
    description?: string | null;
    type?: NatureParametre;
    lisibleSansHabilitation?: boolean;
}

/**
 * Réglages de l'organisation, tenus par referentiel-service.
 *
 * <p>Remplace l'ancien service de configuration globale, dont les trois champs étaient figés dans le
 * code. Ils sont ici trois réglages parmi d'autres, semés au démarrage du référentiel.</p>
 *
 * <p>Les réponses arrivent enveloppées dans {@code ApiResponse} : chaque lecture ôte le {@code data},
 * pour que l'écran n'ait pas à connaître l'enveloppe.</p>
 */
@Injectable({ providedIn: 'root' })
export class ParametreService {

    private readonly uri = QualiUrlConfig.PARAMETRE_ROOT_URL;

    constructor(private readonly http: HttpClient) {}

    /**
     * Liste complète, rangée par clé.
     *
     * <p>La racine du service, et non `/all` : c'est elle qui sert la liste entière. Elle est
     * enveloppée explicitement côté serveur, faute de quoi seuls les dix premiers réglages
     * reviendraient.</p>
     */
    liste(recherche?: string): Observable<Parametre[]> {
        const params = recherche && recherche.trim() ? { recherche: recherche.trim() } : undefined;
        return this.http.get<any>(this.uri, { params }).pipe(
            map(res => res?.data ?? res ?? [])
        );
    }

    creer(reglage: Parametre): Observable<Parametre> {
        return this.http.post<any>(`${this.uri}/create`, reglage).pipe(map(res => res?.data ?? res));
    }

    /** La clé envoyée doit être celle du réglage : le serveur refuse un renommage. */
    modifier(id: string, reglage: Parametre): Observable<Parametre> {
        return this.http.put<any>(`${this.uri}/update/${id}`, reglage).pipe(map(res => res?.data ?? res));
    }

    // Aucune suppression : l'écran de configuration ne fait que renseigner des valeurs, et une clé
    // retirée ne reviendrait qu'au redémarrage du référentiel, vide. Le serveur, lui, garde le point
    // d'entrée — c'est le semeur qui crée les clés.
}
