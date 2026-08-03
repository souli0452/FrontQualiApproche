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
   * Circuit de validation ouvert sur les documents de ce type.
   *
   * Le serveur le prévoyait de longue date, mais aucun écran ne permettait de le renseigner :
   * tous les types restaient sans circuit, et la création retombait sur le circuit actif. Faute
   * de pouvoir exprimer « ce type suit ce circuit », des circuits étaient créés avec le code du
   * type de document en guise de type de ressource — ce qui empêchait toute notification, la
   * remise ne sachant router que DOCUMENT, NON_CONFORMITE et PLAN_ACTION.
   */
  workflowId?: string | null;
  createdAt?: string;
  createdById?: string;
  currentUserfullName?: string;
}

export interface DocumentQms {
  workflowState?: any;
  id?: string;
  documentNumber?: string;
  /** Champs renvoyés par le serveur mais absents du modèle : le titre notamment, alors qu'il
      identifie le document pour l'utilisateur bien mieux que son numéro. */
  titre?: string;
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

  versionMajeure?: number;
  versionMineure?: number;
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

export interface SharedDocumentDto {
  document: DocumentQms;
  accessRole: string; // READ_ONLY | WRITE
  grantedAt?: string;
  grantedBy?: string;
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