import { UrlConfig } from '@core/services/url-config';
import { FormGroupColumn, TableColumn } from '../../../models/generique.model';

/**
 * Les listes du paramétrage Audit, d'après les écrans A5 à A9 de la maquette, servies par le
 * socle commun des écrans de paramétrage (`app-crud-generic`) : un tableau, un formulaire en
 * dialogue, une fiche de détail. Une page par liste : la route porte la clé (`data.liste`).
 */

/** Une option de liste déroulante, telle que `app-crud-generic` les attend. */
export interface Option {
    label: string;
    value: any;
}

export interface ListeParametrageAudit {
    cle: string;
    titre: string;
    sousTitre: string;
    boutonNouveau: string;
    formHeader: string;
    /** Le texte d'introduction de l'écran, repris de la maquette, affiché en tête du formulaire. */
    formLongDescription: string;
    url: string;
    /** Un retrait passe par `actif` (referentiel-service) : l'entrée reste lisible sur les audits. */
    retraitParActif?: boolean;
    /** Le champ que reprend la confirmation de suppression. */
    champLibelle: string;
    formCols: FormGroupColumn[];
    tableCols: TableColumn[];
    detailCols: FormGroupColumn[];
    valeursParDefaut: Record<string, any>;
    /** Les listes déroulantes du formulaire : champ → clé des options (`ParametrageAuditListeComponent.options`). */
    listes?: Record<string, string>;
    /** Les listes à choix multiple du formulaire : champ → clé des options. */
    listesMultiples?: Record<string, string>;
    /** Champs à choix multiple que le serveur garde en une seule chaîne, séparée par des virgules. */
    listesEnTexte?: string[];
    /** Le champ qui ordonne les lignes : demandé au serveur, et repris pour teinter l'échelle. */
    tri?: string;
    /** Les colonnes calculées d'une ligne, à partir de la ligne et des options chargées. */
    enrichir?: (ligne: any, options: Record<string, Option[]>) => any;
}

const CHAMP_ID: FormGroupColumn = { field: 'id', label: '', header: 'Id', type: 'number', visible: false, required: false };

const libelleDe = (options: Option[] | undefined, valeur: any): string =>
    options?.find(o => o.value === valeur)?.label ?? (valeur ? String(valeur) : '—');

export const TYPES_DOCUMENT_AUDIT: Option[] = [
    { label: 'Audit (AUD)', value: 'AUD' },
    { label: 'Plan d\'audit (PLA)', value: 'PLA' },
    { label: 'Rapport d\'audit (RAP)', value: 'RAP' }
];

export const SEPARATEURS: Option[] = [
    { label: '- (tiret)', value: '-' },
    { label: '/ (barre oblique)', value: '/' },
    { label: '_ (souligné)', value: '_' },
    { label: '. (point)', value: '.' }
];

/** Les destinataires d'un rappel : des rôles que la ronde de nuit trace avec le rappel. */
export const DESTINATAIRES_RAPPEL: Option[] = [
    { label: 'Équipe d\'audit', value: 'Équipe d\'audit' },
    { label: 'Responsable d\'équipe', value: 'Responsable d\'équipe' },
    { label: 'Pilote du processus audité', value: 'Pilote du processus audité' },
    { label: 'Responsable qualité', value: 'Responsable qualité' }
];

/** La prochaine référence que produira une règle de codification. */
export function apercuReference(r: any): string {
    if (!r?.typeDocument) return '—';
    const sep = r.separateur ?? '-';
    const annee = r.annee || String(new Date().getFullYear());
    const segments = [r.prefixe, r.typeDocument === 'AUD' ? null : r.typeDocument, annee, String((Number(r.compteur) || 0) + 1).padStart(3, '0')];
    return segments.filter(Boolean).join(sep);
}

