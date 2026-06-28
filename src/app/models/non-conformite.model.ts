import { PieceJointe } from "../utils";
import { UserInfos } from "./auth.model";
import { PlanAction } from "./plan-action.model";
import { Reclamation } from "./reclamation.model";

export interface NonConformite extends UserInfos {
    id?: string;
    numeroReference?: string;
    nomProcessus?: string;
    origineService?: string;
    origineServiceLibelleCourt?: string;
    originNonConformiteId?: string;
    typeProcessusLibelle?: string;
    originNonConformiteLibelle?: string;
    actionLibelle?: string;
    actionDsc?: string;
    origineId?: string;
    structureSoumissionLibelle?: string;
    structureSoumissionId?: string;
    fonctionEmetteur?: string;
    dateVisaEmetteur?: string;  // Le format de date sera manipulé en chaîne (ex: "dd-MM-yyyy HH:mm")
    justification?: string;
    efficaciteId?: string;  // UUID, sous forme de chaîne
    niveauNonConformiteId?: string;  // UUID, sous forme de chaîne
    actionId?: string;  // UUID, sous forme de chaîne
    typeNonConformiteId?: string;  // UUID, sous forme de chaîne
    typeProcessusId?: string;  // UUID, sous forme de chaîne
    delaisMiseOeuvre?: string;
    etatTraitement?: string;  // Enum ou classe de type Etat
    observationsRq?: string;
    niveauNonConformiteLibelle?: string;
    typeNonConformiteLibelle?: string;
    dateObservationsRq?: string;
    observationsCloture?: string;
    dateVerification?: string;
    dispositionPreventives?: string;
    dateClotureRq?: string;
    status?: string;  // Enum ou classe de type Status
    fichiers?: PieceJointe[];  // Liste des fichiers associés
    planActions?: PlanAction[];  // Liste des actions de plan associées
}

export interface NiveauNonConformite extends UserInfos {
    id: string;
    libelle: string;
    description: string;
}

export interface OrigineNonConformite extends UserInfos {
    id: string;
    libelle: string;
    description: string;
}

export interface ActionNonConformite extends UserInfos {
    id: string;
    libelle: string;
    description: string;
}

export interface ActionCorrectivePreventive extends UserInfos {
    id: string;
    libelle: string;
    description: string;
    responsable: string;
    //  statut:StatutEnum;
    type: string;
    dateDebut: string;
    dateFin: string;
    reclamation: Reclamation;
    //risques? : Risque [] ;
    //exigences? : Exigence [] ;
}