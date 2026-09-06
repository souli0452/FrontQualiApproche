/**
 * Critères de filtrage applicables aux tableaux et listes de Non-Conformités.
 */
export interface NcFilter {
    code?: string;
    dateDebut?: Date;
    dateFin?: Date;
    categorieProcessusId?: string;
    structureId?: string;
    origineId?: string;
    niveauId?: string;
    statut?: string;
    process?: any;
    gravite?: any;
    origine?: any;
    [key: string]: any;
}
