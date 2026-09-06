import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../../environments/environment';
import { LicenceService } from './licence.service';

describe('LicenceService', () => {
    let service: LicenceService;
    let http: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                LicenceService,
                provideHttpClient(),
                provideHttpClientTesting()
            ]
        });
        service = TestBed.inject(LicenceService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('interroge le référentiel pour son état', () => {
        service.charger().subscribe();

        const appel = http.expectOne(
            `${environment.apiUrl}/referentiel-service/api/v1/licence/etat`);
        expect(appel.request.method).toBe('GET');
        appel.flush({ statut: 'ACTIVE', actionsOuvertes: true, joursRestants: 10, message: 'Active' });
    });

    it("pose la licence sur la même racine", () => {
        service.installer('LICENCE-TEST').subscribe();

        const appel = http.expectOne(`${environment.apiUrl}/referentiel-service/api/v1/licence`);
        expect(appel.request.method).toBe('POST');
        expect(appel.request.body).toEqual({ licence: 'LICENCE-TEST' });
        appel.flush({ statut: 'ACTIVE', actionsOuvertes: true, joursRestants: 30, message: 'Active' });
    });
});
