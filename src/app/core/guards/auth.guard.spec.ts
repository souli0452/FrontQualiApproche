import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { of } from 'rxjs';

import { AuthGuard } from './auth.guard';
import { AuthService } from '../auth/auth.service';

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

  it('autorise la navigation lorsque l’utilisateur est connecté', (done) => {
    garde({ user: { id: 'alice' } })
      .canActivate()
      .subscribe((autorise) => {
        expect(autorise).toBeTrue();
        done();
      });
  });

  it('redirige vers la connexion lorsque l’utilisateur est anonyme', (done) => {
    garde(null)
      .canActivate()
      .subscribe((direction) => {
        expect(direction).toEqual(jasmine.objectContaining({ url: '/login' }));
        done();
      });
  });
});
