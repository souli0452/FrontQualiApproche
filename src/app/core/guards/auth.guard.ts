import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { AuthService } from "../auth/auth.service";
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
