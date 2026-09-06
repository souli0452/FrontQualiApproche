/**
 * Où en est la licence de cette installation.
 *
 * <p>Trois situations, et trois conduites différentes : `ABSENTE` — rien n'a jamais été installé ;
 * `ACTIVE` — tout est ouvert ; `EXPIREE` — les données restent consultables, les actions sont
 * suspendues.</p>
 */
export interface EtatLicence {
    statut: 'ABSENTE' | 'ACTIVE' | 'EXPIREE';
    actionsOuvertes: boolean;
    type?: 'COMMERCIALE' | 'ESSAI';
    reference?: string;
    partenaireNom?: string;
    debut?: string;
    fin?: string;
    /** Négatif une fois le terme passé. */
    joursRestants: number;
    modules: string[];
    utilisateursMax: number;
    /** Phrase à afficher telle quelle : c'est elle qui dit quoi faire. */
    message: string;
}
