import { UserInfos } from '../../../models/auth.model';
import { Reclamation } from '../../../models/reclamation.model';
import { NonConformite } from './non-conformite.model';

/**
 * Plan d'action d'une Non-Conformité (actions correctives et préventives issues de l'analyse des causes).
 */
export interface PlanAction extends UserInfos {
    // --- NOUVELLES APPELLATIONS CLAIRES ---
    numeroOrdre?: string;
    causeIdentifiee?: string;
    solutionRetenue?: string;
    nonConformiteId?: string;
    responsableNomComplet?: string;
    actionCorrective?: string;

    // --- PROPRIÉTÉS HISTORIQUES & BACKEND ---
    id?: number;
    numeroOdre: string;
    causeIdentifiees: string;
    solutionRetenues: string;
    responsable: string;
    mail: string;
    numeroTelephone: string;
    dateEcheance: string;
    nonConformite?: NonConformite;
}

/**
 * Type d'action applicable à une Non-Conformité (Curative, Corrective, Préventive...).
 */
export interface ActionNonConformite extends UserInfos {
    id: string;
    libelle: string;
    description: string;
}

/**
 * Action Corrective / Préventive (CAPA) globale ou liée aux réclamations.
 */
export interface ActionCorrectivePreventive extends UserInfos {
    id: string;
    libelle: string;
    description: string;
    responsable: string;
    type: string;
    dateDebut: string;
    dateFin: string;
    reclamation?: Reclamation;
}
