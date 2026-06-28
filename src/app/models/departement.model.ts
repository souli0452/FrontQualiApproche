import { UserInfos } from "./auth.model";

export interface Departement extends UserInfos {
    id: string;
    libelleDepartement: string;
    descriptionDepartement: string;
}