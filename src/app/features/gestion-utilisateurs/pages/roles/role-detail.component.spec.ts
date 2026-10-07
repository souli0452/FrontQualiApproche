import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MessageService } from 'primeng/api';

import { RoleDetailComponent } from './role-detail.component';

/**
 * La recherche de permissions dans la fiche d'un rôle.
 *
 * <p>Cent dix-neuf permissions sur quinze modules : sans filtre, il fallait parcourir la page
 * entière pour retrouver un droit dont on connaissait pourtant le nom. Ces cas gardent surtout
 * ce qui protège l'utilisateur — filtrer montre moins, cela ne retire jamais rien.</p>
 */
describe('RoleDetailComponent — recherche de permissions', () => {

    let component: RoleDetailComponent;

    const permissions = [
        { label: 'Écrire et corriger les réponses de la FAQ', value: 'faq-write', module: 'Configuration' },
        { label: 'Publier une réponse de la FAQ', value: 'faq-publish', module: 'Configuration' },
        { label: 'Déclarer une non-conformité', value: 'nc-write', module: 'Non-conformité' },
        { label: 'Consulter les documents', value: 'document-read', module: 'Documentaire' }
    ];

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [RoleDetailComponent, NoopAnimationsModule],
            providers: [
                provideHttpClient(), provideHttpClientTesting(), provideRouter([]), MessageService
            ]
        }).compileComponents();

        const fixture = TestBed.createComponent(RoleDetailComponent);
        component = fixture.componentInstance;
        component.groupPermissions(permissions as any);
    });

    it('sans recherche, tous les modules sont montrés', () => {
        expect(component.groupesVisibles.length).toBe(3);
        expect(component.nombreVisible).toBe(4);
    });

    it('la recherche porte sur le libellé', () => {
        component.recherchePermission = 'déclarer';
        component.filtrerLesPermissions();

        expect(component.nombreVisible).toBe(1);
        expect(component.groupesVisibles[0].permissions[0].value).toBe('nc-write');
    });

    it('la recherche porte aussi sur le code technique', () => {
        // Un message d'erreur ou une consigne d'administration nomme le code, pas le libellé :
        // c'est souvent avec lui qu'on arrive sur cet écran.
        component.recherchePermission = 'faq-publish';
        component.filtrerLesPermissions();

        expect(component.nombreVisible).toBe(1);
        expect(component.groupesVisibles[0].permissions[0].label)
            .toBe('Publier une réponse de la FAQ');
    });

    it('la recherche porte sur le nom du module', () => {
        component.recherchePermission = 'documentaire';
        component.filtrerLesPermissions();

        expect(component.groupesVisibles.length).toBe(1);
        expect(component.groupesVisibles[0].module).toBe('Documentaire');
    });

    it('un module sans correspondance disparaît plutôt que de rester vide', () => {
        component.recherchePermission = 'faq';
        component.filtrerLesPermissions();

        // Des cartes creuses donneraient à chercher dans du vide.
        expect(component.groupesVisibles.length).toBe(1);
        expect(component.groupesVisibles[0].permissions.length).toBe(2);
    });

    it('filtrer ne touche jamais à la liste complète', () => {
        component.recherchePermission = 'faq';
        component.filtrerLesPermissions();

        // C'est la garantie qui compte : montrer moins n'est pas retirer. Les permissions
        // masquées restent cochées telles quelles à l'enregistrement.
        expect(component.groupedPermissions.length).toBe(3);
    });

    it('effacer la recherche rend tout, sans rappeler le serveur', () => {
        component.recherchePermission = 'faq';
        component.filtrerLesPermissions();
        component.recherchePermission = '';
        component.filtrerLesPermissions();

        expect(component.groupesVisibles.length).toBe(3);
    });

    it('une recherche sans résultat ne laisse aucun module', () => {
        component.recherchePermission = 'introuvable';
        component.filtrerLesPermissions();

        expect(component.groupesVisibles).toEqual([]);
        expect(component.nombreVisible).toBe(0);
    });
});
