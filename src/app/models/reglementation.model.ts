import { UserInfos } from "./auth.model";

export interface Reglementation extends UserInfos {
    id: string;
    nomReglementation: string;
    descriptionReglementation: string;
    organismeReglementation: string;

}