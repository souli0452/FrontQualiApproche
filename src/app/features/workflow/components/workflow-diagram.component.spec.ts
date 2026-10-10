import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WorkflowDto } from '../../../models/workflow.model';
import { WorkflowDiagramComponent } from './workflow-diagram.component';

/**
 * Diagramme état-transition d'un circuit.
 *
 * <p>Le rendu appartient à Mermaid ; ce qui nous appartient est le <b>source</b> qu'on lui donne, et
 * c'est là que se joue la justesse du dessin : le point d'entrée, les sorties, et la distinction des
 * flèches de retour — celles qu'on cherche en relisant un circuit. Ces tests portent donc sur le
 * source, vérifiable sans navigateur ni rendu.</p>
 */
describe('WorkflowDiagramComponent', () => {
    let component: WorkflowDiagramComponent;
    let fixture: ComponentFixture<WorkflowDiagramComponent>;

    /** Circuit à trois étapes : rédaction → vérification → approbation, avec un retour. */
    const CIRCUIT: WorkflowDto = {
        nom: 'Circuit document',
        resourceType: 'DOCUMENT',
        steps: [
            {
                code: 'REDACTION', nomEtape: 'Rédaction', stepOrder: 1,
                transitions: [{ decision: 'APPROUVE', label: 'Soumettre', toStepCode: 'VERIFICATION' }]
            },
            {
                code: 'VERIFICATION', nomEtape: 'Vérification', stepOrder: 2,
                transitions: [
                    { decision: 'APPROUVE', label: 'Vérifier', toStepCode: 'APPROBATION' },
                    { decision: 'REJETE', label: 'Retourner au rédacteur', toStepCode: 'REDACTION' }
                ]
            },
            {
                code: 'APPROBATION', nomEtape: 'Approbation', stepOrder: 3,
                transitions: [{ decision: 'APPROUVE', label: 'Approuver', terminal: true }]
            }
        ]
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({ imports: [WorkflowDiagramComponent] })
            .compileComponents();
        fixture = TestBed.createComponent(WorkflowDiagramComponent);
        component = fixture.componentInstance;
    });

    it('déclare une entrée sur la première étape', () => {
        component.workflow = CIRCUIT;

        // Le moteur ouvre le dossier sur l'étape de plus petit ordre : le diagramme doit dire la
        // même chose, sinon il décrit un circuit qui n'existe pas.
        expect(component.codeMermaid).toContain('[*] --> REDACTION');
    });

    it('relie chaque action à sa destination, en la nommant', () => {
        component.workflow = CIRCUIT;

        expect(component.codeMermaid).toContain('REDACTION --> VERIFICATION : Soumettre');
        expect(component.codeMermaid).toContain('VERIFICATION --> APPROBATION : Vérifier');
    });

    it('mène à la sortie une action qui clôt le circuit', () => {
        component.workflow = CIRCUIT;

        expect(component.codeMermaid).toContain('APPROBATION --> [*] : Approuver');
    });

    it('mène aussi à la sortie une étape qui n\'offre aucune action', () => {
        component.workflow = {
            nom: 'Circuit tronqué', resourceType: 'DOCUMENT',
            steps: [{ code: 'CLOTURE', nomEtape: 'Clôture', stepOrder: 1, transitions: [] }]
        };

        // Sans cela, le graphe se terminerait sur une étape ouverte, laissant croire à une suite.
        expect(component.codeMermaid).toContain('CLOTURE --> [*]');
    });

    it('marque la première étape et celles qui terminent', () => {
        component.workflow = CIRCUIT;

        expect(component.codeMermaid).toContain('class REDACTION depart');
        expect(component.codeMermaid).toContain('class APPROBATION fin');
    });

    it('utilise le libellé de l\'étape, pas son code', () => {
        component.workflow = CIRCUIT;

        expect(component.codeMermaid).toContain('state "Rédaction" as REDACTION');
    });

    it('rend inertes les balises glissées dans un nom d\'étape ou d\'action', () => {
        component.workflow = {
            nom: 'Circuit', resourceType: 'DOCUMENT',
            steps: [{
                code: 'A', nomEtape: '<img src=x onerror="alert(1)">', stepOrder: 1,
                transitions: [{ decision: 'APPROUVE', label: 'R&D <b>urgent</b>', terminal: true }]
            }]
        };

        // Les noms sont saisis au paramétrage et affichés à tous : aucun caractère qui fasse du HTML
        // ou ferme la chaîne Mermaid ne doit atteindre le source tel quel.
        expect(component.codeMermaid).toContain(
            'state "#lt;img src=x onerror=#quot;alert(1)#quot;#gt;" as A');
        expect(component.codeMermaid).toContain('A --> [*] : R#amp;D #lt;b#gt;urgent#lt;/b#gt;');
        expect(component.codeMermaid).not.toContain('<img');
        expect(component.codeMermaid).not.toContain('<b>');
    });

    it('échappe le dièse, pour qu\'une entité déjà écrite reste du texte', () => {
        component.workflow = {
            nom: 'Circuit', resourceType: 'DOCUMENT',
            steps: [{ code: 'A', nomEtape: 'Lot #lt; n°2', stepOrder: 1, transitions: [] }]
        };

        // Le point-virgule de l'entité est échappé à son tour : rien ne reste à décoder.
        expect(component.codeMermaid).toContain('state "Lot #35;lt#59; n°2" as A');
    });

    it('neutralise le point-virgule, que Mermaid prendrait pour une fin d\'instruction', () => {
        component.workflow = {
            nom: 'Circuit', resourceType: 'DOCUMENT',
            steps: [{
                code: 'A', nomEtape: 'Revue; classement', stepOrder: 1,
                transitions: [{ decision: 'APPROUVE', label: 'Valider; style A fill:red', terminal: true }]
            }]
        };

        // Une seule passe : l'entité du dièse ne doit pas être réécrite par celle du point-virgule,
        // ni l'inverse.
        expect(component.codeMermaid).toContain('state "Revue#59; classement" as A');
        expect(component.codeMermaid).toContain('A --> [*] : Valider#59; style A fill -red');
        expect(component.codeMermaid).not.toContain('Valider;');
    });

    it('neutralise les deux-points d\'un libellé, que Mermaid prendrait pour une étiquette', () => {
        component.workflow = {
            nom: 'Circuit', resourceType: 'DOCUMENT',
            steps: [{
                code: 'A', nomEtape: 'Étape A', stepOrder: 1,
                transitions: [{ decision: 'APPROUVE', label: 'Valider : sans réserve', terminal: true }]
            }]
        };

        expect(component.codeMermaid).not.toContain('Valider : sans réserve');
        expect(component.codeMermaid).toContain('Valider - sans réserve');
    });

    it('tient un code d\'étape inexploitable comme identifiant Mermaid', () => {
        component.workflow = {
            nom: 'Circuit', resourceType: 'DOCUMENT',
            steps: [{
                code: 'ÉTAPE-1 (bis)', nomEtape: 'Étape 1', stepOrder: 1,
                transitions: []
            }]
        };

        // Un identifiant contenant espaces, accents ou parenthèses ferait échouer tout le rendu.
        expect(component.codeMermaid).toContain('state "Étape 1" as _TAPE_1_bis_');
    });

    it('signale un circuit sans étape au lieu de dessiner un cadre vide', () => {
        component.workflow = { nom: 'Circuit vide', resourceType: 'DOCUMENT', steps: [] };

        expect(component.aucuneEtape).toBeTrue();
        expect(component.codeMermaid).toBe('');
    });

    it('trie les étapes par ordre, quel que soit celui de la réponse du serveur', () => {
        component.workflow = {
            nom: 'Circuit', resourceType: 'DOCUMENT',
            steps: [
                { code: 'B', nomEtape: 'Seconde', stepOrder: 2, transitions: [] },
                { code: 'A', nomEtape: 'Première', stepOrder: 1, transitions: [] }
            ]
        };

        expect(component.codeMermaid).toContain('[*] --> A');
    });

    // ------------------------------------------------------------------ suivi d'un dossier

    it('met en évidence l\'étape où se trouve le dossier', () => {
        component.etapeCouranteCode = 'VERIFICATION';
        component.workflow = CIRCUIT;

        expect(component.codeMermaid).toContain('class VERIFICATION courante');
    });

    it('estompe les étapes déjà franchies', () => {
        component.etapeCouranteCode = 'VERIFICATION';
        component.etapesParcourues = ['REDACTION'];
        component.workflow = CIRCUIT;

        expect(component.codeMermaid).toContain('class REDACTION parcourue');
    });

    it('ne donne qu\'une classe par étape : l\'étape en cours reste la plus visible', () => {
        component.etapeCouranteCode = 'REDACTION';
        component.etapesParcourues = ['REDACTION'];
        component.workflow = CIRCUIT;

        // Deux styles superposés se disputeraient le remplissage du nœud.
        expect(component.codeMermaid).toContain('class REDACTION courante');
        expect(component.codeMermaid).not.toContain('class REDACTION parcourue');
        expect(component.codeMermaid).not.toContain('class REDACTION depart');
    });

    it('sans étape courante, garde le marquage de configuration', () => {
        component.workflow = CIRCUIT;

        expect(component.codeMermaid).toContain('class REDACTION depart');
        expect(component.codeMermaid).not.toContain('courante');
    });

    // ------------------------------------------------------------------ disposition

    it('respecte la disposition imposée par l\'appelant', () => {
        component.direction = 'LR';
        component.workflow = CIRCUIT;

        expect(component.codeMermaid).toContain('direction LR');
        expect(component.dispositionEffective).toBe('LR');
    });

    it('la bascule change la disposition du source', () => {
        component.workflow = CIRCUIT;
        const avant = component.dispositionEffective;

        component.basculerLaDisposition();

        // Un circuit long se lit mieux à l'horizontale, mais cela dépend aussi de l'écran : le choix
        // déduit doit rester reprenable.
        expect(component.dispositionEffective).not.toBe(avant);
        expect(component.codeMermaid).toContain(`direction ${component.dispositionEffective}`);
    });

    it('un circuit court reste vertical', () => {
        component.workflow = {
            nom: 'Court', resourceType: 'DOCUMENT',
            steps: [{ code: 'A', nomEtape: 'Unique', stepOrder: 1, transitions: [] }]
        };

        expect(component.dispositionEffective).toBe('TB');
    });
});
