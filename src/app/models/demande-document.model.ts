/**
 * Demande de modification ou de suppression portant sur un document.
 *
 * Elle suit un circuit de validation comme le document lui-même : elle en tire ses étapes, ses
 * responsables et sa traçabilité. Ce qui lui est propre est l'aboutissement — une modification
 * acceptée attend le fichier remplaçant, une suppression acceptée retire le document.
 */
import { WorkflowStateDto } from './workflow.model';

export type TypeDemande = 'MODIFICATION' | 'SUPPRESSION';

/**
 * `ACCEPTEE` n'est pas `EXECUTEE` : une modification acceptée reste à exécuter tant que le
 * remplaçant n'a pas été déposé, et si une suppression décidée échoue, l'écart entre décidé et fait
 * demeure visible.
 */
export type EtatDemande = 'EN_COURS' | 'ACCEPTEE' | 'REFUSEE' | 'EXECUTEE';

export interface DemandeDocumentDto {
  id: string;
  documentId: string;
  documentNumber?: string;
  documentTitre?: string;
  type: TypeDemande;
  etat: EtatDemande;
  objectif: string;
  description?: string;
  structureId?: string;
  structureLibelle?: string;
  demandeurId?: string;
  demandeurNom?: string;
  pieceJointeNom?: string;
  workflowId?: string;
  currentEtape?: string;
  createdAt?: string;
  dateDecision?: string;
  motifDecision?: string;
  dateExecution?: string;
  /** Acceptée et attendant son exécution. */
  enAttenteExecution?: boolean;
  /**
   * État du circuit : étape courante et décisions ouvertes à l'appelant.
   *
   * Renseigné par les listes qui proposent d'agir — la vue d'ensemble documentaire — et absent
   * ailleurs : les autres listes n'affichent pas d'action, et le demander partout aurait coûté un
   * aller-retour par ligne.
   */
  workflowState?: WorkflowStateDto;
}
