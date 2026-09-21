import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';

import { BaseCrudService } from '@core/services/base-crud.service';
import { QualiUrlConfig } from '@core/services/url-config';
import { EntreeFaq, FichierFaq } from './faq.model';

/**
 * La foire aux questions, servie par referentiel-service.
 *
 * <p>Deux lectures s'y font : l'écran d'administration, qui montre les brouillons, et
 * {@link publiees}, ouvert à toute personne connectée — une aide qu'il faut une permission pour
 * consulter n'aide personne. C'est aussi ce point d'entrée que l'assistant IA appelle.</p>
 */
@Injectable({ providedIn: 'root' })
export class FaqService extends BaseCrudService<EntreeFaq, string> {

    constructor(public override http: HttpClient) {
        super(http, QualiUrlConfig.FAQ_ROOT_URL);
    }

    /**
     * Les entrées publiées, pour l'écran d'aide. Sans pagination : elles s'affichent en entier.
     *
     * <p>Le serveur enveloppe sa réponse dans un {@code ApiResponse} — c'est la seule forme que
     * son intercepteur laisse passer sans la paginer d'office à dix éléments. D'où le
     * déballage.</p>
     */
    publiees(): Observable<EntreeFaq[]> {
        return this.http.get<any>(`${QualiUrlConfig.FAQ_ROOT_URL}/publiees`)
            .pipe(map((reponse) => reponse?.data ?? reponse ?? []));
    }

    /**
     * Une page du référentiel, d'un côté ou de l'autre de la publication.
     *
     * <p>Le filtre est servi par le serveur et non appliqué ici : une page de dix lignes filtrée
     * après coup en laisserait trois, et la pagination mentirait.</p>
     */
    page(publiee: boolean, page: number, size: number): Observable<any> {
        return this.http.get<any>(QualiUrlConfig.FAQ_ROOT_URL, {
            params: { publiee, page, size }
        });
    }

    /** Les comptes de part et d'autre, que les onglets affichent. */
    comptes(): Observable<{ publiees: number; nonPubliees: number }> {
        return this.http.get<any>(`${QualiUrlConfig.FAQ_ROOT_URL}/comptes`)
            .pipe(map((reponse) => reponse?.data ?? reponse ?? { publiees: 0, nonPubliees: 0 }));
    }

    /**
     * Une entrée par son identifiant.
     *
     * <p>Sous {@code /get/} : c'est la convention des référentiels du dépôt, et
     * {@code BaseCrudService.findById} ne la connaît pas — il compose {@code /{id}}, que le
     * serveur n'expose plus depuis qu'un identifiant nu happait {@code /all}.</p>
     */
    getById(id: string): Observable<EntreeFaq> {
        return this.http.get<any>(`${QualiUrlConfig.FAQ_ROOT_URL}/get/${id}`)
            .pipe(map((reponse) => reponse?.data ?? reponse));
    }

    /**
     * Joint des pièces à une entrée.
     *
     * <p>Rend 503 si l'installation n'a pas de serveur de fichiers — la FAQ reste utilisable
     * sans, seules les pièces sont indisponibles.</p>
     */
    joindre(faqId: string, fichiers: File[]): Observable<FichierFaq[]> {
        const corps = new FormData();
        fichiers.forEach((fichier) => corps.append('fichiers', fichier));
        return this.http.post<FichierFaq[]>(`${QualiUrlConfig.FAQ_ROOT_URL}/${faqId}/fichiers`, corps);
    }

    /** Le contenu d'une pièce jointe, en binaire. */
    fichier(fichierId: string): Observable<Blob> {
        return this.http.get(`${QualiUrlConfig.FAQ_ROOT_URL}/fichiers/${fichierId}`,
            { responseType: 'blob' });
    }

    retirerLaPiece(fichierId: string): Observable<void> {
        return this.http.delete<void>(`${QualiUrlConfig.FAQ_ROOT_URL}/fichiers/${fichierId}`);
    }
}
