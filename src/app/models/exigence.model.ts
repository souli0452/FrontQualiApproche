import { Audite } from "./audite.model";
import { UserInfos } from "./auth.model";
import { Formation } from "./formation.model";
import { Reglementation } from "./reglementation.model";

export interface Exigence extends UserInfos {
    id: string;
    libelleExigence: string;
    descriptionExigence: string;
    dateEcheanceExigence: string;
    statutConformite: string;
    audites?: Audite[];
    reglementations?: Reglementation[];
    formations?: Formation[];
}