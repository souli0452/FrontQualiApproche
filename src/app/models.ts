import {Validators} from "@angular/forms";

export interface Formation extends UserInfos{
    id?:string;
    libelle?:string;
    description?:string;
    prerequis:string;
    objectif:string;
    competence:string
}

export interface UserInfos {
    createdById?: string;
    createdAt?: Date;
    updateById?: string;
    updateAt?: Date;
    currentUserEmail?: string;
    currentUserfullName?: string;
}


export interface Prestataire extends UserInfos{
    id:string;
    nomPrestataire:string;
    adressePrestataire:string;
    telephonePrestataire:string;
    contactPrincipalPrestataire:string;
    emailPrestataire:string;
    siteWebPrestataire:string;
    statutPrestataire:string
}

export interface Fournisseur extends UserInfos{
    id:string;
    nom:string;
    adresse:string;
    telephone:string;
    email:string;
    siteWeb:string;
    statut:string;
    criteresEvaluation? : CritereEvaluation [] ;
}

export interface Reglementation extends UserInfos{
    id:string;
    nomReglementation:string;
    descriptionReglementation:string;
    organismeReglementation:string;

}

export interface CritereEvaluation extends UserInfos{
    id:string;
    libelleCrictereEvaluation:string;
    descriptionCrictereEvaluation:string;
    noteAtribuerCritere:string;
    delaisLivraison:string;
    serviceClient: string;
    commentaireEvaluation:string;

}

export interface Reclamation extends UserInfos{
    id:string;
    numeroReference:string;
    nomDemendeur:string;


}

export interface Departement extends UserInfos{
    id:string;
    libelleDepartement:string;
    descriptionDepartement:string;
}

export interface CategorieFichier extends UserInfos{
    id:string;
    libelleCategorie:string;
    descriptionCategorie:string;
    necessiteDemandeCreationFichier:string;


}

export interface ActionCorrectivePreventive extends UserInfos{
    id:string;
    libelle:string;
    description:string;
    responsable:string;
  //  statut:StatutEnum;
  type:string;
  dateDebut:string;
  dateFin:string;
  reclamation:Reclamation;
  //risques? : Risque [] ;
  //exigences? : Exigence [] ;
}

export interface TypeNonConformite extends UserInfos{
    id:string;
    libelle:string;
    description:string;
}

export interface ActionNonConformite extends UserInfos{
    id:string;
    libelle:string;
    description:string;
}
export interface NiveauNonConformite extends UserInfos{
    id:string;
    libelle:string;
    description:string;
}

export interface TypeProcessus extends UserInfos{
    id:string;
    libelle:string;
    description:string;
}

// export interface NonConformite extends UserInfos{
//     id:string;
//     intitule:string;
//     typeNonConformite:string;
//     numeroReference:string;
//     priorite:string;
//     detailleSuplementaire:string;
//     dateEcheance:string;
//     statut:string;
//     commentaires:string;
//     reclamation:Reclamation;
//     //fichier?:Fichier[];
//     // audites?: Audite[];
// }

export interface Fichier extends UserInfos{
    fichierBase64?: string;
    typeFichier?: string;
    nomFichier?: string;
    tailleFichier?: number;
  }

  
  export interface NonConformite extends UserInfos{
    id?: string;
    numeroReference?: string;
    nomProcessus?: string;
    origineService?: string;
    fonctionEmetteur?: string;
    dateVisaEmetteur?: string;  // Le format de date sera manipulé en chaîne (ex: "dd-MM-yyyy HH:mm")
    justification?: string;
    efficaciteId?: string;  // UUID, sous forme de chaîne
    niveauNonConformiteId?: string;  // UUID, sous forme de chaîne
    actionId?: string;  // UUID, sous forme de chaîne
    typeNonConformiteId?: string;  // UUID, sous forme de chaîne
    typeProcessusId?: string;  // UUID, sous forme de chaîne
    delaisMiseOeuvre?: string;
    etatTraitement?: string;  // Enum ou classe de type Etat
    observationsRq?: string;
    dateObservationsRq?: string;
    observationsCloture?: string;
    dateVerification?: string;
    dispositionPreventives?: string;
    dateClotureRq?: string;
    status?: string;  // Enum ou classe de type Status
    fichiers?: Fichier[];  // Liste des fichiers associés
    planActions?: PlanAction[];  // Liste des actions de plan associées
  }

  export interface PlanAction extends UserInfos {
    numeroOdre: string;
    causeIdentifiees: string;
    solutionRetenues: string;
    responsable: string;
    mail: string;
    numeroTelephone: string;
    dateEcheance: string;
    nonConformite: NonConformite; // Référence à l'entité NonConformite
  }

export interface Risque extends UserInfos{
    id: string;
    libelle: string;
    description: string;
    niveau: string;
    statut: string;
    plantAttenuation: string;
    commentaireRisque: string;
    evidenceRisque: string;
   // actionCorrectivePreventives?: ActionCorrectivePreventive[];

}

export interface Audite extends UserInfos{
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

export interface Produit extends UserInfos{
    id: string;
    libelleProduit: string;
    descriptionProduit: string;
    audites?: Audite[];

}
export interface Exigence extends UserInfos{
    id: string;
    libelleExigence: string;
    descriptionExigence: string;
    dateEcheanceExigence: string;
    statutConformite: string;
    audites?: Audite[];
    reglementations?: Reglementation[];
    formations?: Formation[];
}


export interface FormGroupColumn extends UserInfos {
    field: string;
    type: string;
    label: string;
    header: string;
    visible: boolean;
    required: boolean;
    optionLabel?: string;
    dropdownList?: any[];
    fileNb?: number;
    validators?: Validators;
    key?: string;
    readonly?: boolean;
}

export interface TableColumn {
    field: string;
    type: string;
    header: string;
    filter: boolean;
    sort?: boolean;
    optionLabel?: string;
    labelTrue?: string;
    labelFalse?: string;
    width?: string;
    compute?: boolean;
    editable?: boolean;
}

export interface DropdownSelector {
    field: string;
    dropdownEntries: any[];
}

export interface DropdownData {
    data?: Array<DropdownSelector>;
}

export interface MultiSelectSelector {
    field: string;
    optionLabel?: string;
    multiselectEntries: any[];
}



export interface KcLoginRequest {
    username: String;
    password: String;
    refreshToken: String;
}

export interface KcUser {
    id: string;
    createdTimestamp: number;
    username: string;
    enabled: boolean;
    emailVerified: boolean;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
}
