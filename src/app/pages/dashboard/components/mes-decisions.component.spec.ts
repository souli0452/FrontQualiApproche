import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NgxPermissionsModule } from 'ngx-permissions';

import { ModuleAbonnement } from '../../../enums/enums';
import { currentUserState } from '../../../services/auth-services/auth.state';
import { MesDecisionsComponent } from './mes-decisions.component';

/**
 * Ce qui attend une décision de l'utilisateur, sur la page d'accueil.
 *
 * <p>Ce qui se joue ici est le <b>cloisonnement</b> : une famille n'est ni interrogée ni annoncée si
 * l'organisation n'a pas souscrit son module ou si l'utilisateur n'a pas la permission d'y lire.
 * Interroger quand même n'aurait rendu qu'un refus ; afficher une section vide laisserait croire
 * qu'il n'y a rien à faire là où il n'y a pas accès.</p>
 */
describe('MesDecisionsComponent', () => {
    let component: MesDecisionsComponent;
    let fixture: ComponentFixture<MesDecisionsComponent>;
    let http: HttpTestingController;

    function connecter(permissions: string[], modules: string[]): void {
        currentUserState.next({ permissions, modulesSubscribed: modules } as any);
    }

    /** Titres des sections annoncées, dans l'ordre. */
    function sections(): string[] {
        return component.famillesVisibles.map((famille) => famille.titre);
    }

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [MesDecisionsComponent, NgxPermissionsModule.forRoot()],
            providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
        }).compileComponents();

        fixture = TestBed.createComponent(MesDecisionsComponent);
        component = fixture.componentInstance;
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        currentUserState.next(null as any);
    });

    it('n\'annonce rien à qui n\'a ni module ni permission', () => {
        connecter([], []);

        component.ngOnInit();

        expect(sections()).toEqual([]);
        // Aucun appel : le tableau de bord ne doit pas provoquer de refus pour savoir qu'il n'a
        // rien à montrer.
        http.expectNone(() => true);
    });

    it('le module documentaire seul n\'ouvre que ses deux sections', () => {
        connecter(['DOC_READ'], [ModuleAbonnement.DOCUMENTAIRE]);

        component.ngOnInit();

        expect(sections()).toEqual([
            'Documents attendant votre décision',
            'Demandes à instruire'
        ]);
        expect(http.match((requete) => requete.url.includes('non-conformite'))).toEqual([]);
    });

    it('la permission sans l\'abonnement n\'ouvre rien', () => {
        // Un rôle peut porter la permission depuis toujours ; c'est l'abonnement de la direction
        // qui décide si le module existe pour elle.
        connecter(['NC_READ', 'DOC_READ'], []);

        component.ngOnInit();

        expect(sections()).toEqual([]);
    });

    it('l\'abonnement sans la permission n\'ouvre rien non plus', () => {
        connecter([], [ModuleAbonnement.NON_CONFORMITE, ModuleAbonnement.DOCUMENTAIRE]);

        component.ngOnInit();

        expect(sections()).toEqual([]);
    });

    it('les actions correctives ont leur propre permission, distincte de la lecture des écarts', () => {
        connecter(['NC_READ'], [ModuleAbonnement.NON_CONFORMITE]);
        component.ngOnInit();
        expect(sections()).toEqual(['Non-conformités attendant votre décision']);

        connecter(['NC_READ', 'TRAITEMENT_PLAN'], [ModuleAbonnement.NON_CONFORMITE]);
        component.ngOnInit();
        expect(sections()).toEqual([
            'Non-conformités attendant votre décision',
            'Actions correctives à mener'
        ]);
    });

    it('présente les dossiers rendus par le serveur, référence et étape comprises', () => {
        connecter(['NC_READ'], [ModuleAbonnement.NON_CONFORMITE]);
        component.ngOnInit();

        http.expectOne((requete) => requete.url.includes('non-conformite/a-traiter')).flush({
            data: {
                content: [{
                    id: 'nc-1', numeroReference: 'NC-2026-014',
                    typeNonConformiteLibelle: 'Écart documentaire', nomProcessus: 'Achats',
                    workflowState: { currentStateName: 'Analyse', allowedActions: [] }
                }]
            }
        });

        const famille = component.famillesVisibles[0];
        expect(famille.chargement).toBeFalse();
        expect(famille.lignes.length).toBe(1);
        expect(famille.lignes[0].reference).toBe('NC-2026-014');
        expect(famille.lignes[0].titre).toBe('Écart documentaire');
        expect(famille.lignes[0].state?.currentStateName).toBe('Analyse');
    });

    it('un module indisponible laisse les autres s\'afficher', () => {
        connecter(['NC_READ', 'TRAITEMENT_PLAN'], [ModuleAbonnement.NON_CONFORMITE]);
        component.ngOnInit();

        http.expectOne((requete) => requete.url.includes('non-conformite/a-traiter'))
            .flush('indisponible', { status: 503, statusText: 'Service Unavailable' });
        http.expectOne((requete) => requete.url.includes('plan-action/a-traiter'))
            .flush({ data: { content: [{ id: 'pa-1', numeroOdre: 'PA-3', solutionRetenues: 'Former' }] } });

        // Le service en panne rend une section vide, pas un accueil vide.
        expect(component.famillesVisibles[0].lignes).toEqual([]);
        expect(component.famillesVisibles[0].chargement).toBeFalse();
        expect(component.famillesVisibles[1].lignes.length).toBe(1);
    });

    it('écarte une ligne sans identifiant : aucune décision ne pourrait y porter', () => {
        connecter(['NC_READ'], [ModuleAbonnement.NON_CONFORMITE]);
        component.ngOnInit();

        http.expectOne((requete) => requete.url.includes('non-conformite/a-traiter')).flush({
            data: { content: [{ numeroReference: 'NC-SANS-ID' }, { id: 'nc-2', numeroReference: 'NC-2' }] }
        });

        expect(component.famillesVisibles[0].lignes.map((ligne) => ligne.id)).toEqual(['nc-2']);
    });

    it('le total ne compte que ce qui a répondu', () => {
        connecter(['NC_READ'], [ModuleAbonnement.NON_CONFORMITE]);
        component.ngOnInit();

        expect(component.chargement).toBeTrue();

        http.expectOne((requete) => requete.url.includes('non-conformite/a-traiter'))
            .flush({ data: { content: [{ id: 'nc-1' }, { id: 'nc-2' }] } });

        expect(component.chargement).toBeFalse();
        expect(component.total).toBe(2);
    });

    // ------------------------------------------------------ échéances des actions correctives

    /** Date décalée de `jours`, au format demandé. */
    function dateDecalee(jours: number, format: 'iso' | 'local'): string {
        const date = new Date();
        date.setHours(12, 0, 0, 0);
        date.setDate(date.getDate() + jours);
        const jj = `${date.getDate()}`.padStart(2, '0');
        const mm = `${date.getMonth() + 1}`.padStart(2, '0');
        return format === 'iso' ? `${date.getFullYear()}-${mm}-${jj}` : `${jj}-${mm}-${date.getFullYear()}`;
    }

    function chargerLesPlans(plans: any[]): void {
        connecter(['TRAITEMENT_PLAN'], [ModuleAbonnement.NON_CONFORMITE]);
        component.ngOnInit();
        http.expectOne((requete) => requete.url.includes('plan-action/a-traiter'))
            .flush({ data: { content: plans } });
    }

    it('compte comme en retard une échéance passée, quel que soit le format de date', () => {
        chargerLesPlans([
            { id: 'a', dateEcheance: dateDecalee(-3, 'iso') },
            { id: 'b', dateEcheance: dateDecalee(-1, 'local') }
        ]);

        expect(component.plansEnRetard).toBe(2);
        expect(component.plansEcheanceProche).toBe(0);
    });

    it('compte à part ce qui échoit dans la semaine', () => {
        chargerLesPlans([
            { id: 'a', dateEcheance: dateDecalee(0, 'iso') },
            { id: 'b', dateEcheance: dateDecalee(7, 'iso') },
            { id: 'c', dateEcheance: dateDecalee(8, 'iso') }
        ]);

        // Aujourd'hui compris, huit jours exclus : l'échéance du jour est encore tenable.
        expect(component.plansEcheanceProche).toBe(2);
        expect(component.plansEnRetard).toBe(0);
    });

    it('n\'invente pas un retard à partir d\'une date illisible', () => {
        chargerLesPlans([
            { id: 'a', dateEcheance: 'dès que possible' },
            { id: 'b' }
        ]);

        // Un indicateur qui exagère le retard cesse d'être cru, et on cesse de le regarder.
        expect(component.plansEnRetard).toBe(0);
        expect(component.plansEcheanceProche).toBe(0);
    });

    it('publie son état à qui l\'affiche, chargement compris', async () => {
        const etats: any[] = [];
        component.etat.subscribe((etat) => etats.push(etat));

        chargerLesPlans([{ id: 'a', dateEcheance: dateDecalee(-1, 'iso') }]);
        // Les publications sont reportées d'une micro-tâche pour ne pas changer, en pleine détection
        // de changement, une valeur que le parent vient de vérifier.
        await Promise.resolve();

        // Le premier état annonce le chargement : les indicateurs n'affichent alors pas de zéro.
        expect(etats[0].chargement).toBeTrue();
        const dernier = etats[etats.length - 1];
        expect(dernier.chargement).toBeFalse();
        expect(dernier.total).toBe(1);
        expect(dernier.plansEnRetard).toBe(1);
        expect(dernier.suitDesActions).toBeTrue();
    });

    // ------------------------------------------------------ dépôt des pièces d'étape

    it('chaque famille sait déposer la pièce que son étape réclame', () => {
        connecter(['DOC_READ', 'NC_READ', 'TRAITEMENT_PLAN'],
            [ModuleAbonnement.DOCUMENTAIRE, ModuleAbonnement.NON_CONFORMITE]);
        component.ngOnInit();

        // Ces deux points d'entrée rendent la liste directement dans `data`, sans pagination.
        http.expectOne((requete) => requete.url.includes('qms/documents/a-traiter'))
            .flush({ data: [{ id: 'doc-1', documentNumber: 'PRO-01' }] });
        http.expectOne((requete) => requete.url.includes('demandes-document/a-traiter'))
            .flush({ data: [{ id: 'dem-1', objectif: 'Réviser' }] });
        http.expectOne((requete) => requete.url.includes('non-conformite/a-traiter'))
            .flush({ data: { content: [{ id: 'nc-1' }] } });
        http.expectOne((requete) => requete.url.includes('plan-action/a-traiter'))
            .flush({ data: { content: [{ id: 'pa-1' }] } });

        // Sans déposeur, le champ « pièce jointe » d'une étape n'est pas présenté et le dossier
        // n'est décidable que depuis l'écran de son module.
        component.famillesVisibles.forEach((famille) =>
            famille.lignes.forEach((ligne) =>
                expect(ligne.deposerFichier)
                    .withContext(`déposeur manquant sur ${famille.cle}`).toBeDefined()));
    });

    it('le dépôt d\'une pièce porte sur le dossier de sa ligne', () => {
        connecter(['DOC_READ'], [ModuleAbonnement.DOCUMENTAIRE]);
        component.ngOnInit();
        http.expectOne((requete) => requete.url.includes('qms/documents/a-traiter'))
            .flush({ data: [{ id: 'doc-42', documentNumber: 'PRO-01' }] });
        http.expectOne((requete) => requete.url.includes('demandes-document/a-traiter'))
            .flush({ data: [] });

        component.famillesVisibles[0].lignes[0]
            .deposerFichier!(new File(['x'], 'avis.pdf')).subscribe();

        // L'identifiant du dossier est dans l'adresse : c'est lui qui range la pièce, et qui
        // autorise ensuite son téléchargement.
        const depot = http.expectOne((requete) => requete.url.endsWith('/doc-42/fichiers-etape'));
        expect(depot.request.method).toBe('POST');
        expect(depot.request.body instanceof FormData).toBeTrue();
        depot.flush({ data: 'pieces-etape/documents/doc-42/abc.pdf' });
    });
});
