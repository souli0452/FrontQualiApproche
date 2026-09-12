import { PieceJointe } from "src/app/utils/fichier/fichier-utils";
import { PlanAction } from "./plan-action.model";
import { UserInfos } from "@features/gestion-utilisateurs/models/utilisateur.model";

/**
 * Données strictes pour la Déclaration d'une Non-Conformité (Saisie Agent)
 */
export interface DeclarationNonConformite {
    id?: string;
    status?: string;
    etatTraitement?: string;
    
    // Constat
    justification?: string;
    actionDsc?: string;
    
    // Qualification
    niveauNonConformiteId?: string;
    niveauNonConformiteLibelle?: string;
    typeNonConformiteId?: string;
    typeNonConformiteLibelle?: string;
    
    // Structure émettrice
    structureSoumissionId?: string;
    structureSoumissionLibelle?: string;
    typeProcessusId?: string;
    typeProcessusLibelle?: string;
    
    fichiers?: PieceJointe[];
}

/**
 * Dossier complet de Non-Conformité (Cycle de vie complet, Consultation & Suivi)
 */
export interface NonConformite extends DeclarationNonConformite, UserInfos {
    numeroReference?: string;
    workflowStatus?: string;
    workflowId?: string;
    
    // Affectation & Traitement
    structureResponsableId?: string;
    structureResponsableSigle?: string;
    userImputId?: string;
    userImputFullName?: string;
    planActions?: PlanAction[];
    
    // Validations & Visas
    pertinancePilote?: string;
    justificationPilote?: string;
    pertinanceRs?: string;
    justificationRs?: string;
    observationsRq?: string;
    observationsCloture?: string;
    efficaciteLibelle?: string;
    dateClotureRq?: string;
}
