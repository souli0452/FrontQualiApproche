import { TestBed } from '@angular/core/testing';

import { MotDePasseTemporaireService } from './mot-de-passe-temporaire.service';

/**
 * Passage du mot de passe temporaire entre la connexion et le changement de mot de passe.
 *
 * <p>Il remplace le paramètre d'URL `oldpwd` : ce qu'on vérifie ici, c'est qu'il rend bien ce
 * qu'on lui confie, et qu'il ne le garde pas au-delà d'une lecture.</p>
 */
describe('MotDePasseTemporaireService', () => {
    let service: MotDePasseTemporaireService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(MotDePasseTemporaireService);
    });

    it('rend les identifiants déposés', () => {
        service.deposer('agent.qualite', 'Temp#2026');

        expect(service.reprendre()).toEqual({ username: 'agent.qualite', motDePasse: 'Temp#2026' });
    });

    it('ne rend les identifiants qu\'une seule fois', () => {
        service.deposer('agent.qualite', 'Temp#2026');
        service.reprendre();

        expect(service.reprendre()).toBeNull();
    });

    it('ne rend rien quand rien n\'a été déposé (page rechargée)', () => {
        expect(service.reprendre()).toBeNull();
    });
});
