import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MessageService } from 'primeng/api';

import { FaqFormComponent } from './faq-form.component';

/**
 * La saisie d'une question, en pleine page.
 *
 * <p>Ce qui s'écrit ici sera repris mot pour mot par l'assistant IA et affiché dans l'aide : ces
 * cas éprouvent ce qui protège l'enregistrement — les bornes du serveur vérifiées avant
 * l'aller-retour, et le dépôt des pièces qui ne perd pas la réponse quand il échoue.</p>
 */
describe('FaqFormComponent', () => {

    let component: FaqFormComponent;
    let http: HttpTestingController;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [FaqFormComponent, NoopAnimationsModule],
            // AlertService signale ses messages par toast : sans MessageService, l'injecteur
            // refuse de construire le composant avant tout cas de test.
            providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), MessageService]
        }).compileComponents();

        const fixture = TestBed.createComponent(FaqFormComponent);
        component = fixture.componentInstance;
        http = TestBed.inject(HttpTestingController);
        component.ngOnInit();
    });

    afterEach(() => http.verify());

    it('une question publiée par défaut : le cas courant ne demande rien', () => {
        expect(component.entree.publiee).toBeTrue();
        expect(component.modification).toBeFalse();
    });

    it('refuse une saisie incomplète sans appeler le serveur', () => {
        expect(component.estValide()).toBeFalse();

        component.entree.question = 'Qui vise ?';
        expect(component.estValide()).toBeFalse();

        component.entree.reponse = 'Le pilote.';
        expect(component.estValide()).toBeTrue();
    });

    it('refuse des espaces seuls : une réponse vide passerait la validation du navigateur', () => {
        component.entree.question = '   ';
        component.entree.reponse = '   ';

        expect(component.estValide()).toBeFalse();
    });

    it('refuse au-delà des bornes du serveur, avant l\'aller-retour', () => {
        component.entree.question = 'q'.repeat(301);
        component.entree.reponse = 'Le pilote.';
        expect(component.estValide()).toBeFalse();

        component.entree.question = 'Qui vise ?';
        component.entree.reponse = 'r'.repeat(1501);
        expect(component.estValide()).toBeFalse();
    });

    it('enregistre la fiche seule quand aucune pièce n\'est jointe', () => {
        component.entree.question = 'Qui vise ?';
        component.entree.reponse = 'Le pilote.';

        component.enregistrer();

        const requete = http.expectOne((r) => r.url.includes('/faq/create'));
        // Les espaces de saisie ne partent pas au serveur.
        expect(requete.request.body.question).toBe('Qui vise ?');
        requete.flush({ data: { id: 'faq-1' } });

        // Aucun dépôt n'est tenté : il n'y a rien à joindre.
        http.expectNone((r) => r.url.includes('/fichiers'));
    });

    it('dépose les pièces après la fiche, jamais avant', () => {
        component.entree.question = 'Qui vise ?';
        component.entree.reponse = 'Le pilote.';
        component.recevoirFichiers([new File(['x'], 'procedure.pdf')]);

        component.enregistrer();

        // Une pièce ne s'attache qu'à une entrée qui existe : la fiche part d'abord.
        http.expectOne((r) => r.url.includes('/faq/create')).flush({ data: { id: 'faq-1' } });
        const depot = http.expectOne((r) => r.url.includes('/faq/faq-1/fichiers'));
        expect(depot.request.body instanceof FormData).toBeTrue();
        depot.flush([]);
    });

    it('un dépôt en échec ne perd pas la réponse déjà enregistrée', () => {
        component.entree.question = 'Qui vise ?';
        component.entree.reponse = 'Le pilote.';
        component.recevoirFichiers([new File(['x'], 'procedure.pdf')]);

        component.enregistrer();
        http.expectOne((r) => r.url.includes('/faq/create')).flush({ data: { id: 'faq-1' } });
        // 503 : l'installation n'a pas de serveur de fichiers. La fiche, elle, est enregistrée.
        http.expectOne((r) => r.url.includes('/fichiers'))
            .flush('indisponible', { status: 503, statusText: 'Service Unavailable' });

        expect(component.enregistrement).toBeFalse();
    });
});
