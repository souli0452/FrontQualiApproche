import { UserInfos } from "./auth.model";
import {
  StepDecision,
  WorkflowDto,
  WorkflowStepDto,
  WorkflowStepFieldDto,
  WorkflowTransitionDto
} from "./workflow.model";

export interface QmsDocumentType {
  id?: string;
  code: string;
  libelle: string;
  folderName: string;
  /**
   * Le type ne désigne pas son circuit : c'est le **circuit** qui se réserve à un type, depuis
   * l'éditeur de circuits (`WorkflowDto.cibleId`). Un seul dépositaire du lien, donc aucune
   * contradiction possible — et l'unicité « un type, un circuit » y est tenue par le serveur.
   */
  createdAt?: string;
  createdById?: string;
  currentUserfullName?: string;
}

export interface DocumentQms {
  /**
   * Avertissement rendu au dépôt ou au reclassement : le niveau retenu n'admet aucun des rôles
   * qui décident des étapes du circuit. Le document est enregistré malgré tout — ses décideurs
   * ne le verront simplement pas tant que le classement ou le circuit n'aura pas été ajusté.
   */
  avertissementConfidentialite?: string | null;
  workflowState?: any;
  /**
   * L'appelant relève-t-il de la structure du document (ou l'accompagne-t-il au titre de la
   * qualité) ? Faux lorsqu'il n'y accède que par un partage : le serveur lui refuse alors
   * l'historique, la piste d'audit et les décisions du circuit.
   */
  suiviInterneAutorise?: boolean;
  /** Priorité et niveau de confidentialité : l'identifiant rattache, le libellé s'affiche. */
  prioriteId?: string;
  prioriteLibelle?: string;
  niveauConfidentialiteId?: string;
  niveauConfidentialiteLibelle?: string;

  id?: string;
  documentNumber?: string;
  /** Champs renvoyés par le serveur mais absents du modèle : le titre notamment, alors qu'il
      identifie le document pour l'utilisateur bien mieux que son numéro. */
  titre?: string;
  /** Code saisi par l'auteur, selon la convention de numérotation de l'organisation. */
  reference?: string;
  description?: string;
  documentType: string;
  serviceId: string;
  serviceLibelle?: string;
  serviceSigle?: string;
  redacteur: string;
  esTraiter?: boolean;
  enRetardRevision?: boolean;
  obsolete?: boolean;

  /**
   * Rang de révision, à partir de zéro.
   *
   * Un document déposé est en v0 ; chaque modification aboutie d'une demande le fait passer au
   * rang suivant. Une correction pendant le circuit ne le change pas : la révision doit avoir
   * été demandée, instruite et acceptée.
   */
  numeroVersion?: number;
  dateVigueur?: string;
  dateProchRevision?: string;
  periodiciteMois?: number;
  confidentiel?: boolean;
  documentExterne?: boolean;
  processusDestId?: string;
  processusDestLibelle?: string;
  referenceOfficielle?: string;
  datePublication?: string;
  domaine?: string;
  statutLegal?: string;
  alfrescoNodeId?: string;
  ncReference?: string;
  archived?: boolean;
  createdAt?: string;
  createdById?: string;
  currentUserfullName?: string;
  currentFileHash?: string;
  currentEtape?: string;
  currentObjectName?: string;
  workflowId?: string;
  lastModifiedBy?: string;
  lastModifiedReason?: string;
}


export interface QmsDocumentVersion {
  id?: number;
  documentId: string;
  versionLabel: string;
  dateCreation: string;
  createdBy: string;
  comment: string;
  alfrescoNodeId: string;
  fileHash?: string;
}


export interface QmsAuditLog {
  id?: number;
  action: string;
  documentNumber: string;
  timestamp: string;
  username: string;
  details: string;
}

export interface DocumentStatsDto {
  totalDocuments: number;
  countByDocumentType: Record<string, number>;
  countByStatus: Record<string, number>;
  countByDomaine: Record<string, number>;
  countByService: Record<string, number>;
  documentsEnRetardRevision: number;
  documentsConfidentiels: number;
  documentsExternes: number;
}

export interface DocumentUserAccess {
  id?: string;
  documentId: string;
  userId: string;
  userFullName?: string;
  userEmail?: string;
  role: string; // READ_ONLY | WRITE
  grantedAt?: string;
  grantedBy?: string;
}

/**
 * Document partagé avec l'utilisateur connecté, tel que le sert `GET /documents/shared/me`.
 *
 * Les champs du document sont **à plat** : le modèle les logeait sous un objet `document`, que le
 * serveur n'a jamais envoyé — l'écran « Partagés avec moi » n'affichait donc que des cellules
 * vides, quel que soit le nombre de partages reçus.
 */
export interface SharedDocumentDto {
  documentId: string;
  documentNumber?: string;
  titre?: string;
  documentType?: string;
  status?: string;
  serviceLibelle?: string;
  serviceSigle?: string;
  redacteur?: string;
  domaine?: string;
  versionLabel?: string;
  dateVigueur?: string;
  dateProchRevision?: string;
  confidentiel?: boolean;

  accessRole: string; // READ_ONLY | WRITE
  userId?: string;
  userFullName?: string;
  userEmail?: string;

  /** Vrai lorsque l'accès vient d'un partage consenti à toute la structure, sans nomination. */
  partageStructure?: boolean;
  /** Qui a partagé, lorsque le partage vise la structure. */
  partagePar?: string;
}

/**
 * Étape, transition et champ de saisie : alias du contrat canonique de workflow-service.
 *
 * Ces trois formes étaient décrites une seconde fois ici, et les deux descriptions avaient
 * divergé — le module documentaire ignorait `etatTraitement`, le contrat canonique ignorait
 * `terminal`. Un seul jeu de définitions fait désormais foi ({@code models/workflow.model.ts}),
 * ces noms restant disponibles pour les écrans documentaires qui s'y réfèrent.
 */
export type WorkflowDecision = StepDecision;
export type WorkflowTransition = WorkflowTransitionDto;
export type WorkflowStep = WorkflowStepDto;
export type WorkflowStepField = WorkflowStepFieldDto;

export interface WorkflowStepTemplate {
  id?: string;
  /** Code fonctionnel du catalogue : unique, immuable, hérité par les étapes qui s'en inspirent. */
  code?: string | null;
  nomEtape: string;
  responsableRole: string;
  description?: string;
  createdAt?: string;
}

/**
 * Circuit tel que le manipule le module documentaire.
 *
 * Étend le contrat canonique de workflow-service ({@link WorkflowDto}) au lieu de le redéfinir :
 * les deux descriptions avaient divergé, celle-ci ignorant notamment `actif`, sur lequel repose
 * le choix du circuit ouvert par les services métier. Seuls les attributs propres à l'affichage
 * documentaire restent déclarés ici.
 */
export interface DocumentWorkflow extends WorkflowDto {
  documentType?: string;
  createdAt?: string;
  createdBy?: string;
}