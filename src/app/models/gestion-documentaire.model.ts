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
  id?: string;
  documentNumber?: string;
  documentType: string;
  serviceId: string;
  serviceLibelle?: string;
  serviceSigle?: string;
  redacteur: string;
  esTraiter?: boolean;
  enRetardRevision?: boolean;
  obsolete?: boolean;
  currentStep?: WorkflowStep;
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
  workflowStatus?: string;
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
  toStepOrder?: number | null;
  requiredRole?: string | null;
  label?: string | null;
}

export interface WorkflowStep {
  id?: number;
  nomEtape: string;
  stepOrder: number;
  responsableRole: string;
  description?: string;
  transitions?: WorkflowTransition[];
  stepTemplateId?: string | null;
}

export interface WorkflowStepTemplate {
  id?: string;
  nomEtape: string;
  responsableRole: string;
  description?: string;
  createdAt?: string;
}

export interface DocumentWorkflow {
  id?: string;
  nom: string;
  documentType?: string;
  description?: string;
  steps: WorkflowStep[];
  createdAt?: string;
  createdBy?: string;
}