import { UserInfos } from "./auth.model";

export interface Fichier extends UserInfos {
    fichierBase64?: string;
    typeFichier?: string;
    nomFichier?: string;
    tailleFichier?: number;
}

export interface CategorieFichier extends UserInfos {
    id: string;
    libelleCategorie: string;
    descriptionCategorie: string;
    necessiteDemandeCreationFichier: string;
}