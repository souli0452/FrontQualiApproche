import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../environments/environment';
import { LicenceService } from './licence.service';

/**
 * L'état de la licence est lu auprès de la passerelle, jamais du serveur qui sert l'application.
 *
 * <p>L'adresse était écrite en relatif et ne tenait que par le proxy du serveur de développement.
 * Déployée, elle partait sur le domaine du frontal, dont le serveur répond {@code index.html} à
 * toute route inconnue : l'application recevait sa propre page d'accueil à la place de l'état de
 * sa licence. La réponse valait 200 — rien ne ressemblait à une panne — et c'est l'analyse du JSON
 * qui échouait, laissant l'état nul et, avec lui, ni fenêtre d'activation ni réglages requis sur
 * une installation qui n'avait pourtant jamais eu de licence.</p>
 */
describe('LicenceService', () => {

    let service: LicenceService;
    let http: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting()]
        });
        service = TestBed.inject(LicenceService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it("interroge la passerelle, et non le serveur qui sert l'application", () => {
        service.charger().subscribe();

        const appel = http.expectOne(
            `${environment.apiUrl}/referentiel-service/api/v1/licence/etat`);

        // Une adresse relative retomberait sur l'origine du frontal, où seule l'application est
        // servie : c'est ce qui renvoyait index.html.
        expect(appel.request.url.startsWith(environment.apiUrl)).toBeTrue();
        appel.flush({ data: { statut: 'ABSENTE', joursRestants: 0, modules: [] } });
    });

    it("pose la licence sur la même racine", () => {
        service.installer('QSL1.abc.def').subscribe();

        const appel = http.expectOne(`${environment.apiUrl}/referentiel-service/api/v1/licence`);

        expect(appel.request.method).toBe('POST');
        appel.flush({ data: { statut: 'ACTIVE', joursRestants: 30, modules: [] } });
    });

    it("publie l'état reçu, déballé de son enveloppe", () => {
        // Le serveur enveloppe ses réponses : pousser l'enveloppe telle quelle laisserait les
        // écrans lire un statut absent sur une licence pourtant active.
        service.charger().subscribe();

        http.expectOne(`${environment.apiUrl}/referentiel-service/api/v1/licence/etat`)
            .flush({ data: { statut: 'ACTIVE', actionsOuvertes: true, joursRestants: 12, modules: ['NON_CONFORMITE'] } });

        expect(service.etat?.statut).toBe('ACTIVE');
        expect(service.etat?.joursRestants).toBe(12);
    });
});
