import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable, map, of } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { currentUserState } from '../auth/auth.state';
import { hasAnyPermission, isModuleSubscribed } from '../auth/auth-utils';

/**
 * Restriction d'accès portée par une route, déclarée dans son `data` :
 *
 * ```ts
 * { path: 'reclamation', component: ReclamationComponent,
 *   canActivate: [permissionGuard],
 *   data: { permissions: ['reclamation-read', 'RECLAMATION_READ'], module: 'RECLAMATION' } }
 * ```
 *
 * <p>La règle appliquée est exactement celle du menu — module souscrit, permission détenue — et
 * elle s'appuie sur les mêmes fonctions (`auth-utils`). C'est
 * délibéré : masquer une entrée de menu n'empêche que le clic, pas la saisie de l'URL. Deux
 * implémentations séparées auraient fini par diverger, et la divergence se serait vue là où
 * elle coûte le plus cher — un écran ouvert à qui ne doit pas le voir.</p>
 *
 * <p>Une route sans `permissions` n'est pas restreinte : le garde la laisse passer plutôt que
 * de fermer par défaut, afin qu'ajouter le garde à une route ne la condamne pas tant que sa
 * déclaration n'est pas écrite.</p>
 */
export const permissionGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
    const router = inject(Router);
    const authService = inject(AuthService);

    const permissions: string[] = route.data?.['permissions'] ?? [];
    const module: string | undefined = route.data?.['module'];

    if (permissions.length === 0) {
        return true;
    }

    const decider = (): boolean | UrlTree => {
        // Session absente : c'est un défaut d'authentification, pas d'habilitation. La distinction
        // compte pour l'utilisateur — on le renvoie se connecter, pas sur un « accès refusé ».
        if (!currentUserState.value) {
            // L'adresse visée accompagne le renvoi, comme dans AuthGuard : sans elle, le lien d'un
            // courriel ou le QR d'une fiche déposait l'utilisateur sur l'accueil après connexion.
            const demandee = state?.url;
            return demandee && demandee !== '/' && !demandee.startsWith('/login')
                ? router.createUrlTree(['/login'], { queryParams: { returnUrl: demandee } })
                : router.parseUrl('/login');
        }
        // L'échéance de la licence n'interdit pas de naviguer. Elle renvoyait ici vers
        // `/auth/access` — page située hors du layout, donc sans la fenêtre d'activation : une
        // licence expirée fermait l'application tout en affichant, ailleurs, que les données
        // restaient consultables. Ce que la licence suspend, ce sont les écritures, et c'est la
        // passerelle qui les refuse en 402.
        if (module && !isModuleSubscribed(module)) {
            return router.parseUrl('/auth/access');
        }
        return hasAnyPermission(permissions) ? true : router.parseUrl('/auth/access');
    };

    // Sur un accès direct par l'URL (F5, favori), l'état utilisateur peut n'être pas encore chargé.
    // On le réclame alors avant de statuer, faute de quoi le garde refuserait une navigation
    // parfaitement légitime au seul motif qu'il a été consulté trop tôt.
    if (!currentUserState.value) {
        return authService.getMe().pipe(map(() => decider())) as Observable<boolean | UrlTree>;
    }

    return of(decider());
};
