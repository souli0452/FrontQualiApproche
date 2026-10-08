export enum StatutAudit {
    PLANIFIE = 'PLANIFIE',
    EN_PREPARATION = 'EN_PREPARATION',
    EN_COURS = 'EN_COURS',
    EN_RETARD = 'EN_RETARD',
    CLOTURE = 'CLOTURE'
}

export enum TypeAudit {
    INTERNE = 'INTERNE',
    EXTERNE = 'EXTERNE',
    REFERENTIEL_QUALITE_NATIONAL = 'REFERENTIEL_QUALITE_NATIONAL',
    FOURNISSEUR = 'FOURNISSEUR'
}

export enum NiveauRisqueAudit {
    FAIBLE = 'FAIBLE',
    MODERE = 'MODERE',
    ELEVE = 'ELEVE'
}

export enum StatutConstat {
    BROUILLON = 'BROUILLON',
    PUBLIE = 'PUBLIE'
}

export const STATUT_AUDIT_LABELS: Record<StatutAudit, string> = {
    [StatutAudit.PLANIFIE]: 'Planifié',
    [StatutAudit.EN_PREPARATION]: 'En préparation',
    [StatutAudit.EN_COURS]: 'En cours',
    [StatutAudit.EN_RETARD]: 'En retard',
    [StatutAudit.CLOTURE]: 'Clôturé'
};

export const STATUT_AUDIT_SEVERITY: Record<StatutAudit, string> = {
    [StatutAudit.PLANIFIE]: 'info',
    [StatutAudit.EN_PREPARATION]: 'warn',
    [StatutAudit.EN_COURS]: 'secondary',
    [StatutAudit.EN_RETARD]: 'danger',
    [StatutAudit.CLOTURE]: 'success'
};

export const TYPE_AUDIT_LABELS: Record<TypeAudit, string> = {
    [TypeAudit.INTERNE]: 'Audit interne',
    [TypeAudit.EXTERNE]: 'Audit externe',
    [TypeAudit.REFERENTIEL_QUALITE_NATIONAL]: 'Audit référentiel qualité national',
    [TypeAudit.FOURNISSEUR]: 'Audit fournisseur'
};

export const NIVEAU_RISQUE_LABELS: Record<NiveauRisqueAudit, string> = {
    [NiveauRisqueAudit.FAIBLE]: 'Faible',
    [NiveauRisqueAudit.MODERE]: 'Modéré',
    [NiveauRisqueAudit.ELEVE]: 'Élevé'
};

export const NIVEAU_RISQUE_SEVERITY: Record<NiveauRisqueAudit, string> = {
    [NiveauRisqueAudit.FAIBLE]: 'success',
    [NiveauRisqueAudit.MODERE]: 'warn',
    [NiveauRisqueAudit.ELEVE]: 'danger'
};

export interface TypeConstat {
    code: string;
    label: string;
    severity: 'success' | 'warn' | 'danger' | 'info' | 'secondary';
    genereNonConformite: boolean;
}

export const TYPES_CONSTAT_DEFAUT: TypeConstat[] = [
    { code: 'CONFORMITE', label: 'Conformité', severity: 'success', genereNonConformite: false },
    { code: 'POINT_FORT', label: 'Point fort', severity: 'secondary', genereNonConformite: false },
    { code: 'PISTE_AMELIORATION', label: "Piste d'amélioration", severity: 'info', genereNonConformite: false },
    { code: 'POINT_SENSIBLE', label: 'Point sensible', severity: 'secondary', genereNonConformite: false },
    { code: 'NC_MINEURE', label: 'Non-conformité mineure', severity: 'warn', genereNonConformite: true },
    { code: 'NC_MAJEURE', label: 'Non-conformité majeure', severity: 'danger', genereNonConformite: true }
];
