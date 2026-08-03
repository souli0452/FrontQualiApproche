import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { of } from 'rxjs';

import { AuthGuard } from './auth.guard';
import { AuthService } from '../../services/auth-services/auth.service';

/**
 * Ce fichier était l'ébauche produite par `ng generate guard` pour un garde fonctionnel
 * (`authGuard`), jamais réécrite : le garde livré est la classe `AuthGuard`. L'import ne
 * résolvait rien, et l'erreur de compilation empêchait *toute* la suite de démarrer — `ng test`
 * échouait au chargement, sans exécuter le moindre test du projet.
 */
describe('AuthGuard', () => {
  function garde(session: unknown): AuthGuard {
    TestBed.configureTestingModule({
      providers: [
        AuthGuard,
        { provide: AuthService, useValue: { getMe: () => of(session) } },
        { provide: Router, useValue: { parseUrl: (url: string) => ({ url } as unknown as UrlTree) } }
      ]
    });
    return TestBed.inject(AuthGuard);
  }

  afterEach(() => TestBed.resetTestingModule());

  it('laisse passer une session valide', (done) => {
    garde({ userId: 'abc' })
      .canActivate()
      .subscribe((resultat) => {
        expect(resultat).toBeTrue();
        done();
      });
  });

  it("renvoie vers /login en l'absence de session", (done) => {
    // getMe() intercepte lui-même l'échec et rend of(null) : c'est ce cas — et non une erreur —
    // qui doit produire la redirection.
    garde(null)
      .canActivate()
      .subscribe((resultat) => {
        expect(resultat).toEqual({ url: '/login' } as unknown as UrlTree);
        done();
      });
  });
});
