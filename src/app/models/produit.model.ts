import { Audite } from "./audite.model";
import { UserInfos } from "./auth.model";

export interface Produit extends UserInfos {
    id: string;
    libelleProduit: string;
    descriptionProduit: string;
    audites?: Audite[];
}