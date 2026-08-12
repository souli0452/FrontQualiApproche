import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, Subject, catchError, tap, throwError } from 'rxjs';
import { REFERENTIEL_SERVICE } from './quali-url-configs';

/**
 * Où en est la licence de cette installation.
 *
 * <p>Trois situations, et trois conduites différentes : `ABSENTE` — rien n'a jamais été installé ;
 * `ACTIVE` — tout est ouvert ; `EXPIREE` — les données restent consultables, les actions sont
 * suspendues.</p>
 */
export interface EtatLicence {
    statut: 'ABSENTE' | 'ACTIVE' | 'EXPIREE';
    actionsOuvertes: boolean;
    type?: 'COMMERCIALE' | 'ESSAI';
    reference?: string;
    partenaireNom?: string;
    debut?: string;
    fin?: string;
    /** Négatif une fois le terme passé. */
    joursRestants: number;
    modules: string[];
    utilisateursMax: number;
    /** Phrase à afficher telle quelle : c'est elle qui dit quoi faire. */
    message: string;
}

/**
 * La licence de l'installation, telle que le serveur la tient.
 *
 * <p>L'état est relu auprès du serveur, jamais déduit côté client : c'est lui qui vérifie la
 * signature, et lui seul qui décide ce qui est ouvert. Ce que le navigateur en sait ne sert qu'à
 * l'affichage.</p>
 */
@Injectable({ providedIn: 'root' })
export class LicenceService {

    private readonly http = inject(HttpClient);

    /** Dernier état connu, pour que plusieurs écrans le lisent sans le redemander. */
    readonly etat$ = new BehaviorSubject<EtatLicence | null>(null);

    private readonly ouverture = new Subject<void>();

    /**
     * Demandes d'ouverture de la fenêtre de licence, émises par le menu.
     *
     * <p>La fenêtre vit dans le layout, l'entrée de menu ailleurs : elles ne se connaissent pas.
     * Le service, que les deux tiennent déjà, porte le signal — plutôt qu'une route dédiée, qui
     * ferait quitter l'écran en cours pour une opération de quelques secondes.</p>
     */
    readonly ouvertureDemandee$ = this.ouverture.asObservable();

    /**
     * Adresse du service, préfixée par celle de la passerelle comme partout ailleurs.
     *
     * <p>Elle était écrite en <b>relatif</b> — {@code /referentiel-service/api/v1/licence} — et ne
     * fonctionnait que par le proxy du serveur de développement, qui redirige ce préfixe vers la
     * passerelle. Une fois déployé, il n'y a plus de proxy : l'appel partait sur le domaine du
     * frontal, dont le serveur répond {@code index.html} à toute route qu'il ne connaît pas — la
     * page d'accueil de l'application, renvoyée à la place de l'état de la licence.</p>
     *
     * <p>Rien ne le signalait comme une panne de réseau : la réponse valait 200, et c'est
     * l'analyse du JSON qui échouait. L'état restait donc nul, et avec lui tout ce qui l'attend —
     * ni fenêtre d'activation, ni réglages requis, sur une installation neuve qui n'a pourtant
     * jamais eu de licence.</p>
     */
    private readonly racine = `${REFERENTIEL_SERVICE}/licence`;

    /** Ouvre la fenêtre de licence, licence en cours comprise : on renouvelle avant le terme. */
    demanderOuverture(): void {
        this.ouverture.next();
    }

    charger(): Observable<EtatLicence> {
        return this.http.get<any>(`${this.racine}/etat`).pipe(
            tap((reponse) => this.etat$.next(reponse?.data ?? reponse)),
            catchError((erreur: HttpErrorResponse) => this.echec(erreur))
        );
    }

    installer(licence: string): Observable<EtatLicence> {
        return this.http.post<any>(this.racine, { licence }).pipe(
            tap((reponse) => this.etat$.next(reponse?.data ?? reponse)),
            catchError((erreur: HttpErrorResponse) => this.echec(erreur))
        );
    }

    get etat(): EtatLicence | null {
        return this.etat$.value;
    }

    /**
     * Le serveur rédige des refus destinés à être lus — « cette licence a pris fin le … »,
     * « la signature est invalide ». Les remplacer par un libellé générique priverait
     * l'administrateur de la seule information qui lui dit quoi faire.
     */
    private echec(erreur: HttpErrorResponse) {
        const message = erreur.error?.message
            || (erreur.status === 403
                ? "Vous n'avez pas les droits pour installer une licence. Demandez-le à un administrateur."
                : "L'état de la licence n'a pas pu être lu.");
        return throwError(() => new Error(message));
    }
}
