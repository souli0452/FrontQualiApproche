import { UserInfos } from "./auth.model";
import { CritereEvaluation } from "./critere-evaluation.model";

export interface Fournisseur extends UserInfos {
    id: string;
    nom: string;
    adresse: string;
    telephone: string;
    email: string;
    siteWeb: string;
    statut: string;
    criteresEvaluation?: CritereEvaluation[];
}