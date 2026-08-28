import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { NgxPermissionsModule } from 'ngx-permissions';

import { WorkflowEditorComponent } from './workflow-editor.component';
import { WorkflowDto } from '../../../models/workflow.model';

/**
 * Le code d'étape est l'identité fonctionnelle de l'étape : les transitions le désignent, les
 * dossiers en cours s'y rapportent, et c'est lui qui rend une même nature d'étape comparable d'un
 * circuit à l'autre. Ce qui se joue ici est donc l'exactitude des destinations autant que la
 * lisibilité des codes.
 */
describe('WorkflowEditorComponent — attribution des codes d\'étape', () => {
  let composant: WorkflowEditorComponent;

  const ANNE = '3f1b5c20-0000-4000-8000-00000000000a';
  const BRUNO = '3f1b5c20-0000-4000-8000-00000000000b';

  const MODELE_VERIFICATION = {
    id: 'modele-verification',
    code: 'VERIFICATION',
    nomEtape: 'Vérification',
    responsableRole: 'PILOTE',
    description: 'Vérification de la forme et du fond'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      // L'éditeur propose de nommer les signataires d'une étape : il résout donc l'annuaire des
      // utilisateurs, dont le service dépend à son tour des permissions applicatives.
      imports: [NgxPermissionsModule.forRoot()],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        // L'éditeur est devenu une page : il lit son identifiant dans la route et navigue au
        // retour. Les tests n'exercent ni l'un ni l'autre, mais l'injection les exige.
        provideRouter([]),
        MessageService,
        ConfirmationService
      ]
    });

    // Le composant est instancié hors de son gabarit : le formulaire est monté par le
    // constructeur, et ngOnInit — qui ne fait que déclencher les chargements HTTP — n'a rien à
    // voir avec ce qui est vérifié ici.
    composant = TestBed.runInInjectionContext(() => new WorkflowEditorComponent());
    composant.modelesEtape = [MODELE_VERIFICATION];
    composant.formulaire.patchValue({ nom: 'Circuit d\'essai', resourceType: 'DOCUMENT' });
  });

  function payload(): WorkflowDto {
    return (composant as any).construirePayload();
  }

  it('reprend le code du catalogue sur une étape nouvelle', () => {
    composant.ajouterEtape();
    composant.appliquerModeleEtape(0, MODELE_VERIFICATION.id);

    const etape = composant.etapes.at(0);
    expect(etape.get('code')?.value).toBe('VERIFICATION');
    expect(etape.get('stepTemplateId')?.value).toBe(MODELE_VERIFICATION.id);
    expect(etape.get('nomEtape')?.value).toBe('Vérification');
    expect(etape.get('responsableRole')?.value).toBe('PILOTE');
  });

  it('ne touche pas au code d\'une étape déjà enregistrée', () => {
    composant.ajouterEtape();
    const etape = composant.etapes.at(0);
    etape.patchValue({ id: 12, code: 'REDACTION', nomEtape: 'Rédaction' });

    composant.appliquerModeleEtape(0, MODELE_VERIFICATION.id);

    // Le serveur refuse en 409 la réécriture du code d'une étape enregistrée : le proposer ici
    // ne produirait qu'une erreur à l'enregistrement.
    expect(etape.get('code')?.value).toBe('REDACTION');
    expect(etape.get('nomEtape')?.value).toBe('Vérification');
    expect(payload().steps?.[0].code).toBe('REDACTION');
  });

  it('dérive le code du nom quand aucun modèle n\'est choisi', () => {
    composant.ajouterEtape();
    composant.etapes.at(0).patchValue({ nomEtape: 'Revue finale' });

    // Le code empruntait jusqu'ici l'identifiant local de l'étape — un UUID, illisible et propre
    // à cette saisie.
    expect(payload().steps?.[0].code).toBe('REVUE_FINALE');
  });

  it('distingue deux étapes issues du même modèle, destinations comprises', () => {
    composant.ajouterEtape();
    composant.ajouterEtape();
    composant.appliquerModeleEtape(0, MODELE_VERIFICATION.id);
    composant.appliquerModeleEtape(1, MODELE_VERIFICATION.id);

    // La première approuve vers la seconde : c'est la destination qu'un code partagé ferait
    // silencieusement retomber sur la première.
    composant.actionsDeLEtape(0).at(0).patchValue({
      cible: composant.etapes.at(1).get('identifiantLocal')?.value
    });

    const etapes = payload().steps ?? [];
    expect(etapes[0].code).toBe('VERIFICATION');
    expect(etapes[1].code).toBe('VERIFICATION_2');

    const approbation = etapes[0].transitions?.find((t) => t.decision === 'APPROUVE');
    expect(approbation?.toStepCode).toBe('VERIFICATION_2');
    expect(approbation?.terminal).toBeFalse();
  });

  it('retient toutes les actions d\'une étape, y compris de même nature', () => {
    composant.ajouterEtape();
    composant.etapes.at(0).patchValue({ nomEtape: 'Validation' });
    composant.ajouterAction(0);
    composant.actionsDeLEtape(0).at(2).patchValue({
      code: 'DEMANDER_COMPLEMENT', decision: 'APPROUVE', label: 'Demander un complément'
    });

    // L'étape n'offrait que deux issues, l'action se confondant avec sa décision : une troisième
    // suite n'était même pas exprimable dans l'éditeur.
    const actions = payload().steps?.[0].transitions ?? [];
    expect(actions.map((a) => a.code)).toEqual(['APPROUVE', 'REJETE', 'DEMANDER_COMPLEMENT']);
    expect(actions.filter((a) => a.decision === 'APPROUVE').length).toBe(2);
  });

  it('accepte une étape sans action : c\'est ainsi que se décrit une fin de circuit', () => {
    composant.ajouterEtape();
    composant.etapes.at(0).patchValue({ nomEtape: 'Clôturer' });
    composant.supprimerAction(0, 1);
    composant.supprimerAction(0, 0);

    // Retirer la dernière action en rendait aussitôt une vide : une étape « Clôturer » qui dit la
    // fin du circuit n'était pas exprimable, alors que les circuits livrés sont écrits ainsi — la
    // clôture d'une non-conformité, l'action soldée d'un plan. Le moteur clôt l'instance en
    // atteignant une telle étape.
    expect(composant.actionsDeLEtape(0).length).toBe(0);
    expect(composant.termineLeCircuit(0)).toBeTrue();
    expect(payload().steps?.[0].transitions).toEqual([]);
  });

  it('renvoie les signataires de l\'étape, et une liste vide quand elle n\'en nomme aucun', () => {
    composant.ajouterEtape();
    composant.ajouterEtape();
    composant.etapes.at(0).patchValue({ nomEtape: 'Rédaction' });
    composant.etapes.at(1).patchValue({ nomEtape: 'Vérification' });
    composant.etapes.at(1).get('cosignataires')?.setValue([ANNE, BRUNO]);

    // Omis du corps envoyé, le serveur efface la liste : l'étape cesserait de séparer les
    // signatures sans que rien ne l'ait demandé — c'est ce qui est arrivé au champ titulaire.
    const etapes = payload().steps ?? [];
    expect(etapes[0].cosignataires).toEqual([]);
    expect(etapes[1].cosignataires).toEqual([ANNE, BRUNO]);
  });

  it('ne redonne pas à une étape nouvelle le code d\'une étape déjà enregistrée', () => {
    composant.ajouterEtape();
    composant.etapes.at(0).patchValue({ id: 7, code: 'VERIFICATION', nomEtape: 'Vérification' });
    composant.ajouterEtape();
    composant.appliquerModeleEtape(1, MODELE_VERIFICATION.id);

    const etapes = payload().steps ?? [];
    expect(etapes[0].code).toBe('VERIFICATION');
    expect(etapes[1].code).toBe('VERIFICATION_2');
  });
});
