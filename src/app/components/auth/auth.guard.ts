import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
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
    canActivate(): Observable<boolean | UrlTree> {
        return this.authService.getMe().pipe(
            map(response => response ? true : this.router.parseUrl('/login')),
            catchError(() => of(this.router.parseUrl('/login')))
        );
    }

}
