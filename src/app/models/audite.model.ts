import { UserInfos } from "./auth.model";
import { Departement } from "./departement.model";
import { Produit } from "./produit.model";
import { Risque } from "./risque.model";
import { Exigence } from "./exigence.model";
import { NonConformite } from "@features/non-conformite/models/non-conformite.model";

export interface Audite extends UserInfos {
    id: string;
    libelleAudite: string;
    descriptionAudite: string;
    resultatAudite: string;
    statutAudite: string;
    objectifAudite: string;
    typeAudite: string;
    FounisseurId: string;
    produits?: Produit[];
    risques?: Risque[];
    nonConformites?: NonConformite[];
    exigences?: Exigence[];
    departements?: Departement[];
}