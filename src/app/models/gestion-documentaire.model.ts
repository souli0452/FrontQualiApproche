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
  status?: string;
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
}

export interface QmsDocumentVersion {
  id?: number;
  documentId: string;
  versionLabel: string;
  dateCreation: string;
  createdBy: string;
  comment: string;
  alfrescoNodeId: string;
}

export interface QmsAuditLog {
  id?: number;
  action: string;
  documentNumber: string;
  timestamp: string;
  username: string;
  details: string;
}