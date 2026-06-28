import { UserInfos } from "./auth.model";

export interface Reclamation extends UserInfos {
    id: string;
    numeroReference: string;
    nomDemendeur: string;
}