import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EtatLicence, LicenceService } from '@core/licence';
import { LicenceOuverteDirective } from './licence-ouverte.directive';

@Component({
    standalone: true,
    imports: [LicenceOuverteDirective],
    template: `<button siLicenceOuverte type="button">Enregistrer</button>`
})
class HoteDeTest {}

/**
 * Les boutons d'écriture, désactivés d'avance.
 *
 * <p>Le serveur refuse déjà ces actions en 402. Ce que la directive change, c'est le moment où
 * l'utilisateur l'apprend : avant la saisie, et non après dix minutes de formulaire — découvrir
 * le refus à l'enregistrement est la manière la plus sûre de faire passer une licence échue pour
 * une perte de données.</p>
 */
describe('LicenceOuverteDirective', () => {

    let fixture: ComponentFixture<HoteDeTest>;
    let service: LicenceService;

    const etat = (partiel: Partial<EtatLicence>): EtatLicence => ({
        statut: 'ACTIVE',
        actionsOuvertes: true,
        joursRestants: 200,
        modules: [],
        utilisateursMax: 0,
        message: '',
        ...partiel
    });

    const bouton = (): HTMLButtonElement =>
        fixture.nativeElement.querySelector('button') as HTMLButtonElement;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HoteDeTest],
            providers: [provideHttpClient(), provideHttpClientTesting()]
        });
        service = TestBed.inject(LicenceService);
        fixture = TestBed.createComponent(HoteDeTest);
    });

    it("état inconnu : n'entrave rien", () => {
        // Mieux vaut un refus du serveur qu'une application inutilisable parce que le référentiel
        // a mis une seconde de trop à répondre.
        fixture.detectChanges();

        expect(bouton().hasAttribute('disabled')).toBeFalse();
        expect(bouton().classList).not.toContain('licence-suspendue');
    });

    it('actions suspendues : le bouton est désactivé et dit pourquoi', () => {
        service.etat$.next(etat({ statut: 'EXPIREE', actionsOuvertes: false, joursRestants: -3,
            message: 'Votre licence a pris fin le 05/08/2026.' }));
        fixture.detectChanges();

        expect(bouton().hasAttribute('disabled')).toBeTrue();
        expect(bouton().classList).toContain('licence-suspendue');
        expect(bouton().getAttribute('title')).toBe('Votre licence a pris fin le 05/08/2026.');
    });

    it('licence installée : le bouton reprend du service sans recharger la page', () => {
        service.etat$.next(etat({ statut: 'EXPIREE', actionsOuvertes: false }));
        fixture.detectChanges();

        service.etat$.next(etat({ statut: 'ACTIVE', actionsOuvertes: true }));
        fixture.detectChanges();

        expect(bouton().hasAttribute('disabled')).toBeFalse();
        expect(bouton().classList).not.toContain('licence-suspendue');
        expect(bouton().hasAttribute('title')).toBeFalse();
    });
});
