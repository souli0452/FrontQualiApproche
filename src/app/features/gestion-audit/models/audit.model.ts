import { StatutAudit, TypeAudit, NiveauRisqueAudit, StatutConstat } from './audit-enums';

export interface Audit {
    id?: string;
    reference?: string;
    libelleProcessus?: string;
    typeAudit?: TypeAudit;
    sites?: string[];
    objectif?: string;
    criteres?: string;
    responsableEquipe?: string;
    auditeurs?: string[];
    niveauRisque?: NiveauRisqueAudit;
    descriptionRisque?: string;
    dateAudit?: string;
    statut?: StatutAudit;
    score?: number;
    createdAt?: string;
    updatedAt?: string;
    createdBy?: string;
}

export interface PlanActiviteAudit {
    id?: string;
    auditId?: string;
    horaire?: string;
    activite?: string;
    processus?: string;
    auditeur?: string;
    personnesAuditees?: string;
    ordre?: number;
}

export interface ConstatAudit {
    id?: string;
    auditId?: string;
    chapitre?: string;
    label?: string;
    question?: string;
    critere?: string;
    preuveAttendue?: string;
    auditeur?: string;
    codeTypeConstat?: string;
    observation?: string;
    statut?: StatutConstat;
    nonConformiteRef?: string;
    createdAt?: string;
}

export interface ActionRisqueAudit {
    id?: string;
    auditId?: string;
    action?: string;
    responsable?: string;
    delai?: string;
    efficaciteLabel?: string;
    efficaciteSeverity?: string;
}

export interface AuditStats {
    total?: number;
    planifies?: number;
    enPreparation?: number;
    enCours?: number;
    enRetard?: number;
    clotures?: number;
    constatsTotal?: number;
    constatsBrouillon?: number;
    constatsPublies?: number;
    tauxCloture?: number;
}

export interface AuditFiltres {
    search?: string;
    statut?: StatutAudit;
    typeAudit?: TypeAudit;
    dateDebut?: string;
    dateFin?: string;
}
