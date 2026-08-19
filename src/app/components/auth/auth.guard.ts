import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import {AuthService} from "../../services/auth-services/auth.service";
import { catchError, map, Observable, of } from 'rxjs';


@Injectable({
    providedIn: 'root'
})
export class AuthGuard implements CanActivate {
    constructor(
        private authService: AuthService, 
        private router: Router
    ) {}

    /**
     * Le garde ignorait la réponse de {@code getMe()} et rendait {@code true} dans tous les cas.
     *
     * <p>{@code AuthService.getMe()} intercepte lui-même l'échec et rend {@code of(null)} : la
     * branche {@code catchError} posée ici n'était donc jamais atteinte, et {@code map(() => true)}
     * autorisait la navigation d'un visiteur sans session. Le refus se produisait plus tard, au
     * premier appel d'API — après affichage de l'écran. C'est aussi ce garde que présuppose
     * {@code permissionGuard} : sans session, il n'y a aucune permission à évaluer.</p>
     */
    /**
     * <p>L'adresse demandée voyage jusqu'à la connexion ({@code /login?returnUrl=…}), qui y revient
     * une fois la session ouverte. Sans elle, un lien de courriel d'étape ou le QR code d'une fiche
     * imprimée ne menaient au dossier que si la session était déjà ouverte : sinon le visiteur
     * était renvoyé vers la connexion, puis déposé sur la vue d'ensemble, et le dossier visé était
     * perdu en chemin.</p>
     */
    canActivate(route?: ActivatedRouteSnapshot, state?: RouterStateSnapshot): Observable<boolean | UrlTree> {
        return this.authService.getMe().pipe(
            map(response => response ? true : this.versLaConnexion(state)),
            catchError(() => of(this.versLaConnexion(state)))
        );
    }

    /** La connexion, en emportant l'adresse visée — sauf si c'est la connexion elle-même. */
    private versLaConnexion(state?: RouterStateSnapshot): UrlTree {
        const demandee = state?.url;
        if (!demandee || demandee === '/' || demandee.startsWith('/login')) {
            return this.router.parseUrl('/login');
        }
        return this.router.createUrlTree(['/login'], { queryParams: { returnUrl: demandee } });
    }

}
