import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NgxPermissionsModule } from 'ngx-permissions';

import { WorkflowStepFieldDto } from '../../models/workflow.model';
import { WorkflowDecisionDialogComponent } from './workflow-decision-dialog.component';

/**
 * Dialogue de décision : les champs que l'étape réclame avant de trancher.
 *
 * <p>Le défaut couvert ici s'est vu à l'usage : un champ de type liste dont les valeurs sont écrites
 * à la main dans le circuit ne montrait pas le choix retenu — la valeur partait bien au serveur, mais
 * le sélecteur paraissait vide. Une liste de source (utilisateurs, structures) n'avait pas le
 * problème, étant déjà mémorisée.</p>
 *
 * <p>La cause n'est pas la valeur mais l'<b>identité de la liste</b> : reconstruite à chaque
 * détection de changement, elle faisait recréer les {@code <option>} du sélecteur, et le navigateur
 * perdait l'option marquée sélectionnée.</p>
 */
describe('WorkflowDecisionDialogComponent', () => {
    let component: WorkflowDecisionDialogComponent;
    let fixture: ComponentFixture<WorkflowDecisionDialogComponent>;

    const CHOIX_ECRITS: WorkflowStepFieldDto = {
        id: 7, fieldName: 'avis', fieldLabel: 'Avis', type: 'SELECT', required: true,
        options: 'Favorable, Défavorable, Sans avis'
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            // Le service des listes de source remonte jusqu'au service d'authentification, qui
            // charge les permissions : tout est fourni pour que l'échec, s'il y en a un, porte sur le
            // composant et non sur son injection.
            // NoopAnimations : le dialogue de PrimeNG s'ouvre en animation, que le banc de test ne
            // sait pas jouer.
            imports: [WorkflowDecisionDialogComponent, NgxPermissionsModule.forRoot(),
                NoopAnimationsModule],
            providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
        }).compileComponents();

        fixture = TestBed.createComponent(WorkflowDecisionDialogComponent);
        component = fixture.componentInstance;
    });

    it('découpe la liste écrite à la main, espaces compris', () => {
        component.stepFields = [CHOIX_ECRITS];

        expect(component.choixDuChamp(CHOIX_ECRITS)).toEqual([
            { label: 'Favorable', value: 'Favorable' },
            { label: 'Défavorable', value: 'Défavorable' },
            { label: 'Sans avis', value: 'Sans avis' }
        ]);
    });

    it('rend toujours la même liste, et pas seulement une liste égale', () => {
        component.stepFields = [CHOIX_ECRITS];

        const premier = component.choixDuChamp(CHOIX_ECRITS);
        const second = component.choixDuChamp(CHOIX_ECRITS);

        // C'est l'identité qui compte : le gabarit appelle cette méthode à chaque cycle, et une
        // nouvelle liste à chaque appel faisait recréer les options du sélecteur.
        expect(second).toBe(premier);
    });

    it('deux champs proposant les mêmes valeurs partagent la même liste', () => {
        const autre: WorkflowStepFieldDto = { ...CHOIX_ECRITS, id: 8, fieldName: 'avis_second' };
        component.stepFields = [CHOIX_ECRITS, autre];

        expect(component.choixDuChamp(autre)).toBe(component.choixDuChamp(CHOIX_ECRITS));
    });

    it('une liste vide ne propose rien, sans erreur', () => {
        const sansOption: WorkflowStepFieldDto = { ...CHOIX_ECRITS, id: 9, options: '  ,  ' };
        component.stepFields = [sansOption];

        expect(component.choixDuChamp(sansOption)).toEqual([]);
    });

    it('le choix retenu reste affiché après un nouveau cycle de rendu', async () => {
        component.action = { code: '12', libelle: 'Valider', decision: 'APPROUVE' };
        component.stepFields = [CHOIX_ECRITS];
        component.visible = true;
        fixture.detectChanges();

        component.form.get('champ_7')?.setValue('Défavorable');
        fixture.detectChanges();
        // Le sélecteur partagé transmet la valeur à son `p-select` par `ngModel`, qui l'applique
        // dans une micro-tâche : hors navigateur, il faut l'attendre. Le second cycle qui suit est
        // celui qui, avant correction, effaçait la sélection à l'écran.
        await fixture.whenStable();
        fixture.detectChanges();

        // Le dialogue se rend hors de l'élément du composant : la recherche porte sur le document.
        const affichage = document.querySelector('.p-select-label');
        expect(affichage).withContext('le sélecteur du champ liste doit être rendu').not.toBeNull();
        expect(affichage!.textContent?.trim()).toBe('Défavorable');
    });
});
