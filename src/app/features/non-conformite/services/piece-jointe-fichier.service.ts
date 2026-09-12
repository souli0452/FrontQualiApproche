import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map } from 'rxjs/operators';
import { AMELIORATION_SERVICE } from '@core/services/url-config';

/**
 * Contenu des pièces jointes des non-conformités et des plans d'action.
 *
 * <p>Les listes de dossiers ne renvoient plus le contenu des fichiers : elles rapatriaient jusque
 * là, encodé en base64, chaque fichier de chaque ligne de chaque page. Une pièce n'est donc plus
 * décrite que par son identifiant, son nom et son type — le contenu se demande au serveur au
 * moment où l'utilisateur le réclame.</p>
 *
 * <p>Le service accepte aussi les pièces qui portent encore leur contenu : une pièce que
 * l'utilisateur vient de choisir dans le formulaire n'est pas encore enregistrée et ne peut donc
 * pas être relue au serveur.</p>
 */
@Injectable({ providedIn: 'root' })
export class PieceJointeFichierService {
    constructor(private http: HttpClient) {}

    /** Contenu d'une pièce, qu'elle soit déjà enregistrée ou seulement choisie à l'écran. */
    contenu(pj: any): Observable<Blob> {
        if (!pj) {
            return throwError(() => new Error('Aucune pièce jointe fournie.'));
        }

        const base64 = pj.fichier || pj.fichierBase64;
        if (base64) {
            return of(this.blobDepuisBase64(base64, this.typeDe(pj)));
        }

        if (!pj.id) {
            return throwError(() => new Error("Cette pièce jointe n'a pas encore été enregistrée."));
        }

        return this.http
            .get(`${AMELIORATION_SERVICE}/pieces-jointes/${pj.id}/contenu`, { responseType: 'blob' })
            .pipe(map((blob) => blob as Blob));
    }

    /** Supprime une pièce enregistrée, contenu compris. */
    supprimer(id: string): Observable<void> {
        return this.http.delete<void>(`${AMELIORATION_SERVICE}/pieces-jointes/${id}`);
    }

    /** Télécharge la pièce sous son nom d'origine. */
    telecharger(pj: any): void {
        this.contenu(pj).subscribe({
            next: (blob) => {
                const url = window.URL.createObjectURL(blob);
                const lien = document.createElement('a');
                lien.href = url;
                lien.download = this.nomDe(pj);
                lien.click();
                setTimeout(() => window.URL.revokeObjectURL(url), 100);
            },
            error: (erreur) => console.error('Téléchargement impossible', erreur)
        });
    }

    /** Ouvre la pièce dans un nouvel onglet. */
    visualiser(pj: any): void {
        this.contenu(pj).subscribe({
            next: (blob) => window.open(window.URL.createObjectURL(blob), '_blank'),
            error: (erreur) => console.error('Aperçu impossible', erreur)
        });
    }

    nomDe(pj: any): string {
        return pj?.nom || pj?.nomFichier || 'fichier';
    }

    typeDe(pj: any): string {
        return pj?.type || pj?.typeFichier || 'application/octet-stream';
    }

    private blobDepuisBase64(base64: string, type: string): Blob {
        const octetsEnCaracteres = atob(base64);
        const octets = new Uint8Array(octetsEnCaracteres.length);
        for (let i = 0; i < octetsEnCaracteres.length; i++) {
            octets[i] = octetsEnCaracteres.charCodeAt(i);
        }
        return new Blob([octets], { type });
    }
}
