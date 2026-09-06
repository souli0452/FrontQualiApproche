import { UserInfos } from '../../../models/auth.model';

/**
 * Référentiel de gravité / criticité d'une Non-Conformité (Mineure, Majeure, Critique...).
 */
export interface NiveauNonConformite extends UserInfos {
    id: string;
    libelle: string;
    score: number;
    couleur: string;
    description: string;
}

/**
 * Référentiel de l'origine / source d'apparition d'une Non-Conformité (Audit, Réclamation, Interne...).
 */
export interface OrigineNonConformite extends UserInfos {
    id: string;
    libelle: string;
    description: string;
}
