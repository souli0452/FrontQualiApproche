import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

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

    /** Les entrées publiées, pour l'écran d'aide. Sans pagination : elles s'affichent en entier. */
    publiees(): Observable<EntreeFaq[]> {
        return this.http.get<EntreeFaq[]>(`${QualiUrlConfig.FAQ_ROOT_URL}/publiees`);
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
