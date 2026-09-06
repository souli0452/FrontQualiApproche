import { WorkflowStateDto } from '../../../models/workflow.model';

export type TypeDemande = 'MODIFICATION' | 'SUPPRESSION';

export type EtatDemande = 'EN_COURS' | 'ACCEPTEE' | 'REFUSEE' | 'EXECUTEE';

/**
 * Demande formelle de modification ou de suppression portant sur un document qualité publié.
 */
export interface DemandeDocumentDto {
    id: string;
    documentId: string;
    documentNumber?: string;
    documentTitre?: string;
    type: TypeDemande;
    etat: EtatDemande;
    objectif: string;
    description?: string;
    structureId?: string;
    structureLibelle?: string;
    demandeurId?: string;
    demandeurNom?: string;
    pieceJointeNom?: string;
    workflowId?: string;
    currentEtape?: string;
    createdAt?: string;
    dateDecision?: string;
    motifDecision?: string;
    dateExecution?: string;
    enAttenteExecution?: boolean;
    workflowState?: WorkflowStateDto;
}
