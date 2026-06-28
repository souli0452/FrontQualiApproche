import { UserInfos } from "./auth.model";

export interface Risque extends UserInfos {
    id: string;
    libelle: string;
    description: string;
    niveau: string;
    statut: string;
    plantAttenuation: string;
    commentaireRisque: string;
    evidenceRisque: string;
    // actionCorrectivePreventives?: ActionCorrectivePreventive[];
}