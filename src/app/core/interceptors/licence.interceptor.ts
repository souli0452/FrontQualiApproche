import {
    HttpErrorResponse,
    HttpEvent,
    HttpHandler,
    HttpInterceptor,
    HttpRequest
} from '@angular/common/http';
import { Injectable, Injector, inject } from '@angular/core';
import { LicenceService } from '@core/licence/services/licence.service';
import { MessageService } from 'primeng/api';
import { Observable, catchError, throwError } from 'rxjs';

/**
 * Le refus de la passerelle, dit à l'utilisateur.
 *
 * <p>Une écriture faite sans licence valide revient en <b>402</b>, avec la phrase rédigée par le
 * serveur. Sans ce filet, l'écran reste muet : le bouton s'enfonce, rien ne se passe, et
 * l'utilisateur conclut à une panne. C'est le refus le plus facile à confondre avec un défaut de
 * droits ou une coupure réseau, alors qu'il appelle une action précise — poser une licence.</p>
 *
 * <p>Les boutons d'action sont par ailleurs désactivés à l'avance
 * ({@link ../../shared/licence/licence-ouverte.directive}). Ce filet couvre ce que la désactivation
 * ne peut pas atteindre : formulaires imbriqués, envois automatiques, écrans oubliés — et
 * l'instant où la licence prend fin pendant que l'écran est ouvert.</p>
 *
 * <p>L'état de la licence est relu au passage : c'est ce qui fait apparaître le bandeau sans
 * attendre un rechargement de la page.</p>
 */
@Injectable()
export class LicenceInterceptor implements HttpInterceptor {

    /**
     * Injection différée : {@link LicenceService} consomme `HttpClient`, dont cet intercepteur
     * fait partie. Le réclamer à la construction formerait un cycle, et l'application ne
     * démarrerait pas.
     */
    private readonly injector = inject(Injector);

    private readonly messages = inject(MessageService);

    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        return next.handle(req).pipe(
            catchError((erreur: HttpErrorResponse) => {
                if (erreur.status === 402) {
                    this.signaler(erreur);
                }
                return throwError(() => erreur);
            })
        );
    }

    private signaler(erreur: HttpErrorResponse): void {
        this.messages.add({
            severity: 'warn',
            summary: 'Action suspendue',
            detail: erreur.error?.message
                ?? "La licence de cette installation ne permet plus cette action. Vos données "
                 + 'restent consultables.',
            life: 10000
        });

        this.injector.get(LicenceService).charger().subscribe({ error: () => undefined });
    }
}
