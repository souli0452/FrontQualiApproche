import { UserInfos } from "./auth.model";

export interface CritereEvaluation extends UserInfos {
    id: string;
    libelleCrictereEvaluation: string;
    descriptionCrictereEvaluation: string;
    noteAtribuerCritere: string;
    delaisLivraison: string;
    serviceClient: string;
    commentaireEvaluation: string;

}