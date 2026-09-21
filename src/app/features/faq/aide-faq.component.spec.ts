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

    const entree = (question: string, reponse: string, categorie?: string): EntreeFaq =>
        ({ id: question, question, reponse, categorie, publiee: true });

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

    const titres = () => component.rubriques.map((r) => r.titre);

    it('regroupe les réponses par rubrique', () => {
        charger([
            entree('Qui vise ?', 'Le pilote.', 'Documents'),
            entree('Quel délai ?', 'Huit jours.', 'Documents'),
            entree('Comment déclarer ?', 'Par la fiche.', 'Non-conformités')
        ]);

        expect(titres()).toEqual(['Documents', 'Non-conformités']);
        expect(component.rubriques[0].entrees.length).toBe(2);
    });

    it("l'ordre des rubriques suit celui du serveur, et non l'alphabet", () => {
        // Le rang est décidé par l'administrateur et le serveur rend les entrées dans cet ordre :
        // un tri alphabétique à l'écran le défairait en silence.
        charger([
            entree('Comment déclarer ?', 'Par la fiche.', 'Non-conformités'),
            entree('Qui vise ?', 'Le pilote.', 'Documents')
        ]);

        expect(titres()).toEqual(['Non-conformités', 'Documents']);
    });

    it('une question sans rubrique reste lisible sous un intitulé de repli', () => {
        charger([entree('Qui contacter ?', 'Votre responsable qualité.')]);

        expect(titres()).toEqual(['Questions générales']);
    });

    it('la recherche porte aussi sur la réponse, pas seulement sur la question', () => {
        charger([
            entree('Qui vise une procédure ?', 'Le pilote, puis la qualité.', 'Documents'),
            entree('Comment déclarer ?', 'Par la fiche de constat.', 'Non-conformités')
        ]);

        // « pilote » n'apparaît que dans une réponse : on cherche souvent avec un mot du contenu.
        component.recherche = 'pilote';
        component.filtrer();

        expect(component.rubriques.length).toBe(1);
        expect(component.rubriques[0].entrees[0].question).toBe('Qui vise une procédure ?');
    });

    it('une recherche sans résultat vide les rubriques sans perdre les entrées', () => {
        charger([entree('Qui vise ?', 'Le pilote.', 'Documents')]);

        component.recherche = 'absent';
        component.filtrer();

        expect(component.rubriques).toEqual([]);
        // Les entrées restent en mémoire : effacer la recherche les fait revenir sans rappeler
        // le serveur.
        expect(component.toutes.length).toBe(1);
    });

    it("une aide indisponible se présente vide, sans message d'erreur alarmant", () => {
        component.ngOnInit();
        http.expectOne(() => true).flush('panne', { status: 500, statusText: 'Server Error' });

        expect(component.chargement).toBeFalse();
        expect(component.toutes).toEqual([]);
        expect(component.rubriques).toEqual([]);
    });
});
