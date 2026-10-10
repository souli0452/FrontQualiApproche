import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';
import { throwError } from 'rxjs';

import { AuthService } from '@core/auth/auth.service';
import { MotDePasseTemporaireService } from '@core/auth/mot-de-passe-temporaire.service';
import { StructureService } from '@features/organigramme/services/structure.service';
import { LoginComponent } from './login.component';

/**
 * Connexion avec un mot de passe temporaire.
 *
 * <p>Le serveur refuse la session (403, `temporaryPwd`) et l'écran envoie l'utilisateur choisir un
 * nouveau mot de passe. Le mot de passe saisi partait jusqu'ici dans l'URL (`oldpwd`) ; on vérifie
 * qu'il passe désormais par la mémoire de l'application et que la navigation n'emporte aucun
 * paramètre.</p>
 *
 * <p>Le gabarit est remplacé par un gabarit vide : c'est la logique qu'on éprouve, pas l'habillage
 * PrimeNG.</p>
 */
describe('LoginComponent', () => {

    let composant: LoginComponent;
    let authService: jasmine.SpyObj<AuthService>;
    let router: Router;

    /** Refus du serveur tel que le rend user-service pour un compte à mot de passe temporaire. */
    const refusMotDePasseTemporaire = () => new HttpErrorResponse({
        status: 403,
        error: { data: { emailVerified: true, enabled: true, temporaryPwd: true } }
    });

    beforeEach(async () => {
        authService = jasmine.createSpyObj<AuthService>('AuthService', ['login', 'getMe', 'initiatePasswordReset']);

        await TestBed.configureTestingModule({
            imports: [LoginComponent],
            providers: [
                provideRouter([]),
                MessageService,
                { provide: AuthService, useValue: authService },
                { provide: StructureService, useValue: {} }
            ]
        })
            .overrideComponent(LoginComponent, { set: { template: '', imports: [] } })
            .compileComponents();

        composant = TestBed.createComponent(LoginComponent).componentInstance;
        router = TestBed.inject(Router);
        spyOn(router, 'navigate').and.resolveTo(true);
    });

    it("sur un mot de passe temporaire, navigue vers /reset-password sans rien dans l'URL", () => {
        authService.login.and.returnValue(throwError(() => refusMotDePasseTemporaire()));
        composant.loginForm.setValue({ username: 'agent.qualite', password: 'Temp#2026', refreshToken: '' });

        composant.onLogin();

        // Un seul argument : ni queryParams, ni state — le mot de passe ne doit figurer nulle part
        // dans ce que le navigateur garde de la navigation.
        expect(router.navigate).toHaveBeenCalledOnceWith(['/reset-password']);
    });

    it("sur un mot de passe temporaire, les identifiants saisis sont confiés à la mémoire", () => {
        authService.login.and.returnValue(throwError(() => refusMotDePasseTemporaire()));
        composant.loginForm.setValue({ username: 'agent.qualite', password: 'Temp#2026', refreshToken: '' });

        composant.onLogin();

        expect(TestBed.inject(MotDePasseTemporaireService).reprendre())
            .toEqual({ username: 'agent.qualite', motDePasse: 'Temp#2026' });
    });

    it('un compte désactivé ne mène pas à /reset-password et ne laisse rien en mémoire', () => {
        authService.login.and.returnValue(throwError(() => new HttpErrorResponse({
            status: 403,
            error: { data: { emailVerified: true, enabled: false, temporaryPwd: true } }
        })));
        composant.loginForm.setValue({ username: 'agent.qualite', password: 'Temp#2026', refreshToken: '' });

        composant.onLogin();

        expect(router.navigate).not.toHaveBeenCalled();
        expect(TestBed.inject(MotDePasseTemporaireService).reprendre()).toBeNull();
    });
});
