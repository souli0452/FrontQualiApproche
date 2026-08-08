import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MessageService } from 'primeng/api';

import { EtatLicence, LicenceService } from '../../services/licence.service';
import { LicenceDialogComponent } from './licence-dialog.component';

/**
 * Ce que la licence ferme, et ce qu'elle ne ferme pas.
 *
 * <p>La fenêtre était modale et infermable dès que les actions étaient suspendues — donc aussi à
 * l'expiration, où elle bloquait l'application entière tout en affichant, dans la même vue, que
 * « vos données restent consultables et exportables ». La contradiction tenait dans un écran.</p>
 *
 * <p>Ces cas fixent la règle : seule l'absence de licence justifie de tout arrêter. Une licence
 * échue se dit par un bandeau, et l'utilisateur continue de consulter — la passerelle, elle,
 * refuse les écritures en 402.</p>
 */
describe('LicenceDialogComponent', () => {

    let fixture: ComponentFixture<LicenceDialogComponent>;
    let composant: LicenceDialogComponent;

    const etat = (partiel: Partial<EtatLicence>): EtatLicence => ({
        statut: 'ACTIVE',
        actionsOuvertes: true,
        joursRestants: 200,
        modules: ['NON_CONFORMITE'],
        utilisateursMax: 0,
        essaiDisponible: false,
        message: '',
        ...partiel
    });

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [LicenceDialogComponent],
            providers: [provideHttpClient(), provideHttpClientTesting(), provideNoopAnimations(),
                MessageService]
        });
        // Sans `detectChanges`, `ngOnInit` ne s'exécute pas : le composant est examiné sur l'état
        // qu'on lui pose, sans appel au serveur.
        fixture = TestBed.createComponent(LicenceDialogComponent);
        composant = fixture.componentInstance;
    });

    it("sans licence, s'impose et ne se ferme pas", () => {
        composant.etat = etat({ statut: 'ABSENTE', actionsOuvertes: false, joursRestants: 0,
            modules: [], essaiDisponible: true });

        expect(composant.doitSAfficher).toBeTrue();
        expect(composant.estFermable).toBeFalse();
        expect(composant.bandeau).toBeFalse();
        expect(composant.titre).toBe('Activer QualiSira');
    });

    it("licence expirée : un bandeau, pas une fenêtre qui bloque la consultation", () => {
        composant.etat = etat({ statut: 'EXPIREE', actionsOuvertes: false, joursRestants: -12 });

        expect(composant.doitSAfficher).toBeFalse();
        expect(composant.bandeau).toBeTrue();
        expect(composant.bandeauClasse).toContain('red');
    });

    it("essai en cours : annoncé en permanence, et en orange", () => {
        composant.etat = etat({ type: 'ESSAI', joursRestants: 5 });

        // Le bandeau paraît même si le terme n'est pas proche : découvrir l'essai le jour où il
        // s'arrête fait passer l'arrêt pour une panne. En orange, comme un terme proche — le bleu
        // se lisait comme une information sans conséquence.
        expect(composant.bandeau).toBeTrue();
        expect(composant.bandeauClasse).toContain('orange');
        expect(composant.bandeauIcone).toContain('clock');
        expect(composant.titre).toBe('Essai gratuit en cours');
    });

    it('licence commerciale au long cours : ni fenêtre ni bandeau', () => {
        composant.etat = etat({ type: 'COMMERCIALE', joursRestants: 200 });

        expect(composant.doitSAfficher).toBeFalse();
        expect(composant.bandeau).toBeFalse();
    });

    it("terme proche : un bandeau d'avertissement, le travail continue", () => {
        composant.etat = etat({ type: 'COMMERCIALE', joursRestants: 12 });

        expect(composant.doitSAfficher).toBeFalse();
        expect(composant.bandeau).toBeTrue();
        expect(composant.bandeauClasse).toContain('orange');
    });

    it("le menu « Configurations » l'ouvre, licence en cours", () => {
        const service = TestBed.inject(LicenceService);
        composant.ngOnInit();
        composant.etat = etat({ type: 'COMMERCIALE', joursRestants: 200 });

        // Rien ne s'affichait jusque-là : la licence court, il n'y a rien à signaler. C'est
        // l'entrée de menu qui demande l'ouverture, pour renouveler avant le terme.
        expect(composant.doitSAfficher).toBeFalse();

        service.demanderOuverture();

        expect(composant.doitSAfficher).toBeTrue();
        expect(composant.estFermable).toBeTrue();
    });

    it("ouverte depuis le bandeau, elle se referme et rend la main", () => {
        composant.etat = etat({ type: 'COMMERCIALE', joursRestants: 12 });
        composant.forcerOuverture();

        expect(composant.visible).toBeTrue();
        expect(composant.estFermable).toBeTrue();
        expect(composant.titre).toBe('Licence de cette installation');

        composant.fermer();

        // `visible` autant que `doitSAfficher` : c'est le champ que lit la fenêtre. Il était
        // calculé dans le gabarit sur un `[visible]` figé, et le bouton de fermeture restait
        // sans effet — PrimeNG refermait de son côté, la condition rouvrait dans la foulée.
        expect(composant.visible).toBeFalse();
        expect(composant.doitSAfficher).toBeFalse();
        expect(composant.bandeau).toBeTrue();
    });

    it("un essai en cours se referme aussi : rien n'oblige à le regarder", () => {
        composant.etat = etat({ type: 'ESSAI', joursRestants: 5 });
        composant.forcerOuverture();

        expect(composant.visible).toBeTrue();
        expect(composant.estFermable).toBeTrue();

        composant.fermer();

        expect(composant.visible).toBeFalse();
    });

    it("sans licence, la fermeture ne rend pas la main : il n'y a rien d'autre à faire", () => {
        composant.etat = etat({ statut: 'ABSENTE', actionsOuvertes: false, modules: [] });
        composant.fermer();

        expect(composant.visible).toBeTrue();
    });
});
