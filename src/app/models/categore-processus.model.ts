import { UserInfos } from "./auth.model";

export interface CategorieProcessus extends UserInfos {
    id: string;
    libelle: string;
    description: string;
}