import { UserInfos } from "./auth.model";
import { NonConformite } from "./non-conformite.model";

export interface PlanAction extends UserInfos {
    id?: number;
    numeroOdre: string;
    causeIdentifiees: string;
    solutionRetenues: string;
    responsable: string;
    mail: string;
    numeroTelephone: string;
    dateEcheance: string;
    nonConformite: NonConformite; // Référence à l'entité NonConformite
}