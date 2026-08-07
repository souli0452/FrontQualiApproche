import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ModuleAbonnement } from '../../../enums/enums';
import { currentUserState } from '../../../services/auth-services/auth.state';
import { IndicateursComponent } from './indicateurs.component';

/**
 * Indicateurs de l'accueil.
 *
 * <p>Trois exigences : ne montrer que ce à quoi la personne a accès, ne rien afficher qu'on ne sait
 * pas encore — un zéro affiché pendant le chargement se lit « rien à faire » —, et ne colorer en
 * rouge que ce qui appelle une action.</p>
 */
describe('IndicateursComponent', () => {
    let component: IndicateursComponent;
    let fixture: ComponentFixture<IndicateursComponent>;
    let http: HttpTestingController;

    function connecter(permissions: string[], modules: string[]): void {
        currentUserState.next({ permissions, modulesSubscribed: modules } as any);
    }

    function cles(): string[] {
        return component.indicateurs.map((indicateur) => indicateur.cle);
    }

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [IndicateursComponent],
            providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
        }).compileComponents();

        fixture = TestBed.createComponent(IndicateursComponent);
        component = fixture.componentInstance;
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        currentUserState.next(null as any);
    });

    it('n\'affiche aucun indicateur à qui n\'a ni module ni permission', () => {
        connecter([], []);

        component.ngOnInit();

        expect(component.indicateurs).toEqual([]);
        // Et rien n'est demandé au serveur pour l'apprendre.
        http.expectNone(() => true);
    });

    it('sans le module documentaire, aucun indicateur documentaire', () => {
        connecter(['NC_READ', 'TRAITEMENT_PLAN'], [ModuleAbonnement.NON_CONFORMITE]);
        component.suitDesActions = true;

        component.ngOnInit();

        expect(cles()).toEqual(['enAttente', 'retard', 'proche']);
        http.expectNone((requete) => requete.url.includes('statistics'));
    });

    it('sans actions correctives suivies, pas d\'indicateur de retard', () => {
        connecter(['DOC_READ'], [ModuleAbonnement.DOCUMENTAIRE]);
        component.suitDesActions = false;

        component.ngOnInit();
        http.match(() => true).forEach((requete) => requete.flush({ data: {} }));

        expect(cles()).toEqual(['enAttente', 'revision', 'fonds']);
    });

    it('reprend le retard de révision que le module documentaire déclare', () => {
        connecter(['DOC_READ'], [ModuleAbonnement.DOCUMENTAIRE]);
        component.ngOnInit();

        http.expectOne(() => true).flush({
            data: { totalDocuments: 128, documentsEnRetardRevision: 3 }
        });

        const revision = component.indicateurs.find((i) => i.cle === 'revision');
        expect(revision?.valeur).toBe(3);
        // Un retard de révision est un constat d'audit : il se voit.
        expect(revision?.ton).toBe('alerte');
        expect(component.indicateurs.find((i) => i.cle === 'fonds')?.valeur).toBe(128);
    });

    it('statistiques indisponibles : un tiret, pas un zéro', () => {
        connecter(['DOC_READ'], [ModuleAbonnement.DOCUMENTAIRE]);
        component.ngOnInit();

        http.expectOne(() => true).flush('erreur', { status: 500, statusText: 'Server Error' });

        // Un zéro affirmerait qu'aucun document n'est en retard de révision.
        expect(component.indicateurs.find((i) => i.cle === 'revision')?.valeur).toBeNull();
    });

    it('aucun retard : le ton reste neutre', () => {
        connecter(['TRAITEMENT_PLAN'], [ModuleAbonnement.NON_CONFORMITE]);
        component.suitDesActions = true;
        component.plansEnRetard = 0;
        component.plansEcheanceProche = 0;
        component.ngOnInit();

        expect(component.indicateurs.find((i) => i.cle === 'retard')?.ton).toBe('neutre');
    });

    it('un retard d\'action est en alerte, une échéance proche en attention', () => {
        connecter(['TRAITEMENT_PLAN'], [ModuleAbonnement.NON_CONFORMITE]);
        component.suitDesActions = true;
        component.plansEnRetard = 2;
        component.plansEcheanceProche = 4;
        component.ngOnInit();

        expect(component.indicateurs.find((i) => i.cle === 'retard')?.ton).toBe('alerte');
        expect(component.indicateurs.find((i) => i.cle === 'proche')?.ton).toBe('attention');
    });
});
