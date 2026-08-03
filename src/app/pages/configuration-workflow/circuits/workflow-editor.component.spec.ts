import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ConfirmationService, MessageService } from 'primeng/api';

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

  const MODELE_VERIFICATION = {
    id: 'modele-verification',
    code: 'VERIFICATION',
    nomEtape: 'Vérification',
    responsableRole: 'PILOTE',
    description: 'Vérification de la forme et du fond'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
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
    composant.etapes.at(0).patchValue({
      cibleApprobation: composant.etapes.at(1).get('identifiantLocal')?.value
    });

    const etapes = payload().steps ?? [];
    expect(etapes[0].code).toBe('VERIFICATION');
    expect(etapes[1].code).toBe('VERIFICATION_2');

    const approbation = etapes[0].transitions?.find((t) => t.decision === 'APPROUVE');
    expect(approbation?.toStepCode).toBe('VERIFICATION_2');
    expect(approbation?.terminal).toBeFalse();
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
