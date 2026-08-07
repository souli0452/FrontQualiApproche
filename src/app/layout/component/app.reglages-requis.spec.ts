import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QualiUrlConfig } from '../../services/quali-url-configs';
import { currentUserState } from '../../services/auth-services/auth.state';
import { AppReglagesRequis } from './app.reglages-requis';

/**
 * Réglages exigés au lancement.
 *
 * <p>Deux règles seulement, mais elles décident de tout : le dialogue ne s'ouvre que si le
 * responsable qualité manque, et il n'est présenté qu'à qui peut y répondre. L'ouvrir devant un agent
 * l'enfermerait sur un formulaire que le serveur lui refuserait.</p>
 */
describe('AppReglagesRequis', () => {
    let component: AppReglagesRequis;
    let fixture: ComponentFixture<AppReglagesRequis>;
    let http: HttpTestingController;

    const RQ_NOM = {
        id: '1', cle: 'RESPONSABLE_QUALITE_NOM', libelle: 'Nom du responsable qualité', valeur: null
    };
    const RQ_EMAIL = {
        id: '2', cle: 'RESPONSABLE_QUALITE_EMAIL', libelle: 'Courriel du responsable qualité',
        valeur: null
    };

    function habiliter(permissions: string[]): void {
        currentUserState.next({ permissions } as any);
    }

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [AppReglagesRequis],
            providers: [provideHttpClient(), provideHttpClientTesting()]
        }).compileComponents();

        fixture = TestBed.createComponent(AppReglagesRequis);
        component = fixture.componentInstance;
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        currentUserState.next(null as any);
    });

    it('exige le responsable qualité quand il manque', () => {
        habiliter(['CONFIG_GLOBAL_MANAGE']);

        component.ngOnInit();
        http.expectOne(QualiUrlConfig.PARAMETRE_ROOT_URL).flush({ data: [RQ_NOM, RQ_EMAIL] });

        expect(component.ouvert).toBeTrue();
    });

    it('ne demande rien quand les deux sont renseignés', () => {
        habiliter(['CONFIG_GLOBAL_MANAGE']);

        component.ngOnInit();
        http.expectOne(QualiUrlConfig.PARAMETRE_ROOT_URL).flush({
            data: [
                { ...RQ_NOM, valeur: 'Awa Traoré' },
                { ...RQ_EMAIL, valeur: 'rq@exemple.fr' }
            ]
        });

        expect(component.ouvert).toBeFalse();
    });

    it('reprend la valeur déjà saisie et ne réclame que celle qui manque', () => {
        habiliter(['CONFIG_GLOBAL_MANAGE']);

        component.ngOnInit();
        http.expectOne(QualiUrlConfig.PARAMETRE_ROOT_URL)
            .flush({ data: [{ ...RQ_NOM, valeur: 'Awa Traoré' }, RQ_EMAIL] });

        expect(component.ouvert).toBeTrue();
        expect(component.formulaire.get('nom')?.value).toBe('Awa Traoré');
        expect(component.formulaire.get('email')?.value).toBe('');
    });

    it('ne demande rien à qui ne peut pas y répondre', () => {
        habiliter(['NC_READ']);

        component.ngOnInit();

        // Aucun appel : l'agent n'a pas la permission de lire ni d'écrire ces réglages.
        http.expectNone(QualiUrlConfig.PARAMETRE_ROOT_URL);
        expect(component.ouvert).toBeFalse();
    });

    it('réglages illisibles : rien n\'est exigé', () => {
        habiliter(['CONFIG_GLOBAL_MANAGE']);

        component.ngOnInit();
        http.expectOne(QualiUrlConfig.PARAMETRE_ROOT_URL)
            .flush('indisponible', { status: 503, statusText: 'Service Unavailable' });

        // Exiger une saisie qu'on ne pourrait pas enregistrer enfermerait l'administrateur.
        expect(component.ouvert).toBeFalse();
    });

    it('enregistre les deux réglages puis se ferme', () => {
        habiliter(['CONFIG_GLOBAL_MANAGE']);
        component.ngOnInit();
        http.expectOne(QualiUrlConfig.PARAMETRE_ROOT_URL).flush({ data: [RQ_NOM, RQ_EMAIL] });

        component.formulaire.patchValue({ nom: 'Awa Traoré', email: 'rq@exemple.fr' });
        component.enregistrer();

        http.expectOne(`${QualiUrlConfig.PARAMETRE_ROOT_URL}/update/1`).flush({ data: RQ_NOM });
        http.expectOne(`${QualiUrlConfig.PARAMETRE_ROOT_URL}/update/2`).flush({ data: RQ_EMAIL });

        expect(component.ouvert).toBeFalse();
    });

    it('reste ouvert si l\'enregistrement échoue', () => {
        habiliter(['CONFIG_GLOBAL_MANAGE']);
        component.ngOnInit();
        http.expectOne(QualiUrlConfig.PARAMETRE_ROOT_URL).flush({ data: [RQ_NOM, RQ_EMAIL] });

        component.formulaire.patchValue({ nom: 'Awa Traoré', email: 'rq@exemple.fr' });
        component.enregistrer();

        // Le premier échec annule le second appel : les deux réglages vont ensemble, un seul écrit
        // laisserait la plateforme à moitié configurée.
        http.expectOne(`${QualiUrlConfig.PARAMETRE_ROOT_URL}/update/1`)
            .flush('refus', { status: 500, statusText: 'Internal Server Error' });

        // Se fermer sur un échec laisserait croire la chose faite.
        expect(component.ouvert).toBeTrue();
    });
});
