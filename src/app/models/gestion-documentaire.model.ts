import { UserInfos } from "./auth.model";

export interface QmsDocumentType {
  id?: string;
  code: string;
  libelle: string;
  folderName: string;
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

export type WorkflowDecision = 'APPROUVE' | 'REJETE';

export interface WorkflowTransition {
  id?: number;
  decision: WorkflowDecision;
  /** Code de l'étape de destination : clé stable, à préférer au rang. */
  toStepCode?: string | null;
  /** La décision clôt le circuit, au lieu de mener à une autre étape. */
  terminal?: boolean;
  toStepOrder?: number | null;
  requiredRole?: string | null;
  label?: string | null;
}

export interface WorkflowStep {
  id?: number;
  /** Identifiant fonctionnel fixé à la création, non modifiable ensuite. */
  code?: string | null;
  nomEtape: string;
  stepOrder: number;
  responsableRole: string;
  description?: string;
  transitions?: WorkflowTransition[];
  stepTemplateId?: string | null;
  /** Modèle d'e-mail envoyé au responsable à l'arrivée du dossier sur l'étape. */
  emailTemplateCode?: string | null;
  /** Champs que le responsable doit renseigner pour décider. */
  fields?: WorkflowStepField[];
}

export interface WorkflowStepField {
  id?: number | null;
  fieldName: string;
  fieldLabel: string;
  /** Valeurs de l'énumération FieldType du serveur : TEXT, NUMERIC, SELECT, DATE, FILE. */
  type: string;
  required: boolean;
  options?: string | null;
}

export interface WorkflowStepTemplate {
  id?: string;
  /** Code fonctionnel du catalogue : unique, immuable, hérité par les étapes qui s'en inspirent. */
  code?: string | null;
  nomEtape: string;
  responsableRole: string;
  description?: string;
  createdAt?: string;
}

export interface DocumentWorkflow {
  id?: string;
  nom: string;
  documentType?: string;
  resourceType?: string;
  description?: string;
  steps: WorkflowStep[];
  createdAt?: string;
  createdBy?: string;
}