export const LISTES_PARAMETRAGE_AUDIT: ListeParametrageAudit[] = [
    {
        cle: 'types-audit',
        titre: 'Types d\'audit',
        sousTitre: 'Les types proposés à la planification d\'un audit et au filtre du programme.',
        boutonNouveau: 'Nouveau type d\'audit',
        formHeader: 'Création et mise à jour d\'un type d\'audit',
        formLongDescription: 'Un type marqué « externe » reçoit son plan et son rapport de l\'organisme auditeur, sans rédaction ni signature dans l\'application. L\'origine désigne le type de non-conformité ouvert par ses constats.',
        url: UrlConfig.AUDIT_TYPES_AUDIT_URL,
        champLibelle: 'libelle',
        formCols: [
            CHAMP_ID,
            { field: 'libelle', label: 'Nom du type d\'audit (ex : Audit interne, Audit de certification)', header: 'Nom du type', placeholder: 'Ex : Audit de certification', helpText: 'Le nom proposé à la planification d\'un audit et au filtre du programme.', type: 'string', visible: true, required: true },
            { field: 'typeNonConformiteId', label: 'Type de non-conformité ouvert par les constats de ce type d\'audit', header: 'Origine des NC', helpText: 'Le type de non-conformité (module NC) que les constats de ce type d\'audit ouvrent.', type: 'dropdown', visible: true, required: false, class: 'md:col-6' },
            { field: 'circuitExterne', label: 'Audit externe : plan et rapport reçus de l\'organisme auditeur', header: 'Audit externe', helpText: 'Plan et rapport reçus de l\'organisme auditeur, sans rédaction ni signature dans l\'application.', type: 'boolean', visible: true, required: false, class: 'md:col-6' }
        ],
        tableCols: [
            { field: 'libelle', header: 'Type d\'audit', type: 'string', filter: true },
            { field: 'circuitExterne', header: 'Circuit', type: 'boolean', labelTrue: 'Externe', labelFalse: 'Interne', width: '8rem' },
            { field: 'typeNonConformiteLibelle', header: 'Origine des NC', type: 'string' }
        ],
        detailCols: [
            { field: 'libelle', header: 'Type d\'audit' },
            { field: 'typeNonConformiteLibelle', header: 'Origine des NC' },
            { field: 'circuitExterne', header: 'Audit externe', type: 'boolean' }
        ],
        valeursParDefaut: { circuitExterne: false },
        listes: { typeNonConformiteId: 'typesNc' },
        enrichir: (l, o) => ({ ...l, typeNonConformiteLibelle: libelleDe(o['typesNc'], l.typeNonConformiteId) })
    },
    {
        cle: 'natures-constat',
        titre: 'Types de constats',
        sousTitre: 'Les natures proposées à la saisie des constats et à l\'évaluation RQAP-BF.',
        boutonNouveau: 'Nouveau type de constat',
        formHeader: 'Création et mise à jour d\'un type de constat',
        formLongDescription: 'Un type qui génère une non-conformité ouvre, à la publication du constat, un dossier dans le module Non-conformités, à la gravité indiquée.',
        url: UrlConfig.AUDIT_TYPES_CONSTAT_URL,
        champLibelle: 'libelle',
        formCols: [
            CHAMP_ID,
            { field: 'libelle', label: 'Libellé du type de constat (ex : Point fort, Non-conformité mineure)', header: 'Libellé', placeholder: 'Ex : Non-conformité critique', helpText: 'La nature proposée à la saisie des constats et à l\'évaluation RQAP-BF.', type: 'string', visible: true, required: true, class: 'md:col-6' },
            { field: 'couleur', label: 'Couleur de la pastille', header: 'Couleur', helpText: 'La couleur de la pastille qui signale ce type sur les constats.', type: 'color', visible: true, required: false, class: 'md:col-6' },
            { field: 'genereNonConformite', label: 'Génère une non-conformité à la publication du constat', header: 'Génère une NC', helpText: 'À la publication du constat, un dossier s\'ouvre dans le module Non-conformités.', type: 'boolean', visible: true, required: false, class: 'md:col-6' },
            { field: 'niveauNonConformiteId', label: 'Gravité de la non-conformité ouverte', header: 'Gravité de la NC', helpText: 'Le niveau de gravité (module NC) du dossier ouvert.', type: 'dropdown', visible: true, required: false, class: 'md:col-6' }
        ],
        tableCols: [
            { field: 'libelle', header: 'Libellé', type: 'string', filter: true },
            { field: 'couleur', header: 'Couleur', type: 'color', width: '7rem' },
            { field: 'genereNonConformite', header: 'Génère une NC', type: 'boolean', width: '10rem' },
            { field: 'niveauNonConformiteLibelle', header: 'Gravité NC', type: 'string' }
        ],
        detailCols: [
            { field: 'libelle', header: 'Libellé' },
            { field: 'couleur', header: 'Couleur', type: 'color' },
            { field: 'genereNonConformite', header: 'Génère une NC', type: 'boolean' },
            { field: 'niveauNonConformiteLibelle', header: 'Gravité NC' }
        ],
        valeursParDefaut: { couleur: '#64748b', genereNonConformite: false },
        listes: { niveauNonConformiteId: 'niveauxNc' },
        enrichir: (l, o) => ({ ...l, niveauNonConformiteLibelle: libelleDe(o['niveauxNc'], l.niveauNonConformiteId) })
    },
    {
        cle: 'sites',
        titre: 'Sites',
        sousTitre: 'Les sites qu\'un audit peut couvrir, choisis à la planification.',
        boutonNouveau: 'Nouveau site',
        formHeader: 'Création et mise à jour d\'un site',
        formLongDescription: 'Un site retiré ne se propose plus aux nouveaux audits ; ceux qui le citent le gardent.',
        url: UrlConfig.AUDIT_SITES_URL,
        retraitParActif: true,
        champLibelle: 'nom',
        formCols: [
            CHAMP_ID,
            { field: 'nom', label: 'Nom du site (ex : Siège Ouagadougou)', header: 'Nom', placeholder: 'Ex : Siège Ouagadougou', helpText: 'Le nom sous lequel le site se choisit à la planification d\'un audit.', type: 'string', visible: true, required: true, class: 'md:col-6' },
            { field: 'adresse', label: 'Adresse du site', header: 'Adresse', placeholder: 'Ex : Avenue de l\'Indépendance', helpText: 'L\'adresse, reprise sur le plan d\'audit.', type: 'string', visible: true, required: false, class: 'md:col-6' }
        ],
        tableCols: [
            { field: 'nom', header: 'Site', type: 'string', filter: true },
            { field: 'adresse', header: 'Adresse', type: 'string', filter: true }
        ],
        detailCols: [
            { field: 'nom', header: 'Site' },
            { field: 'adresse', header: 'Adresse' }
        ],
        valeursParDefaut: {}
    },
    {
        cle: 'criteres-evaluation',
        titre: 'Critères d\'évaluation des auditeurs',
        sousTitre: 'Les critères sur lesquels chaque membre de l\'équipe est évalué à la clôture d\'un audit.',
        boutonNouveau: 'Nouveau critère',
        formHeader: 'Création et mise à jour d\'un critère d\'évaluation',
        formLongDescription: 'Chaque critère se note sur l\'échelle des niveaux d\'évaluation. Un critère retiré ne se propose plus, mais les notes déjà données restent.',
        url: UrlConfig.AUDIT_CRITERES_EVAL_AUDITEUR_URL,
        retraitParActif: true,
        champLibelle: 'libelle',
        formCols: [
            CHAMP_ID,
            { field: 'libelle', label: 'Libellé du critère d\'évaluation (ex : Esprit d\'équipe)', header: 'Libellé', placeholder: 'Ex : Esprit d\'équipe', helpText: 'Le critère sur lequel chaque auditeur est noté à la clôture d\'un audit.', type: 'string', visible: true, required: true }
        ],
        tableCols: [{ field: 'libelle', header: 'Critère d\'évaluation', type: 'string', filter: true }],
        detailCols: [{ field: 'libelle', header: 'Critère d\'évaluation' }],
        valeursParDefaut: {}
    },
    {
        cle: 'niveaux-evaluation',
        titre: 'Niveaux d\'évaluation des auditeurs',
        sousTitre: 'L\'échelle des notes, du rang le plus bas au plus haut ; la moyenne d\'un auditeur se calcule sur le rang.',
        boutonNouveau: 'Nouveau niveau',
        formHeader: 'Création et mise à jour d\'un niveau d\'évaluation',
        formLongDescription: 'Le rang ordonne l\'échelle : 1 est le niveau le plus bas. Retoucher l\'échelle ne réécrit pas les moyennes passées.',
        url: UrlConfig.AUDIT_NIVEAUX_EVAL_AUDITEUR_URL,
        retraitParActif: true,
        champLibelle: 'libelle',
        tri: 'ordre',
        formCols: [
            CHAMP_ID,
            { field: 'ordre', label: 'Rang dans l\'échelle (1 = le plus bas)', header: 'Rang', placeholder: '1', helpText: 'Le rang ordonne l\'échelle ; la moyenne d\'un auditeur se calcule dessus.', type: 'number', min: 1, visible: true, required: true, class: 'md:col-6' },
            { field: 'libelle', label: 'Libellé du niveau (ex : Satisfaisant)', header: 'Libellé', placeholder: 'Ex : Satisfaisant', helpText: 'Le libellé affiché sur l\'échelle de notation.', type: 'string', visible: true, required: true, class: 'md:col-6' }
        ],
        tableCols: [
            { field: 'ordre', header: 'Rang', type: 'number', width: '6rem' },
            { field: 'libelle', header: 'Niveau', type: 'badge', severityField: 'severite' }
        ],
        detailCols: [
            { field: 'ordre', header: 'Rang' },
            { field: 'libelle', header: 'Niveau' }
        ],
        valeursParDefaut: {}
    },
    {
        cle: 'regles-notification',
        titre: 'Paramétrage des notifications',
        sousTitre: 'Les rappels envoyés avant le démarrage d\'un audit : chaque nuit, un audit validé dont le début approche déclenche la règle au délai correspondant.',
        boutonNouveau: 'Nouvelle règle',
        formHeader: 'Création et mise à jour d\'une règle de rappel',
        formLongDescription: 'La maquette ne demande que le délai : le libellé et les destinataires sont posés d\'avance et restent modifiables.',
        url: UrlConfig.AUDIT_REGLES_NOTIF_URL,
        champLibelle: 'libelle',
        formCols: [
            CHAMP_ID,
            { field: 'libelle', label: 'Nom de la règle de rappel', header: 'Nom de la règle', placeholder: 'Ex : Rappel J-10', helpText: 'Posé d\'avance d\'après la maquette, et modifiable.', type: 'string', visible: true, required: true },
            { field: 'delaiJours', label: 'Délai avant le démarrage de l\'audit, en jours', header: 'Délai (jours)', placeholder: '10', helpText: 'Le rappel part ce nombre de jours avant la date de début prévue.', type: 'number', min: 1, visible: true, required: true, class: 'md:col-6' },
            { field: 'actif', label: 'Règle active', header: 'Règle active', helpText: 'Une règle inactive reste enregistrée mais ne déclenche aucun rappel.', type: 'boolean', visible: true, required: false, class: 'md:col-6' },
            { field: 'destinataires', label: 'Destinataires du rappel', header: 'Destinataires', helpText: 'Les rôles prévenus ; la ronde de nuit les trace avec le rappel.', type: 'multiselect', visible: true, required: false }
        ],
        tableCols: [
            { field: 'libelle', header: 'Règle', type: 'string', filter: true },
            { field: 'delaiJours', header: 'Délai (jours)', type: 'number', width: '9rem' },
            { field: 'destinatairesTexte', header: 'Destinataires', type: 'string' },
            { field: 'actif', header: 'État', type: 'boolean', labelTrue: 'Active', labelFalse: 'Inactive', width: '8rem' }
        ],
        detailCols: [
            { field: 'libelle', header: 'Règle' },
            { field: 'delaiJours', header: 'Délai avant démarrage (jours)' },
            { field: 'destinatairesTexte', header: 'Destinataires' },
            { field: 'actif', header: 'Active', type: 'boolean' }
        ],
        valeursParDefaut: { libelle: 'Rappel avant démarrage d\'audit', actif: true, delaiJours: 10, destinataires: ['Équipe d\'audit'] },
        listesMultiples: { destinataires: 'destinataires' },
        listesEnTexte: ['destinataires'],
        enrichir: l => ({ ...l, destinatairesTexte: l.destinataires || '—' })
    },
    {
        cle: 'codification',
        titre: 'Codification des documents',
        sousTitre: 'La forme des références attribuées aux audits, plans et rapports : préfixe, séparateur, année et compteur.',
        boutonNouveau: 'Nouvelle règle de codification',
        formHeader: 'Création et mise à jour d\'une règle de codification',
        formLongDescription: 'Une règle par document. Le compteur s\'incrémente à chaque émission et repart à zéro au changement d\'année ; les documents déjà émis gardent leur référence. L\'année et le compteur ne se saisissent qu\'à la création.',
        url: UrlConfig.AUDIT_CODIFICATIONS_URL,
        champLibelle: 'typeDocument',
        formCols: [
            CHAMP_ID,
            { field: 'typeDocument', label: 'Document codifié (audit, plan ou rapport)', header: 'Document', helpText: 'Une règle par document ; le document ne se change plus après création.', type: 'dropdown', visible: true, required: true, class: 'md:col-6' },
            { field: 'prefixe', label: 'Préfixe de la structure (ex : QS)', header: 'Préfixe', placeholder: 'Ex : QS', helpText: 'Le préfixe placé en tête de chaque référence.', type: 'string', visible: true, required: true, class: 'md:col-6' },
            { field: 'separateur', label: 'Séparateur entre les segments de la référence', header: 'Séparateur', helpText: 'Le caractère entre préfixe, type, année et numéro.', type: 'dropdown', visible: true, required: false, class: 'md:col-6' },
            { field: 'annee', label: 'Année en cours (ne se saisit qu\'à la création)', header: 'Année', placeholder: String(new Date().getFullYear()), helpText: 'Le compteur repart à zéro au changement d\'année.', type: 'string', visible: true, required: false, class: 'md:col-6' },
            { field: 'compteur', label: 'Dernier numéro déjà émis (ne se saisit qu\'à la création)', header: 'Dernier numéro émis', placeholder: '0', helpText: 'La prochaine référence portera ce numéro plus un.', type: 'number', min: 0, visible: true, required: false, class: 'md:col-6' }
        ],
        tableCols: [
            { field: 'documentLibelle', header: 'Document', type: 'string' },
            { field: 'prefixe', header: 'Préfixe', type: 'string', width: '7rem' },
            { field: 'separateur', header: 'Séparateur', type: 'string', width: '7rem' },
            { field: 'annee', header: 'Année', type: 'string', width: '6rem' },
            { field: 'compteur', header: 'Compteur', type: 'number', width: '7rem' },
            { field: 'apercu', header: 'Prochaine référence', type: 'string' }
        ],
        detailCols: [
            { field: 'documentLibelle', header: 'Document' },
            { field: 'prefixe', header: 'Préfixe' },
            { field: 'separateur', header: 'Séparateur' },
            { field: 'annee', header: 'Année' },
            { field: 'compteur', header: 'Dernier numéro émis' },
            { field: 'apercu', header: 'Prochaine référence' }
        ],
        valeursParDefaut: { prefixe: 'QS', separateur: '-', annee: String(new Date().getFullYear()), compteur: 0 },
        listes: { typeDocument: 'typesDocument', separateur: 'separateurs' },
        enrichir: l => ({ ...l, documentLibelle: libelleDe(TYPES_DOCUMENT_AUDIT, l.typeDocument), apercu: apercuReference(l) })
    }
];
