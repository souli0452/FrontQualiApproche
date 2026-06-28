import { UserInfos } from "./auth.model";

export interface QmsDocumentType extends UserInfos {
    id?: string;
    code: string;
    libelle: string;
    folderName: string;
}

export interface DocumentQms extends UserInfos {
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
}
