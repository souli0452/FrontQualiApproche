import { UserInfos } from '../../../models/auth.model';

/**
 * Entité principale représentant un Document Qualité (QMS) dans QualiSira.
 * Aligné sur les standards ISO 9001 (traçabilité, révision, périmètre, cycle de vie).
 */
export interface DocumentQms {
    /**
     * Avertissement rendu au dépôt ou au reclassement : le niveau retenu n'admet aucun des rôles
     * qui décident des étapes du circuit. Le document est enregistré malgré tout.
     */
    avertissementConfidentialite?: string | null;
    workflowState?: any;
    /**
     * L'appelant relève-t-il de la structure du document (ou l'accompagne-t-il au titre de la qualité) ?
     */
    suiviInterneAutorise?: boolean;
    /** Priorité et niveau de confidentialité : l'identifiant rattache, le libellé s'affiche. */
    prioriteId?: string;
    prioriteLibelle?: string;
    niveauConfidentialiteId?: string;
    niveauConfidentialiteLibelle?: string;

    id?: string;
    documentNumber?: string;
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

    /**
     * Rang de révision, à partir de zéro (v0).
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

/**
 * Version archivée ou historique d'un document.
 */
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

/**
 * Piste d'audit des actions survenues sur un document (consultation, approbation, partage, etc.).
 */
export interface QmsAuditLog {
    id?: number;
    action: string;
    documentNumber: string;
    timestamp: string;
    username: string;
    details: string;
}

/**
 * Habilitation ou droit d'accès accordé à un utilisateur spécifique sur un document.
 */
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
 * Document partagé avec l'utilisateur connecté (servi à plat par le backend).
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

    partageStructure?: boolean;
    partagePar?: string;
}

/**
 * Étape générique réutilisable dans le catalogue des modèles de circuits de validation.
 */
export interface WorkflowStepTemplate {
    id?: string;
    code?: string | null;
    nomEtape: string;
    responsableRole: string;
    description?: string;
    createdAt?: string;
}
