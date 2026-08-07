import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NgxPermissionsModule } from 'ngx-permissions';

import { AuthService } from './auth.service';

/**
 * Service d'authentification.
 *
 * <p>Il tient trois dépendances — le client HTTP, le routeur et le registre de permissions — et son
 * constructeur s'abonne à l'utilisateur courant pour charger ses permissions. Le test les fournit
 * toutes : sans elles, l'injection échoue et l'on ne saurait pas si le service est en cause.</p>
 */
describe('AuthService', () => {
    let service: AuthService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [NgxPermissionsModule.forRoot()],
            providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
        });
        service = TestBed.inject(AuthService);
    });

    it('se construit avec ses dépendances', () => {
        expect(service).toBeTruthy();
    });

    it('sans utilisateur connecté, ne promet aucun jour de licence', () => {
        // La bannière de licence lit cette valeur à chaque affichage du gabarit : elle doit rendre un
        // nombre même quand personne n'est connecté, et non `undefined`.
        expect(service.getLicenseDaysRemaining()).toBe(0);
    });
});
