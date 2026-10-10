import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NgxPermissionsModule } from 'ngx-permissions';

import { AuthService } from './auth.service';
import { QualiUrlConfig } from '@core/services/url-config';

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

    /**
     * Mots de passe, jetons et adresse dans le corps, jamais dans l'URL.
     *
     * <p>Une chaîne de requête se retrouve dans les journaux de la passerelle, l'historique du
     * navigateur et l'en-tête Referer. Chaque cas vérifie la méthode, l'adresse nue et le corps
     * exact attendu par le serveur : un nom de champ qui dérive, et le parcours répond 400.</p>
     */
    describe('secrets envoyés dans le corps', () => {
        let http: HttpTestingController;

        beforeEach(() => {
            http = TestBed.inject(HttpTestingController);
        });

        afterEach(() => http.verify());

        /** Attend l'unique requête vers l'adresse, sans aucun paramètre d'URL. */
        const attendreSansParametre = (url: string, methode: string) => {
            const requete = http.expectOne((r) => r.url === url);
            expect(requete.request.method).toBe(methode);
            expect(requete.request.params.keys()).toEqual([]);
            expect(requete.request.urlWithParams).not.toContain('?');
            return requete;
        };

        it("la réinitialisation par l'administrateur envoie {userId, password} en PATCH", () => {
            service.resetPassword('u-1', 'Neuf#2026').subscribe();

            const requete = attendreSansParametre(QualiUrlConfig.RESET_PASSWORD_URL, 'PATCH');
            expect(requete.request.body).toEqual({ userId: 'u-1', password: 'Neuf#2026' });
            requete.flush(null);
        });

        it('le lien du courriel envoie {userId, token, password} en PUT', () => {
            service.reinitializePwd('u-1', 'Neuf#2026', 'jeton-abc').subscribe();

            const requete = attendreSansParametre(QualiUrlConfig.REINITIALIZE_PASSWORD_URL, 'PUT');
            expect(requete.request.body).toEqual({ userId: 'u-1', token: 'jeton-abc', password: 'Neuf#2026' });
            requete.flush(null);
        });

        it('le changement du mot de passe temporaire envoie {username, oldPassword, password} en PUT', () => {
            service.updateTemporaryPassword('agent.qualite', 'Neuf#2026', 'Temp#2026').subscribe();

            const requete = attendreSansParametre(QualiUrlConfig.UPDATE_PASSWORD_URL, 'PUT');
            expect(requete.request.body)
                .toEqual({ username: 'agent.qualite', oldPassword: 'Temp#2026', password: 'Neuf#2026' });
            requete.flush({ data: null });
        });

        it("la demande de réinitialisation envoie {email} en POST", () => {
            service.initiatePasswordReset('agent@exemple.bf').subscribe();

            const requete = attendreSansParametre(QualiUrlConfig.INITIATE_RESET_PASSWORD_URL, 'POST');
            expect(requete.request.body).toEqual({ email: 'agent@exemple.bf' });
            requete.flush(null);
        });
    });
});
