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
    /** Nom d'origine du rapport chargé, extension comprise (absent pour un chargement ancien). */
    nomFichierRapport?: string;
    /** L'utilisateur connecté est-il responsable ou auditeur associé de cet audit ? Calculé par le serveur. */
    jeSuisDeLEquipe?: boolean;
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

/** Le plan d'audit (B8) ; ses dates sont celles de l'audit. */
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
    moyensNecessaires?: string;
    origine?: string;
    fichierCharge?: boolean;
    /** Nom d'origine du plan reçu, extension comprise (absent pour un chargement ancien). */
    nomFichierCharge?: string;
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

/**
 * Un auditeur du vivier. Il désigne un utilisateur (`utilisateurId`) : nom, prénom et e-mail
 * viennent de l'annuaire, jamais d'une saisie.
 */
export interface AuditeurFiche {
    id?: string;
    utilisateurId?: string;
    nom?: string;
    prenom?: string;
    email?: string;
    domainesHabilites?: string[];
    certifications?: string[];
    disponibilite?: string;
    structureAppartenance?: string;
    statut?: string;
    niveauHabilitation?: string;
    processusGeres?: string[];
    scoreEvaluationMoyen?: number;
    auditsRealises12Mois?: number;
    /** Lu dans l'annuaire, d'après `utilisateurId` : le serveur ne le sert pas. */
    nomComplet?: string;
}

/** Une note d'auditeur sur un critère, à un niveau : critères et niveaux viennent du paramétrage (referentiel-service). */
export interface EvaluationAuditeur {
    id?: string;
    auditId?: string;
    auditeurId?: string;
    critereId?: string;
    critereLibelle?: string;
    niveauId?: string;
    niveauLibelle?: string;
    dateEvaluation?: string;
    commentaire?: string;
    statut?: 'BROUILLON' | 'VALIDEE';
}

/** Critère et niveau d'évaluation des auditeurs, paramétrés par direction. */
export interface CritereEvaluationAuditeur {
    id?: string;
    libelle?: string;
    actif?: boolean;
}

export interface NiveauEvaluationAuditeur {
    id?: string;
    libelle?: string;
    ordre?: number;
    actif?: boolean;
    /** Teinte paramétrée, en #RRGGBB ; absente, elle se déduit du rang (voir couleurDuNiveau). */
    couleur?: string;
}

/** Les teintes par défaut de l'échelle, du plus bas au plus haut. */
const TEINTES_PAR_RANG = ['#dc2626', '#f59e0b', '#2563eb', '#65a30d', '#15803d'];

/**
 * La couleur d'un niveau d'évaluation : celle du paramétrage, ou à défaut celle de son rang dans
 * l'échelle (rouge pour le plus bas, vert pour le plus haut).
 */
export function couleurDuNiveau(n: NiveauEvaluationAuditeur | null | undefined, echelle: NiveauEvaluationAuditeur[]): string {
    if (!n) return '#94a3b8';
    if (n.couleur) return n.couleur;
    const i = echelle.findIndex(x => x.id === n.id);
    const r = echelle.length > 1 && i >= 0 ? i / (echelle.length - 1) : 1;
    return TEINTES_PAR_RANG[r < 0.2 ? 0 : r < 0.4 ? 1 : r < 0.6 ? 2 : r < 0.8 ? 3 : 4];
}

/** Un point de contrôle d'une checklist, assigné à un auditeur. */
export interface PointControle {
    id?: string;
    checklistId?: string;
    chapitreISO?: string;
    libelle?: string;
    question?: string;
    preuveAttendue?: string;
    auditeurAssigneId?: string;
    constatId?: string;
    statutConstat?: StatutConstat;
}

export interface ChecklistAudit {
    id?: string;
    nom?: string;
    chapitreISO?: string;
    statut?: 'BROUILLON' | 'PUBLIEE' | 'ARCHIVEE';
    points?: PointControle[];
}

/** Comparaison de deux périodes du programme (D17). */
export interface PeriodeComparee {
    debut?: string;
    fin?: string;
    evaluations?: number;
    scoreMoyen?: number | null;
    parDomaine?: Record<string, number>;
}

export interface ComparaisonPeriodes {
    periode1?: PeriodeComparee;
    periode2?: PeriodeComparee;
    ecartsParChapitre?: { chapitre?: string; periode1?: number; periode2?: number; evolution?: string }[];
}

/** Le bilan d'une reprise de transmission des écarts vers le module Non-conformités. */
export interface TransmissionEcarts {
    transmis?: number;
    echecs?: string[];
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
    /** Faux : retiré du paramétrage, il ne se propose plus mais reste lisible sur les audits qui le portent. */
    actif?: boolean;
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
    constatId?: string;
    nom?: string;
    ext?: string;
    type?: string;
}

/** Ce que le module Audit attend de l'utilisateur, en nombres : un compteur par onglet, et leur somme pour le menu. */
export interface NotificationsAuditResume {
    total: number;
    programme: number;
    constats: number;
    suivi: number;
    checklists: number;
    signatures: number;
}

/** Une ligne de la cloche, recalculée par le serveur à chaque appel : elle disparaît une fois le travail fait. */
export interface NotificationAudit {
    source: string;
    code: string;
    titre: string;
    detail: string;
    gravite: 'INFO' | 'ATTENTION' | 'URGENT';
    nombre: number;
}
