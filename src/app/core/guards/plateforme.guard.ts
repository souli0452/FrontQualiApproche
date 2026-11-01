import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, of } from 'rxjs';
import { AuthService } from '@core/auth/auth.service';
import { currentUserState } from '@core/auth/auth.state';
import { estAdministrateurDePlateforme } from '@core/auth/auth-utils';

/**
 * Réserve une route à l'administrateur de la plateforme.
 *
 * Il n'a ni permission applicative ni licence : `permissionGuard`, qui raisonne par permissions,
 * ne sait pas le reconnaître. Le serveur, lui, vérifie le rôle sur le jeton ; cette garde évite
 * seulement d'ouvrir un écran que chaque appel refuserait.
 */
export const plateformeGuard: CanActivateFn = () => {
    const router = inject(Router);
    const authService = inject(AuthService);
    const decider = () => estAdministrateurDePlateforme() ? true : router.createUrlTree(['/auth/access']);
    if (currentUserState.value) {
        return of(decider());
    }
    return authService.getMe().pipe(map(() => decider()));
};
