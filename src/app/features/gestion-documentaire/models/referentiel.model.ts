/**
 * Type de document qualité (Procédure, Instruction, Enregistrement, etc.).
 */
export interface QmsDocumentType {
    id?: string;
    code: string;
    libelle: string;
    folderName: string;
    createdAt?: string;
    createdById?: string;
    currentUserfullName?: string;
}

/**
 * Niveau de priorité d'un document (Urgent, Normal, Faible).
 */
export interface PrioriteDocument {
    id?: string;
    libelle: string;
    description?: string;
    ordre?: number;
    score?: number;
    couleur?: string;
}

/**
 * Niveau de confidentialité et rôles admis à consulter les documents qui le portent.
 */
export interface NiveauConfidentialite {
    id?: string;
    libelle: string;
    description?: string;
    ordre?: number;
    rolesAutorises?: string[];
    rolesLibelle?: string;
}

/**
 * Domaine d'application d'un document (RH, Production, Achats, etc.).
 */
export interface DomaineApplication {
    id?: string;
    libelle: string;
    description?: string;
    ordre?: number;
}
