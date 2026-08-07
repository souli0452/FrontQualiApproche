import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ParametresComponent } from './parametres.component';

/**
 * Écran des réglages de l'organisation.
 *
 * <p>Deux règles portent cet écran. La clé fait l'identité d'un réglage et ne se modifie pas : la
 * laisser saisissable aurait laissé croire au renommage, que le serveur refuse en 409. Et l'écran ne
 * crée ni ne supprime : seules les clés que le code cite sont lues, elles sont semées au démarrage, et
 * une clé retirée ne reviendrait qu'au redémarrage du référentiel — vide.</p>
 */
describe('ParametresComponent', () => {
    let component: ParametresComponent;
    let fixture: ComponentFixture<ParametresComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ParametresComponent],
            providers: [provideHttpClient(), provideHttpClientTesting()]
        }).compileComponents();

        fixture = TestBed.createComponent(ParametresComponent);
        component = fixture.componentInstance;
    });

    it('se crée', () => {
        expect(component).toBeTruthy();
    });

    it('fige la clé du réglage ouvert', () => {
        component.ouvrirModification({
            id: '1', cle: 'CONTACT_EMAIL', libelle: 'Courriel de contact', valeur: 'a@b.fr'
        });

        expect(component.formulaire.get('cle')?.disabled).toBeTrue();
    });

    it('n\'offre ni création ni suppression', () => {
        // Une clé que le code ne cite pas ne serait lue par personne, et une clé retirée priverait ce
        // qui la lit : l'écran ne doit laisser croire ni l'un ni l'autre.
        const ecran = component as unknown as Record<string, unknown>;
        expect(ecran['ouvrirCreation']).toBeUndefined();
        expect(ecran['confirmerSuppression']).toBeUndefined();
    });

    it('renvoie la clé au serveur même désactivée', () => {
        // `value` omettrait un champ désactivé : le serveur y verrait une clé absente.
        component.ouvrirModification({
            id: '1', cle: 'CONTACT_EMAIL', libelle: 'Courriel de contact', valeur: 'a@b.fr'
        });
        expect(component.formulaire.getRawValue().cle).toBe('CONTACT_EMAIL');
    });
});
