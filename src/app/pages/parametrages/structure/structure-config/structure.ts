import { TypeStructure } from "../../../../enums/enums";
import { UserInfos } from "../../../../models/auth.model";


export interface Structure extends UserInfos {
  id?: string;
  libelleCourt?: string;
  libelleLong?: string;
  description?: string;
  directionId?: string;
  libelleDirection?: string;
  /**
   * Catégorie de processus dont relève la structure.
   *
   * Le serveur la porte depuis toujours (`Structure.typeProcessus`, exposée par `StructureDto`
   * en `typeProcessusId` / `typeProcessusLibelle`) ; seule la saisie manquait, si bien que la
   * colonne restait vide quel que soit le paramétrage.
   */
  typeProcessusId?: string;
  typeProcessusLibelle?: string;
  typeStructure?: TypeStructure;
  region?: string;
  email?: string;
  ville?: string;
  autoriteSignataire?: string;
  titreAutoriteSignataire?: string;
  nomPrenomSignataire?: string;
  titreHonorifiqueSignataire?: string;
}

