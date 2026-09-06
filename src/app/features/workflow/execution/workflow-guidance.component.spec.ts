import { WorkflowGuidanceComponent } from './workflow-guidance.component';
import { WorkflowStateDto } from '../models';

/**
 * Ce que l'écran répond à qui n'a rien à décider.
 *
 * <p>Deux silences se ressemblent et n'ont pas la même cause : on attend quelqu'un d'autre, ou on
 * attend quelqu'un d'autre <b>que soi</b>. Répondre « le pilote du processus doit se prononcer » à
 * un pilote, sur le document qu'il vient de déposer, est exact et incompréhensible.</p>
 */
describe('WorkflowGuidanceComponent — pourquoi je n\'ai rien à décider', () => {

    function guidance(state: Partial<WorkflowStateDto>): WorkflowGuidanceComponent {
        const composant = new WorkflowGuidanceComponent();
        composant.state = { allowedActions: [], ...state } as WorkflowStateDto;
        composant.objet = 'ce document';
        return composant;
    }

    it('dit qui l\'on attend lorsque l\'utilisateur n\'est pas concerné', () => {
        const detail = guidance({ currentStepRole: 'PILOTE' }).detail;

        expect(detail).toContain('Le pilote du processus doit se prononcer');
    });

    it('dit à l\'auteur que la décision revient ici à un autre signataire', () => {
        const detail = guidance({ currentStepRole: 'PILOTE', ecarteCommeAuteur: true }).detail;

        // Le rôle reste nommé — il dit qui attendre — mais la phrase ne prétend plus que
        // l'utilisateur ne le porte pas : ce n'est pas le rôle qui lui manque.
        expect(detail).toContain('Vous avez soumis ce document');
        expect(detail).toContain('un autre signataire que son auteur');
        expect(detail).toContain('le pilote du processus');
    });

    it('ne parle pas de séparation des signatures à qui a bien des actions', () => {
        const composant = guidance({
            currentStepRole: 'PILOTE',
            ecarteCommeAuteur: true,
            allowedActions: [{ code: '1', libelle: 'Vérifier' } as any]
        });

        // L'administration passe outre la séparation et reçoit les boutons : lui dire qu'elle n'a
        // rien à faire serait faux, et le drapeau ne vaut donc qu'en l'absence d'action.
        expect(composant.ecarteCommeAuteur).toBeFalse();
        expect(composant.detail).toContain('Vous pouvez « Vérifier »');
    });
});
