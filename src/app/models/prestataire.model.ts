import { UserInfos } from "./auth.model";

export interface Prestataire extends UserInfos {
    id: string;
    nomPrestataire: string;
    adressePrestataire: string;
    telephonePrestataire: string;
    contactPrincipalPrestataire: string;
    emailPrestataire: string;
    siteWebPrestataire: string;
    statutPrestataire: string
}