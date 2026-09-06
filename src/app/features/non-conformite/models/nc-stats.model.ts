import { NonConformStatus } from './nc-status.model';

/**
 * Statistiques de comptage par statut de Non-Conformité.
 */
export interface NcStats {
    status: NonConformStatus;
    count: number;
}

/**
 * Badges de notification du workflow Non-Conformité (compteurs par étape d'action requise).
 */
export interface NcNotificationBadges {
    reception?: number;
    affectation?: number;
    validationPilote?: number;
    validationRQ?: number;
    cloture?: number;
    imputees?: number;
    nonTraiter?: number;
    soumission?: number;
}
