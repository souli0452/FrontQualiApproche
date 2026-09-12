import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { QualiUrlConfig } from '@core/services/url-config';
import { TypeDemande } from '@features/non-conformite/models/nc-status.model';
import { DemandeDocumentDto } from '../models/demande.model';

/**
 * Demandes de modification et de suppression de document.
 *
 * Les listes échappent à la pagination automatique côté serveur (retour explicite en
 * `ApiResponse`) : une demande masquée par une troncature silencieuse resterait sans réponse.
 *
 * **Toute** réponse est dépliée de son enveloppe `{ success, data }` : support-service l'ajoute
 * d'office (`GlobalResponseHandler`) à ce qui n'est pas déjà un `ApiResponse`. Trois méthodes ne le
 * faisaient pas — `getById`, `creer`, `deposerRemplacant` — et rendaient l'enveloppe telle quelle :
 * la demande relue paraissait dépourvue d'identifiant, d'où des appels `instances/undefined/state`
 * en 500. Le typage ne pouvait rien y voir, l'enveloppe étant déclarée comme la charge.
 */
@Injectable({ providedIn: 'root' })
export class DemandeDocumentService {

    constructor(private http: HttpClient) {}

    creer(documentId: string, type: TypeDemande, objectif: string,
          description?: string, pieceJointe?: File): Observable<DemandeDocumentDto> {
        const formData = new FormData();
        formData.append('documentId', documentId);
        formData.append('type', type);
        formData.append('objectif', objectif);
        if (description) {
            formData.append('description', description);
        }
        if (pieceJointe) {
            formData.append('file', pieceJointe);
        }
        return this.http.post<any>(QualiUrlConfig.DEMANDE_DOCUMENT_ROOT_URL, formData).pipe(
            map(res => res?.data ?? res)
        );
    }

    /** Demandes visibles : celles de ma structure, toutes pour le responsable qualité. */
    mesDemandes(): Observable<DemandeDocumentDto[]> {
        return this.http.get<any>(QualiUrlConfig.DEMANDE_DOCUMENT_ROOT_URL).pipe(
            map(res => res?.data ?? res ?? [])
        );
    }

    /**
     * Demandes que j'ai à instruire, l'état de leur circuit joint à chaque ligne.
     *
     * Ce n'est pas un sous-ensemble de `mesDemandes()` filtré sur un état : c'est le circuit qui
     * désigne les dossiers, puisque lui seul sait quel rôle décide de l'étape courante. Les
     * `allowedActions` de chaque ligne permettent d'agir sans ouvrir la fiche.
     */
    /**
     * Dépose une pièce réclamée par une étape de l'instruction et rend sa référence.
     *
     * <p>Même contrat que pour les documents et les non-conformités : la pièce part d'abord, sa
     * référence devient ensuite la valeur du champ de l'étape.</p>
     */
    deposerFichierDEtape(demandeId: string, fichier: File): Observable<string> {
        const corps = new FormData();
        corps.append('file', fichier, fichier.name);
        return this.http
            .post<any>(`${QualiUrlConfig.DEMANDE_DOCUMENT_ROOT_URL}/${demandeId}/fichiers-etape`, corps)
            .pipe(map((reponse: any) => reponse?.data ?? reponse));
    }

    /** Adresse de téléchargement d'une pièce d'étape, désignée par sa référence. */
    urlFichierDEtape(demandeId: string, reference: string): string {
        return `${QualiUrlConfig.DEMANDE_DOCUMENT_ROOT_URL}/${demandeId}/fichiers-etape/contenu`
            + `?reference=${encodeURIComponent(reference)}`;
    }

    aTraiter(): Observable<DemandeDocumentDto[]> {
        return this.http.get<any>(`${QualiUrlConfig.DEMANDE_DOCUMENT_ROOT_URL}/a-traiter`).pipe(
            map(res => res?.data ?? res ?? [])
        );
    }

    /** Historique des demandes portées sur un document. */
    parDocument(documentId: string): Observable<DemandeDocumentDto[]> {
        return this.http.get<any>(`${QualiUrlConfig.DEMANDE_DOCUMENT_ROOT_URL}/document/${documentId}`).pipe(
            map(res => res?.data ?? res ?? [])
        );
    }

    /** Statistiques des demandes visibles : par état, par nature, et dépôts par mois. */
    statistiques(mois = 12): Observable<any> {
        return this.http.get<any>(
            `${QualiUrlConfig.DEMANDE_DOCUMENT_ROOT_URL}/stats?mois=${mois}`).pipe(
            map(res => res?.data ?? res ?? {})
        );
    }

    getById(id: string): Observable<DemandeDocumentDto> {
        return this.http.get<any>(`${QualiUrlConfig.DEMANDE_DOCUMENT_ROOT_URL}/${id}`).pipe(
            map(res => res?.data ?? res)
        );
    }

    /** Dépôt du document remplaçant, une fois la demande de modification acceptée. */
    deposerRemplacant(id: string, fichier: File, commentaire?: string): Observable<DemandeDocumentDto> {
        const formData = new FormData();
        formData.append('file', fichier);
        const params = commentaire ? new HttpParams().set('commentaire', commentaire) : undefined;
        return this.http.post<any>(
            `${QualiUrlConfig.DEMANDE_DOCUMENT_ROOT_URL}/${id}/remplacant`, formData, { params }).pipe(
            map(res => res?.data ?? res)
        );
    }
}

// Alias canonique
export { DemandeDocumentService as DemandeService };
