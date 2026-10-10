export enum StatutAudit {
    PLANIFIE = 'PLANIFIE',
    EN_PREPARATION = 'EN_PREPARATION',
    EN_COURS = 'EN_COURS',
    EN_RETARD = 'EN_RETARD',
    CLOTURE = 'CLOTURE',
    ANNULE = 'ANNULE'
}

export enum StatutConstat {
    BROUILLON = 'BROUILLON',
    COMPILE = 'COMPILE',
    PUBLIE = 'PUBLIE'
}

export enum NiveauRisqueAudit {
    FAIBLE = 'FAIBLE',
    MODERE = 'MODERE',
    ELEVE = 'ELEVE'
}

export enum NiveauEfficacite {
    NON_EVALUEE = 'NON_EVALUEE',
    EFFICACE = 'EFFICACE',
    PARTIELLEMENT_EFFICACE = 'PARTIELLEMENT_EFFICACE',
    NON_EFFICACE = 'NON_EFFICACE'
}

export enum NiveauNotationRQAPBF {
    NON_CONFORME = 'NON_CONFORME',
    A_AMELIORER = 'A_AMELIORER',
    ACCEPTABLE = 'ACCEPTABLE',
    CONFORME = 'CONFORME',
    NON_APPLICABLE = 'NON_APPLICABLE'
}

export const STATUT_AUDIT_LABELS: Record<StatutAudit, string> = {
    [StatutAudit.PLANIFIE]: 'Planifié',
    [StatutAudit.EN_PREPARATION]: 'En préparation',
    [StatutAudit.EN_COURS]: 'En cours',
    [StatutAudit.EN_RETARD]: 'En retard',
    [StatutAudit.CLOTURE]: 'Clôturé',
    [StatutAudit.ANNULE]: 'Annulé'
};

export const STATUT_AUDIT_SEVERITY: Record<StatutAudit, string> = {
    [StatutAudit.PLANIFIE]: 'info',
    [StatutAudit.EN_PREPARATION]: 'warn',
    [StatutAudit.EN_COURS]: 'secondary',
    [StatutAudit.EN_RETARD]: 'danger',
    [StatutAudit.CLOTURE]: 'success',
    [StatutAudit.ANNULE]: 'secondary'
};

export const STATUT_CONSTAT_LABELS: Record<StatutConstat, string> = {
    [StatutConstat.BROUILLON]: 'Brouillon',
    [StatutConstat.COMPILE]: 'Compilé',
    [StatutConstat.PUBLIE]: 'Publié'
};

export const STATUT_CONSTAT_SEVERITY: Record<StatutConstat, string> = {
    [StatutConstat.BROUILLON]: 'secondary',
    [StatutConstat.COMPILE]: 'warn',
    [StatutConstat.PUBLIE]: 'success'
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

export const NIVEAU_EFFICACITE_LABELS: Record<NiveauEfficacite, string> = {
    [NiveauEfficacite.NON_EVALUEE]: 'Non évaluée',
    [NiveauEfficacite.EFFICACE]: 'Efficace',
    [NiveauEfficacite.PARTIELLEMENT_EFFICACE]: 'Partiellement efficace',
    [NiveauEfficacite.NON_EFFICACE]: 'Non efficace'
};

export const NIVEAU_NOTATION_RQAPBF_LABELS: Record<NiveauNotationRQAPBF, string> = {
    [NiveauNotationRQAPBF.NON_CONFORME]: 'Non conforme',
    [NiveauNotationRQAPBF.A_AMELIORER]: 'À améliorer',
    [NiveauNotationRQAPBF.ACCEPTABLE]: 'Acceptable',
    [NiveauNotationRQAPBF.CONFORME]: 'Conforme',
    [NiveauNotationRQAPBF.NON_APPLICABLE]: 'Non applicable'
};

export const NIVEAU_NOTATION_RQAPBF_SEVERITY: Record<NiveauNotationRQAPBF, string> = {
    [NiveauNotationRQAPBF.NON_CONFORME]: 'danger',
    [NiveauNotationRQAPBF.A_AMELIORER]: 'warn',
    [NiveauNotationRQAPBF.ACCEPTABLE]: 'info',
    [NiveauNotationRQAPBF.CONFORME]: 'success',
    [NiveauNotationRQAPBF.NON_APPLICABLE]: 'secondary'
};

export const NIVEAU_EFFICACITE_SEVERITY: Record<NiveauEfficacite, string> = {
    [NiveauEfficacite.NON_EVALUEE]: 'secondary',
    [NiveauEfficacite.EFFICACE]: 'success',
    [NiveauEfficacite.PARTIELLEMENT_EFFICACE]: 'warn',
    [NiveauEfficacite.NON_EFFICACE]: 'danger'
};

/** Le niveau que désigne un score sur 100, aux seuils du serveur (90 / 70 / 50) ; aucun sans score. */
export function niveauDeScore(score?: number | null): NiveauNotationRQAPBF | null {
    if (score == null) return null;
    return score >= 90 ? NiveauNotationRQAPBF.CONFORME : score >= 70 ? NiveauNotationRQAPBF.ACCEPTABLE
        : score >= 50 ? NiveauNotationRQAPBF.A_AMELIORER : NiveauNotationRQAPBF.NON_CONFORME;
}

/** Le libellé de ce niveau ; « — » sans score. */
export function libelleNiveauDeScore(score?: number | null): string {
    const n = niveauDeScore(score);
    return n ? NIVEAU_NOTATION_RQAPBF_LABELS[n] : '—';
}
