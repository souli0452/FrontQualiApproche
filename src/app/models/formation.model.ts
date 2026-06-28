import { UserInfos } from "./auth.model";

export interface Formation extends UserInfos {
    id?: string;
    libelle?: string;
    description?: string;
    prerequis: string;
    objectif: string;
    competence: string
}