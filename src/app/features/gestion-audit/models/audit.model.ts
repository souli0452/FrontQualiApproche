import { StatutAudit, StatutConstat, NiveauRisqueAudit } from './audit-enums';

export interface ActionMaitriseRisque {
    id?: string;
    libelle?: string;
    responsable?: string;
    delai?: string;
    efficacite?: string;
}

export interface Audit {
    id?: string;
    reference?: string;
    referenceRapport?: string;
    objectifsAudit?: string;
    porteeAudit?: string;
    criteresAudit?: string;
    referentiels?: string[];
    domaineRqapbfIds?: string[];
    dateDebutPrevue?: string;
    dateFinPrevue?: string;
    dureeEstimeeJours?: number;
    enRetard?: boolean;
    joursDeRetard?: number;
    niveauRisque?: NiveauRisqueAudit;
    descriptionRisque?: string;
    statut?: StatutAudit;
    origineRapport?: string;
    rapportCharge?: boolean;
    conclusionsRapport?: string;
    recommandationsRapport?: string;
    scoreMaturite?: number;
    typeAuditId?: string;
    typeAuditLibelle?: string;
    processusId?: string;
    siteIds?: string[];
    membreEquipeIds?: string[];
    responsableEquipeId?: string;
    organismeExterne?: string;
    circuitExterne?: boolean;
    checklistIds?: string[];
    actionsMaitriseRisques?: ActionMaitriseRisque[];
}

export interface ConstatAudit {
    id?: string;
    auditId?: string;
    critereAudit?: string;
    observation?: string;
    statut?: StatutConstat;
    datePublication?: string;
    dateSaisie?: string;
    commentaireEquipe?: string;
    natureId?: string;
    natureLibelle?: string;
    natureCouleur?: string;
    nonConformite?: boolean;
    checklistId?: string;
    pointControleId?: string;
    redacteurId?: string;
    redacteurUtilisateurId?: string;
    nonConformiteId?: string;
    transmissionEnAttente?: boolean;
}

export interface ActivitePlan {
    id?: string;
    horaireDebut?: string;
    horaireFin?: string;
    libelleActivite?: string;
    processusConcerne?: string;
    auditeur?: string;
    personnesAuditees?: string;
}

export interface PlanAudit {
    id?: string;
    auditId?: string;
    reference?: string;
    objectifs?: string;
    portee?: string;
    criteres?: string;
    methodesAudit?: string[];
    lieu?: string;
    langue?: string;
    dateDebut?: string;
    dateFin?: string;
    moyensNecessaires?: string;
    origine?: string;
    fichierCharge?: boolean;
    statut?: string;
    datePartage?: string;
    activites?: ActivitePlan[];
}

export interface TableauDeBordRappel {
    auditId?: string;
    auditReference?: string;
    regle?: string;
    delaiJours?: number;
    destinataires?: string;
    dateRappel?: string;
}

export interface TableauDeBord {
    annee?: number;
    total?: number;
    planifies?: number;
    enPreparation?: number;
    enCours?: number;
    enRetard?: number;
    clotures?: number;
    annules?: number;
    tauxCloture?: number;
    auditsPlanifies?: number;
    auditsRealises?: number;
    tauxRealisation?: number;
    auditsEnRetard?: number;
    ecartsDetectes?: number;
    scoreMaturiteMoyen?: number;
    radarParDomaine?: Record<string, number>;
    rappelsRecents?: TableauDeBordRappel[];
}

export interface AvancementAudit {
    statut?: StatutAudit;
    statutPlan?: string;
    planPartage?: boolean;
    pointsDeControle?: number;
    pointsRenseignes?: number;
    pourcentageConstats?: number;
    constatsBrouillon?: number;
    constatsCompiles?: number;
    constatsPublies?: number;
    criteresAEvaluer?: number;
    criteresNotes?: number;
    criteresPublies?: number;
    pourcentageRqapbf?: number;
    cloturable?: boolean;
    raisonsDeNePasCloturer?: string[];
}

export interface CompilationGroupe {
    natureId?: string;
    libelle?: string;
    couleur?: string;
    genereNonConformite?: boolean;
    nombre?: number;
    compiles?: number;
}

export interface CompilationConstats {
    total?: number;
    compiles?: number;
    publies?: number;
    parNature?: CompilationGroupe[];
}

export interface ConstatRapport {
    id?: string;
    pointControle?: string;
    critere?: string;
    nature?: string;
    natureCouleur?: string;
    observation?: string;
    datePublication?: string;
    nonConformiteId?: string;
}

export interface SignatureAudit {
    id?: string;
    auditId?: string;
    signataireId?: string;
    signataire?: string;
    fonctionSignataire?: string;
    ordre?: number;
    statut?: string;
    dateSignature?: string;
    motifRefus?: string;
}

export interface RapportAudit {
    audit?: Audit;
    methodesAudit?: string[];
    syntheseParNature?: CompilationGroupe[];
    constats?: ConstatRapport[];
    ecarts?: ConstatRapport[];
    scoreRqapbf?: number;
    resultatsRqapbfParDomaine?: Record<string, number>;
    signatures?: SignatureAudit[];
}

export interface NoeudReferentiel {
    id?: string;
    code?: string;
    libelle?: string;
    typeNoeud?: string;
    preuveAttendue?: string;
    ordre?: number;
    parentId?: string;
    enfants?: NoeudReferentiel[];
}

export interface NotationCritere {
    id?: string;
    auditId?: string;
    auditReference?: string;
    noeudId?: string;
    noeudCode?: string;
    noeudLibelle?: string;
    preuveAttendue?: string;
    niveau?: string;
    score?: number;
    preuve?: string;
    commentaire?: string;
    constatRetenu?: string;
    statut?: string;
    nonConformiteId?: string;
    transmissionEnAttente?: boolean;
}

export interface EvaluationRQAPBF {
    id?: string;
    auditId?: string;
    dateEvaluation?: string;
    scoreGlobal?: number;
    niveauConformite?: string;
    statut?: string;
    notations?: NotationCritere[];
    resultatsParDomaine?: Record<string, number>;
    scoreOfficiel?: number;
    resultatsOfficielsParDomaine?: Record<string, number>;
    scoresParNoeud?: Record<string, number>;
    criteresNotes?: number;
    criteresPublies?: number;
}

export interface AuditeurFiche {
    id?: string;
    utilisateurId?: string;
    nom?: string;
    prenom?: string;
    email?: string;
    telephone?: string;
    qualification?: string;
    domainesHabilites?: string[];
    certifications?: string[];
    disponibilite?: string;
    structureAppartenance?: string;
    statut?: string;
    niveauHabilitation?: string;
    processusGeres?: string[];
    scoreEvaluationMoyen?: number;
    auditsRealises12Mois?: number;
}

export interface EvaluationAuditeur {
    id?: string;
    auditId?: string;
    auditeurId?: string;
    statut?: string;
}

export interface TypeAuditRef {
    id?: string;
    libelle?: string;
    circuitExterne?: boolean;
}

export interface TypeConstatRef {
    id?: string;
    libelle?: string;
    couleur?: string;
    genereNonConformite?: boolean;
}

export interface SiteAudit {
    id?: string;
    nom?: string;
    adresse?: string;
}

export interface AuditFiltres {
    search?: string;
    statuts?: StatutAudit[];
    typeAuditId?: string;
    domaineId?: string;
    niveauRisque?: NiveauRisqueAudit;
    responsableId?: string;
    enRetard?: boolean;
    mesAudits?: boolean;
    annee?: number;
}

export interface PreuveConstat {
    id?: string;
    nom?: string;
    taille?: number;
    type?: string;
}
