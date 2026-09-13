import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ModuleAbonnement } from '../../../enums/enums';
import { currentUserState } from '@core/auth';
import { ActionsRapidesComponent } from './actions-rapides.component';

/**
 * Actions rapides de l'accueil.
 *
 * <p>Une tuile ne doit apparaître que si son écran s'ouvrira : elle porte les mêmes permissions et le
 * même module que le garde de la route. Promettre une action qui finit en refus fait chercher une
 * panne là où il n'y a qu'une habilitation manquante.</p>
 */
describe('ActionsRapidesComponent', () => {
    let component: ActionsRapidesComponent;
    let fixture: ComponentFixture<ActionsRapidesComponent>;

    function connecter(permissions: string[], modules: string[]): void {
        currentUserState.next({ permissions, modulesSubscribed: modules } as any);
    }

    function libelles(): string[] {
        return component.actions.map((action) => action.libelle);
    }

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ActionsRapidesComponent],
            providers: [provideRouter([])]
        }).compileComponents();

        fixture = TestBed.createComponent(ActionsRapidesComponent);
        component = fixture.componentInstance;
    });

    afterEach(() => {
        currentUserState.next(null as any);
    });

    it('n\'offre rien à qui n\'a ni module ni permission', () => {
        connecter([], []);

        component.ngOnInit();

        // Et le gabarit ne rend alors aucun cadre : un bloc « Actions rapides » vide ne rend service
        // à personne.
        expect(component.actions).toEqual([]);
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('button')).toBeNull();
    });

    it('n\'offre la déclaration d\'un écart qu\'à qui peut en déclarer', () => {
        connecter(['NC_READ'], [ModuleAbonnement.NON_CONFORMITE]);
        component.ngOnInit();
        expect(libelles()).not.toContain('Déclarer une non-conformité');

        connecter(['SUBMIT_NC'], [ModuleAbonnement.NON_CONFORMITE]);
        component.ngOnInit();
        expect(libelles()).toContain('Déclarer une non-conformité');
    });

    it('le dépôt d\'un document exige l\'écriture, sa consultation la seule lecture', () => {
        connecter(['DOC_READ'], [ModuleAbonnement.DOCUMENTAIRE]);
        component.ngOnInit();

        expect(libelles()).toContain('Consulter la documentation');
        expect(libelles()).toContain('Demander une modification');
        // Ne pas pouvoir modifier soi-même est précisément la raison d'en faire la demande.
        expect(libelles()).not.toContain('Déposer un document');
    });

    it('sans abonnement, aucune tuile du module — la permission n\'y suffit pas', () => {
        connecter(['document-write', 'SUBMIT_NC', 'TRAITEMENT_PLAN'], []);

        component.ngOnInit();

        expect(component.actions).toEqual([]);
    });

    it('chaque tuile mène à une route absolue', () => {
        connecter(['document-write', 'DOC_READ', 'SUBMIT_NC', 'NC_READ', 'TRAITEMENT_PLAN'],
            [ModuleAbonnement.DOCUMENTAIRE, ModuleAbonnement.NON_CONFORMITE]);

        component.ngOnInit();

        expect(component.actions.length).toBe(6);
        component.actions.forEach((action) => expect(action.route.startsWith('/')).toBeTrue());
    });
});
