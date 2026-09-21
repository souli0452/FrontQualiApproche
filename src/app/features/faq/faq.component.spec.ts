import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ConfirmationService, MessageService } from 'primeng/api';

import { FaqComponent } from './faq.component';

/**
 * La liste des questions, et ses deux onglets.
 *
 * <p>Le partage entre publiées et non publiées est servi par le serveur, et ces cas gardent
 * cette décision : une page de dix lignes filtrée dans le navigateur en laisserait trois, et la
 * pagination mentirait sur ce qui reste à lire.</p>
 */
describe('FaqComponent', () => {

    let component: FaqComponent;
    let http: HttpTestingController;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [FaqComponent, NoopAnimationsModule],
            providers: [
                provideHttpClient(), provideHttpClientTesting(), provideRouter([]),
                MessageService, ConfirmationService
            ]
        }).compileComponents();

        const fixture = TestBed.createComponent(FaqComponent);
        component = fixture.componentInstance;
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    /** Répond à la page et aux comptes demandés au chargement. */
    const demarrer = (publiees = 0, nonPubliees = 0) => {
        component.ngOnInit();
        http.expectOne((r) => r.url.endsWith('/faq') && r.params.get('publiee') === 'true')
            .flush({ content: [], totalElements: 0 });
        http.expectOne((r) => r.url.includes('/faq/comptes'))
            .flush({ data: { publiees, nonPubliees } });
    };

    it("s'ouvre sur les publiées : c'est ce qu'on vient voir", () => {
        demarrer();

        expect(component.onglet).toBe('publiees');
    });

    it('les comptes alimentent les pastilles des onglets', () => {
        demarrer(12, 3);

        expect(component.comptePubliees).toBe(12);
        expect(component.compteNonPubliees).toBe(3);
    });

    it("changer d'onglet demande l'autre côté au serveur", () => {
        demarrer();

        component.changerDOnglet('nonPubliees');

        // Le filtre part au serveur : le navigateur ne trie pas une page déjà découpée.
        http.expectOne((r) => r.url.endsWith('/faq') && r.params.get('publiee') === 'false')
            .flush({ content: [], totalElements: 0 });
        expect(component.onglet).toBe('nonPubliees');
    });

    it("changer d'onglet repart de la première page", () => {
        demarrer();
        component.currentPage = 3;

        component.changerDOnglet('nonPubliees');

        // Rester à la page trois montrerait une liste vide dès que l'autre onglet en compte
        // moins, et l'on chercherait ce qui n'a jamais manqué.
        const requete = http.expectOne((r) => r.url.endsWith('/faq'));
        expect(requete.request.params.get('page')).toBe('0');
        requete.flush({ content: [], totalElements: 0 });
        expect(component.currentPage).toBe(0);
    });

    it("rester sur le même onglet ne relance rien", () => {
        demarrer();

        component.changerDOnglet('publiees');

        http.expectNone(() => true);
    });

    it('un compte indisponible laisse la liste utilisable', () => {
        component.ngOnInit();
        http.expectOne((r) => r.url.endsWith('/faq')).flush({ content: [], totalElements: 0 });
        http.expectOne((r) => r.url.includes('/comptes'))
            .flush('panne', { status: 500, statusText: 'Server Error' });

        // Les onglets restent, sans leur pastille : un compte manquant n'empêche pas de
        // travailler.
        expect(component.comptePubliees).toBe(0);
        expect(component.onglet).toBe('publiees');
    });
});
