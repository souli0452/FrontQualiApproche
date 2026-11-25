import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ConfirmationService, MessageService } from 'primeng/api';

import { currentUserState } from '@core/auth/auth.state';
import { FaqComponent } from './faq.component';

/**
 * La liste des questions : mode administration (onglets, publication) et mode consultation
 * lecture seule pour les utilisateurs sans droit d'administration, avec aperçu des pièces jointes.
 */
describe('FaqComponent', () => {

    let fixture: ComponentFixture<FaqComponent>;
    let component: FaqComponent;
    let http: HttpTestingController;

    beforeEach(async () => {
        currentUserState.next({ permissions: ['faq-read'] } as any);

        await TestBed.configureTestingModule({
            imports: [FaqComponent, NoopAnimationsModule],
            providers: [
                provideHttpClient(), provideHttpClientTesting(), provideRouter([]),
                MessageService, ConfirmationService
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(FaqComponent);
        component = fixture.componentInstance;
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        http.verify();
        currentUserState.next(null as any);
    });

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

        expect(component.peutAdministrer).toBeTrue();
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

    it('le sens de la publication suit l\'onglet : on ne publie pas depuis les publiées', () => {
        demarrer();
        component.peutPublier = true;
        component.selection = [{ id: 'a', publiee: true }];

        component.publierLaSelection();

        // Depuis les publiées, l'action retire. Un troisième bouton aurait laissé croire qu'on
        // peut publier ce qui l'est déjà.
        const requete = http.expectOne((r) => r.url.includes('/faq/publication'));
        expect(requete.request.body).toEqual({ ids: ['a'], publiee: false });
        requete.flush({ data: 1 });
        http.expectOne((r) => r.url.endsWith('/faq')).flush({ content: [], totalElements: 0 });
        http.expectOne((r) => r.url.includes('/comptes')).flush({ data: {} });
    });

    it('depuis les non publiées, le lot publie', () => {
        demarrer();
        component.changerDOnglet('nonPubliees');
        http.expectOne((r) => r.url.endsWith('/faq')).flush({ content: [], totalElements: 0 });
        component.selection = [{ id: 'a' }, { id: 'b' }];

        component.publierLaSelection();

        const requete = http.expectOne((r) => r.url.includes('/faq/publication'));
        expect(requete.request.body).toEqual({ ids: ['a', 'b'], publiee: true });
        requete.flush({ data: 2 });
        http.expectOne((r) => r.url.endsWith('/faq')).flush({ content: [], totalElements: 0 });
        http.expectOne((r) => r.url.includes('/comptes')).flush({ data: {} });
    });

    it("changer d'onglet vide la sélection", () => {
        demarrer();
        component.selection = [{ id: 'a' }];

        component.changerDOnglet('nonPubliees');
        http.expectOne((r) => r.url.endsWith('/faq')).flush({ content: [], totalElements: 0 });

        // Les lignes cochées appartenaient à l'autre onglet : agir dessus porterait sur ce qu'on
        // ne voit plus.
        expect(component.selection).toEqual([]);
    });

    it('une sélection vide ne déclenche aucun appel', () => {
        demarrer();
        component.selection = [];

        component.publierLaSelection();

        http.expectNone(() => true);
    });

    it('le détail est demandé au serveur : la liste ne porte pas les pièces jointes', () => {
        demarrer();

        component.voirLeDetail({ id: 'a', question: 'Qui vise ?' });

        expect(component.detailVisible).toBeTrue();
        http.expectOne((r) => r.url.includes('/faq/get/a'))
            .flush({ data: { id: 'a', question: 'Qui vise ?', fichiers: [{ nom: 'p.pdf' }] } });
        expect(component.detail?.fichiers?.length).toBe(1);
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

    it('bascule en consultation lecture seule (/faq/publiees) sans droit d’administration', () => {
        currentUserState.next({ permissions: ['nc-read'] } as any);

        component.ngOnInit();

        expect(component.peutAdministrer).toBeFalse();
        const requete = http.expectOne((r) => r.url.endsWith('/faq/publiees'));
        requete.flush({
            data: [
                { id: '1', question: 'Qui vise une procédure ?', reponse: 'Le pilote puis le RQ.' },
                { id: '2', question: 'Où trouver le logigramme ?', reponse: 'Voir image jointe.', fichiers: [{ id: 'f1', nom: 'schema.png' }] }
            ]
        });

        expect(component.questionsConsultables.length).toBe(2);

        component.rechercheConsultation = 'logigramme';
        component.filtrerConsultation();
        expect(component.questionsConsultables.map((q) => q.id)).toEqual(['2']);
    });

    it('ouvre une image/pièce jointe dans la visionneuse et adapte les icônes', () => {
        fixture.detectChanges();
        http.expectOne((r) => r.url.endsWith('/faq') && r.params.get('publiee') === 'true')
            .flush({ content: [], totalElements: 0 });
        http.expectOne((r) => r.url.includes('/faq/comptes'))
            .flush({ data: { publiees: 0, nonPubliees: 0 } });

        const openBlobSpy = spyOn(component.lightbox!, 'openBlob');

        expect(component.iconeFichier({ nom: 'capture.png' })).toBe('pi-image');
        expect(component.iconeFichier({ nom: 'guide.pdf' })).toBe('pi-file-pdf');

        component.ouvrirPiece({ id: 'f1', nom: 'capture.png' }, 'Qui vise ?');

        const req = http.expectOne((r) => r.url.endsWith('/faq/fichiers/f1'));
        expect(req.request.responseType).toBe('blob');
        const blob = new Blob(['img'], { type: 'image/png' });
        req.flush(blob);

        expect(openBlobSpy).toHaveBeenCalledOnceWith(blob, 'capture.png', 'Qui vise ?');
        expect(component.fichierEnCoursId).toBeUndefined();
    });

    it('isole l’action Supprimer par un séparateur et le style destructif', () => {
        demarrer();
        component.peutEcrire = true;

        const items = component.actionsDeLaLigne({ id: '1', question: 'Test', publiee: true });
        const idxSupprimer = items.findIndex((i) => i.label === 'Supprimer');

        expect(idxSupprimer).toBeGreaterThan(0);
        expect(items[idxSupprimer - 1].separator).toBeTrue();
        expect(items[idxSupprimer].styleClass).toBe('delete-menu-item');
    });
});
