import { TypeStructure } from "../../../enums";
import { UserInfos } from "../../../models";


export interface Structure extends UserInfos {
  id?: string;
  libelleCourt?: string;
  libelleLong?: string;
  description?: string;
  directionId?: string;
  libelleDirection?: string;
  typeStructure?: TypeStructure;
  region?: string;
  email?: string;
  ville?: string;
  autoriteSignataire?: string;
  titreAutoriteSignataire?: string;
  nomPrenomSignataire?: string;
  titreHonorifiqueSignataire?: string;
}

