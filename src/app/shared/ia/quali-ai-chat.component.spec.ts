import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Router, provideRouter } from '@angular/router';

import { QualiAiChatComponent } from './quali-ai-chat.component';

/**
 * Le fil de discussion avec l'assistant.
 *
 * <p>Une exigence tient tout l'écran : on doit voir <b>sa question</b> et <b>la réponse</b>. La
 * question paraît dès l'envoi — attendre la génération pour l'afficher donnerait l'impression que
 * le clic n'a rien fait —, l'attente prend la forme de la réponse à venir, et rien de tout cela
 * ne passe par le voile global de l'application.</p>
 */
describe('QualiAiChatComponent', () => {
    let component: QualiAiChatComponent;
    let fixture: ComponentFixture<QualiAiChatComponent>;
    let http: HttpTestingController;

    /** Ce que l'écran donne à lire, texte brut — c'est le seul juge utile ici. */
    function texteAffiche(): string {
        fixture.detectChanges();
        return (fixture.nativeElement as HTMLElement).textContent ?? '';
    }

    function requeteDeConversation() {
        return http.expectOne((r) => r.url.includes('/ia/conversation'));
    }

    /** Le catalogue part au ngOnInit : chaque essai doit y répondre avant de poursuivre. */
    function servirLeCatalogue() {
        http.expectOne((r) => r.url.endsWith('/ia/questions')).flush({
            message: 'ok',
            statusCode: 200,
            data: [{ code: 'CE_QUI_M_ATTEND', libelle: "Qu'est-ce qui m'attend ?", description: 'Vos dossiers.' }]
        });
    }

    beforeEach(async () => {
        sessionStorage.clear();
        await TestBed.configureTestingModule({
            imports: [QualiAiChatComponent],
            // p-message s'anime : sans fournisseur d'animations, son rendu lève NG05105.
            providers: [provideHttpClient(), provideHttpClientTesting(), provideNoopAnimations(), provideRouter([])]
        }).compileComponents();

        fixture = TestBed.createComponent(QualiAiChatComponent);
        component = fixture.componentInstance;
        http = TestBed.inject(HttpTestingController);
        fixture.detectChanges();
        servirLeCatalogue();
    });

    afterEach(() => {
        http.verify();
        sessionStorage.clear();
    });

    it("affiche la question dès l'envoi, avant même que la réponse n'arrive", () => {
        component.saisie = 'Comment formuler un constat ?';
        component.envoyer();

        expect(texteAffiche()).toContain('Comment formuler un constat ?');
        expect(texteAffiche()).toContain("L'assistant rédige");

        requeteDeConversation().flush({
            message: 'ok',
            statusCode: 200,
            data: { conversationId: 'c-1', reponse: 'Décrivez le fait observé.', avertissement: 'Assistant IA', messagesRestants: 38 }
        });
    });

    it('montre ensuite la question et la réponse, toutes deux', () => {
        component.saisie = 'Comment formuler un constat ?';
        component.envoyer();
        requeteDeConversation().flush({
            message: 'ok',
            statusCode: 200,
            data: { conversationId: 'c-1', reponse: 'Décrivez le fait observé.', avertissement: 'Assistant IA', messagesRestants: 38 }
        });

        const affiche = texteAffiche();
        expect(affiche).toContain('Comment formuler un constat ?');
        expect(affiche).toContain('Décrivez le fait observé.');
        expect(affiche).not.toContain("L'assistant rédige");
    });

    it("n'appelle pas le voile global : la requête porte X-Skip-Loader", () => {
        component.saisie = 'Une question';
        component.envoyer();

        const requete = requeteDeConversation();
        expect(requete.request.headers.get('X-Skip-Loader')).toBe('true');
        requete.flush({
            message: 'ok',
            statusCode: 200,
            data: { conversationId: 'c-1', reponse: 'Une réponse', avertissement: '', messagesRestants: 38 }
        });
    });

    it('poursuit le même fil au tour suivant', () => {
        component.saisie = 'Première question';
        component.envoyer();
        requeteDeConversation().flush({
            message: 'ok',
            statusCode: 200,
            data: { conversationId: 'c-1', reponse: 'Première réponse', avertissement: '', messagesRestants: 38 }
        });

        component.saisie = 'Deuxième question';
        component.envoyer();
        const suivante = requeteDeConversation();
        expect(suivante.request.body.conversationId).toBe('c-1');
        suivante.flush({
            message: 'ok',
            statusCode: 200,
            data: { conversationId: 'c-1', reponse: 'Deuxième réponse', avertissement: '', messagesRestants: 36 }
        });

        expect(texteAffiche()).toContain('Première réponse');
        expect(texteAffiche()).toContain('Deuxième réponse');
    });

    /**
     * Une question prédéfinie rend deux choses de nature différente, et l'écran doit les tenir
     * séparées : les données viennent du service métier et s'affichent telles quelles ; la phrase
     * vient du modèle. Si les chiffres passaient par lui, ils finiraient faux.
     */
    it('affiche les données réelles sous le commentaire de l\'assistant', () => {
        component.poser(component.questions[0]);

        http.expectOne((r) => r.url.endsWith('/ia/questions/CE_QUI_M_ATTEND')).flush({
            message: 'ok',
            statusCode: 200,
            data: {
                code: 'CE_QUI_M_ATTEND',
                libelle: "Qu'est-ce qui m'attend ?",
                elements: [{ reference: 'NC-2026-007', libelle: 'Lot expédié sans contrôle', niveau: 'Majeure', etat: 'EN_COURS' }],
                total: 1,
                commentaire: 'Un dossier majeur mérite votre attention.',
                conversationId: 'c-9',
                avertissement: 'Assistant IA'
            }
        });

        const affiche = texteAffiche();
        expect(affiche).toContain("Qu'est-ce qui m'attend ?");
        expect(affiche).toContain('Un dossier majeur mérite votre attention.');
        expect(affiche).toContain('NC-2026-007');
        expect(affiche).toContain('Majeure');
    });

    /**
     * Une ligne conduit à son dossier. Aucun n'a de route de détail — la fiche est une boîte de
     * dialogue ouverte depuis sa liste —, on emprunte donc la convention que les écrans savent
     * déjà lire : l'identifiant en paramètre d'adresse.
     */
    it('conduit chaque type de ressource à son écran', () => {
        const router = TestBed.inject(Router);
        const navigue = spyOn(router, 'navigate');

        const attendus: Array<[string, string, string]> = [
            ['NON_CONFORMITE', '/non-conformite/traitement', 'ncId'],
            ['PLAN_ACTION', '/non-conformite/plan-action', 'ncId'],
            ['DOCUMENT', '/gestion-documentaire/documents', 'documentId'],
            ['DEMANDE_DOCUMENT', '/gestion-documentaire/demandes', 'demandeId']
        ];

        attendus.forEach(([type, route, parametre]) => {
            navigue.calls.reset();
            component.ouvrir({ reference: 'X-1', ressourceType: type, ressourceId: 'id-42' });
            expect(navigue).toHaveBeenCalledWith([route], { queryParams: { [parametre]: 'id-42' } });
        });
    });

    it('referme le tiroir derrière elle', () => {
        spyOn(TestBed.inject(Router), 'navigate');
        let referme = false;
        component.navigue.subscribe(() => (referme = true));

        component.ouvrir({ reference: 'X-1', ressourceType: 'DOCUMENT', ressourceId: 'id-42' });
        expect(referme).toBeTrue();
    });

    /** Une ligne sans destination reste inerte, et ne se donne pas l'air d'être cliquable. */
    it("n'ouvre rien pour une ressource sans destination ni identifiant", () => {
        const navigue = spyOn(TestBed.inject(Router), 'navigate');

        expect(component.estOuvrable({ reference: 'X', ressourceType: 'INCONNU', ressourceId: 'i' })).toBeFalse();
        expect(component.estOuvrable({ reference: 'X', ressourceType: 'DOCUMENT' })).toBeFalse();

        component.ouvrir({ reference: 'X', ressourceType: 'INCONNU', ressourceId: 'i' });
        expect(navigue).not.toHaveBeenCalled();
    });

    /**
     * En échec, le serveur n'a rien retenu — sa transaction est défaite. L'écran s'aligne plutôt
     * que d'afficher un échange qui n'existe nulle part, et rend la question à la saisie pour
     * qu'un seul geste suffise à réessayer.
     */
    it('rend la question à la saisie quand la génération échoue', () => {
        component.saisie = 'Une question';
        component.envoyer();
        requeteDeConversation().flush(
            { message: "L'assistant est indisponible." },
            { status: 503, statusText: 'Service Unavailable' });

        expect(component.saisie).toBe('Une question');
        expect(component.messages.length).toBe(0);
        expect(texteAffiche()).toContain('momentanément indisponible');
    });
});
