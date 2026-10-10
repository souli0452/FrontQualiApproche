import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { AuthService } from '@core/auth/auth.service';
import { MotDePasseTemporaireService } from '@core/auth/mot-de-passe-temporaire.service';
import { ResetPasswordComponent } from './reset-password.component';

/**
 * Les deux chemins qui mènent à l'écran du nouveau mot de passe.
 *
 * <p>L'écran était resté inerte (corps commenté) jusqu'à ce que le mot de passe temporaire quitte
 * l'URL. On vérifie ici que chaque chemin appelle le bon service avec les bons arguments, et qu'une
 * arrivée sans rien — page rechargée, mot de passe temporaire perdu avec la mémoire — n'envoie rien
 * au serveur.</p>
 *
 * <p>Le gabarit est remplacé par un gabarit vide : c'est la logique qu'on éprouve, pas l'habillage
 * PrimeNG.</p>
 */
describe('ResetPasswordComponent', () => {

    let authService: jasmine.SpyObj<AuthService>;
    let router: Router;

    /**
     * Monte l'écran avec les paramètres d'URL donnés et, le cas échéant, les identifiants que
     * l'écran de connexion aurait déposés. Le dépôt se fait après la substitution de la route :
     * TestBed refuse toute substitution une fois un service injecté.
     */
    const monter = (parametres: Record<string, string> = {}, depot?: [string, string]): ResetPasswordComponent => {
        TestBed.overrideProvider(ActivatedRoute, {
            useValue: { snapshot: { queryParamMap: convertToParamMap(parametres) } }
        });
        if (depot) {
            TestBed.inject(MotDePasseTemporaireService).deposer(depot[0], depot[1]);
        }
        const composant = TestBed.createComponent(ResetPasswordComponent).componentInstance;
        router = TestBed.inject(Router);
        spyOn(router, 'navigate').and.resolveTo(true);
        composant.ngOnInit();
        return composant;
    };

    const saisir = (composant: ResetPasswordComponent, motDePasse: string) => {
        composant.newPasswordForm.setValue({ password: motDePasse, confirmPassword: motDePasse });
    };

    beforeEach(async () => {
        authService = jasmine.createSpyObj<AuthService>('AuthService', ['updateTemporaryPassword', 'reinitializePwd']);
        authService.updateTemporaryPassword.and.returnValue(of({ data: null }));
        authService.reinitializePwd.and.returnValue(of(null as any));

        await TestBed.configureTestingModule({
            imports: [ResetPasswordComponent],
            providers: [provideRouter([]), { provide: AuthService, useValue: authService }]
        })
            .overrideComponent(ResetPasswordComponent, { set: { template: '', imports: [] } })
            .compileComponents();
    });

    it("après une connexion au mot de passe temporaire, l'ancien est repris de la mémoire", () => {
        const composant = monter({}, ['agent.qualite', 'Temp#2026']);

        saisir(composant, 'Neuf#20260');
        composant.onResetPassword();

        expect(authService.updateTemporaryPassword)
            .toHaveBeenCalledOnceWith('agent.qualite', 'Neuf#20260', 'Temp#2026');
        expect(authService.reinitializePwd).not.toHaveBeenCalled();
        expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('par le lien du courriel, le jeton et l\'identifiant lus dans l\'URL partent à reinitializePwd', () => {
        const composant = monter({ token: 'jeton-abc', userId: 'u-1' });

        saisir(composant, 'Neuf#20260');
        composant.onResetPassword();

        expect(authService.reinitializePwd).toHaveBeenCalledOnceWith('u-1', 'Neuf#20260', 'jeton-abc');
        expect(authService.updateTemporaryPassword).not.toHaveBeenCalled();
        expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('le lien du courriel l\'emporte sur un reste de mot de passe temporaire', () => {
        // Un dépôt oublié dans la mémoire ne doit pas détourner un lien de courriel vers un autre compte.
        const composant = monter({ token: 'jeton-abc', userId: 'u-1' }, ['autre.agent', 'Temp#2026']);

        saisir(composant, 'Neuf#20260');
        composant.onResetPassword();

        expect(authService.reinitializePwd).toHaveBeenCalledOnceWith('u-1', 'Neuf#20260', 'jeton-abc');
        expect(authService.updateTemporaryPassword).not.toHaveBeenCalled();
    });

    it('arrivé sans rien (page rechargée), l\'écran dit « Session expirée » et n\'appelle personne', () => {
        const composant = monter();

        expect(composant.errorMessage).toContain('Session expirée');

        saisir(composant, 'Neuf#20260');
        composant.onResetPassword();

        expect(authService.updateTemporaryPassword).not.toHaveBeenCalled();
        expect(authService.reinitializePwd).not.toHaveBeenCalled();
        expect(composant.errorMessage).toContain('Session expirée');
    });

    it('un formulaire invalide (confirmation différente) n\'envoie rien', () => {
        const composant = monter({}, ['agent.qualite', 'Temp#2026']);

        composant.newPasswordForm.setValue({ password: 'Neuf#20260', confirmPassword: 'Autre#2026' });
        composant.onResetPassword();

        expect(authService.updateTemporaryPassword).not.toHaveBeenCalled();
    });
});
