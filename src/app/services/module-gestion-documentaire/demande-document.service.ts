import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { QualiUrlConfig } from '../quali-url-configs';
import { DemandeDocumentDto, TypeDemande } from '../../models/demande-document.model';

/**
 * Demandes de modification et de suppression de document.
 *
 * Les listes échappent à la pagination automatique côté serveur (retour explicite en
 * `ApiResponse`) : une demande masquée par une troncature silencieuse resterait sans réponse.
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
        return this.http.post<DemandeDocumentDto>(QualiUrlConfig.DEMANDE_DOCUMENT_ROOT_URL, formData);
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
        return this.http.get<DemandeDocumentDto>(`${QualiUrlConfig.DEMANDE_DOCUMENT_ROOT_URL}/${id}`);
    }

    /** Dépôt du document remplaçant, une fois la demande de modification acceptée. */
    deposerRemplacant(id: string, fichier: File, commentaire?: string): Observable<DemandeDocumentDto> {
        const formData = new FormData();
        formData.append('file', fichier);
        const params = commentaire ? new HttpParams().set('commentaire', commentaire) : undefined;
        return this.http.post<DemandeDocumentDto>(
            `${QualiUrlConfig.DEMANDE_DOCUMENT_ROOT_URL}/${id}/remplacant`, formData, { params });
    }
}
