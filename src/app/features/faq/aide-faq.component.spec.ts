import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { AideFaqComponent } from './aide-faq.component';
import { EntreeFaq } from './faq.model';

/**
 * Ce que l'aide montre, et dans quel ordre.
 *
 * <p>C'est le seul chemin par lequel un utilisateur ordinaire atteint la FAQ : l'écran de
 * configuration est réservé à qui l'écrit, et l'assistant IA demande un module souscrit, une
 * permission et un fournisseur qui répond. Ce qui se perdrait ici ne se retrouverait nulle
 * part.</p>
 */
describe('AideFaqComponent', () => {

    let component: AideFaqComponent;
    let http: HttpTestingController;

    const entree = (question: string, reponse: string): EntreeFaq =>
        ({ id: question, question, reponse, publiee: true });

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [AideFaqComponent, NoopAnimationsModule],
            providers: [provideHttpClient(), provideHttpClientTesting()]
        }).compileComponents();

        const fixture = TestBed.createComponent(AideFaqComponent);
        component = fixture.componentInstance;
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    /** Charge le composant avec les entrées données. */
    const charger = (entrees: EntreeFaq[]) => {
        component.ngOnInit();
        http.expectOne((requete) => requete.url.includes('faq/publiees')).flush(entrees);
    };

    it("l'ordre est celui du serveur, qui est celui de l'écriture", () => {
        // Le serveur rend les entrées dans leur ordre de création ; les trier ici le défairait
        // sans que personne ne l'ait demandé.
        charger([
            entree('Comment déclarer ?', 'Par la fiche.'),
            entree('Qui vise ?', 'Le pilote.')
        ]);

        expect(component.visibles.map((e) => e.question))
            .toEqual(['Comment déclarer ?', 'Qui vise ?']);
    });

    it('la recherche porte aussi sur la réponse, pas seulement sur la question', () => {
        charger([
            entree('Qui vise une procédure ?', 'Le pilote, puis la qualité.'),
            entree('Comment déclarer ?', 'Par la fiche de constat.')
        ]);

        // « pilote » n'apparaît que dans une réponse : on cherche souvent avec un mot du contenu.
        component.recherche = 'pilote';
        component.filtrer();

        expect(component.visibles.length).toBe(1);
        expect(component.visibles[0].question).toBe('Qui vise une procédure ?');
    });

    it('une recherche sans résultat vide les rubriques sans perdre les entrées', () => {
        charger([entree('Qui vise ?', 'Le pilote.')]);

        component.recherche = 'absent';
        component.filtrer();

        expect(component.visibles).toEqual([]);
        // Les entrées restent en mémoire : effacer la recherche les fait revenir sans rappeler
        // le serveur.
        expect(component.toutes.length).toBe(1);
    });

    it("une aide indisponible se présente vide, sans message d'erreur alarmant", () => {
        component.ngOnInit();
        http.expectOne(() => true).flush('panne', { status: 500, statusText: 'Server Error' });

        expect(component.chargement).toBeFalse();
        expect(component.toutes).toEqual([]);
        expect(component.visibles).toEqual([]);
    });
});
