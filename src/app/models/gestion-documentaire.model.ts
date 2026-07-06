import { UserInfos } from "./auth.model";

// export interface QmsDocumentType extends UserInfos {
//     id?: string;
//     code: string;
//     libelle: string;
//     folderName: string;
// }

// export interface DocumentQms extends UserInfos {
//     id?: string;
//     documentNumber?: string;
//     documentType: string;
//     serviceId: string;
//     serviceLibelle?: string;
//     serviceSigle?: string;
//     redacteur: string;
//     status?: string;
//     versionMajeure?: number;
//     versionMineure?: number;
//     dateVigueur?: string;
//     dateProchRevision?: string;
//     periodiciteMois?: number;
//     confidentiel?: boolean;
//     documentExterne?: boolean;
//     organismeEmetteur?: string;
//     referenceOfficielle?: string;
//     datePublication?: string;
//     domaine?: string;
//     statutLegal?: string;
//     alfrescoNodeId?: string;
//     ncReference?: string;
//     archived?: boolean;
// }


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
  organismeEmetteur?: string;
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
  documentsByStatus: Record<string, number>;
  documentsByType: Record<string, number>;
  documentsByService: Record<string, number>;
  documentsByDomaine: Record<string, number>;
  delayedReviewsCount: number;
  confidentialCount: number;
  externalCount: number;
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

export interface WorkflowStep {
  id?: number;
  nomEtape: string;
  stepOrder: number;
  responsableRole: string;
  description?: string;
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