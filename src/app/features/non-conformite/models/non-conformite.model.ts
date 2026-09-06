import { PieceJointe } from '../../../utils/fichier/fichier-utils';
import { UserInfos } from '../../../models/auth.model';
import { PlanAction } from './plan-action.model';

/**
 * Entité principale représentant une Non-Conformité (NC) dans le système QualiSira.
 * Aligné sur les standards ISO 9001 et le workflow de traitement qualité.
 */
export interface NonConformite extends UserInfos {
    // --- NOUVELLES APPELLATIONS CLAIRES (ISO 9001 / AI-READY) ---
    numeroDeReference?: string;
    description?: string;
    sourceDeNonConformiteId?: string;
    sourceDeNonConformiteLibelle?: string;
    categorieProcessusId?: string;
    categorieProcessusLibelle?: string;
    structureDeSoumissionId?: string;
    structureDeSoumissionLibelle?: string;
    agentImputeId?: string;
    agentImputeNomComplet?: string;
    agentImputeEmail?: string;
    actionImmediate?: string;
    pertinencePilote?: string;
    pertinenceRs?: string;
    etatDeTraitement?: string;

    // --- PROPRIÉTÉS HISTORIQUES & COMPATIBILITÉ BACKEND ---
    id?: string;
    nomProcessus?: string;
    origineService?: string;
    origineServiceLibelleCourt?: string;
    originNonConformiteId?: string;
    originNonConformiteLibelle?: string;
    actionLibelle?: string;
    origineId?: string;
    fonctionEmetteur?: string;
    dateVisaEmetteur?: string;
    efficaciteId?: string;
    niveauNonConformiteId?: string;
    actionId?: string;
    delaisMiseOeuvre?: string;
    observationRq?: string;
    niveauNonConformiteLibelle?: string;
    dateObservationsRq?: string;
    observationsCloture?: string;
    dateVerification?: string;
    dispositionPreventives?: string;
    dateClotureRq?: string;
    status?: string;
    fichiers?: PieceJointe[];
    planActions?: PlanAction[];
}
