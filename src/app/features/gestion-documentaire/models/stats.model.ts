/**
 * Synthèse statistique des documents qualité.
 */
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
