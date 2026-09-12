
import { TypeStructure } from "@core/enums/type-structure.enum";
import { UserInfos } from "../../../models/auth.model";

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

export const REGION_LIST = [
    { value: 'Centre', label: 'Centre' },
    { value: 'Boucle du Mouhoun', label: 'Boucle du Mouhoun' },
    { value: 'Cascades', label: 'Cascades' },
    { value: 'Centre-Est', label: 'Centre-Est' },
    { value: 'Centre-Nord', label: 'Centre-Nord' },
    { value: 'Centre-Ouest', label: 'Centre-Ouest' },
    { value: 'Centre-Sud', label: 'Centre-Sud' },
    { value: 'Est', label: 'Est' },
    { value: 'Hauts-Bassins', label: 'Hauts-Bassins' },
    { value: 'Nord', label: 'Nord' },
    { value: 'Plateau Central', label: 'Plateau Central' },
    { value: 'Sahel', label: 'Sahel' },
    { value: 'Sud-Ouest', label: 'Sud-Ouest' }
];
