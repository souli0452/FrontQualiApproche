/**
 * Ouverture des fichiers reçus du serveur : ce qui peut s'afficher dans un onglet, et ce qui doit
 * seulement s'enregistrer.
 *
 * <p>Une URL `blob:` hérite de l'origine de l'application. Ouvrir dans un onglet un fichier HTML ou
 * SVG déposé en pièce jointe, c'est donc exécuter ses scripts <b>chez nous</b>, avec la session de
 * celui qui consulte : une pièce jointe piégée suffirait à agir en son nom. Seuls les PDF et les
 * images matricielles s'affichent ; tout le reste s'enregistre.</p>
 *
 * <p>Le type déclaré ne suffit pas : une pièce encore en mémoire porte le type que le formulaire a
 * cru lire, et le serveur répond parfois `application/octet-stream`. Le contenu est donc
 * <b>réemballé</b> sous le type retenu — un fichier HTML renommé en `.pdf` part alors au lecteur
 * PDF, qui le refuse, au lieu d'être interprété comme une page.</p>
 */

/** Types que le navigateur affiche sans rien exécuter, par extension. */
const TYPES_AFFICHABLES: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp'
};

/** Types qui ne disent rien du contenu : on s'en remet alors à l'extension. */
const TYPES_GENERIQUES = ['', 'application/octet-stream', 'binary/octet-stream'];

/**
 * Délai avant de rendre l'URL d'un fichier ouvert dans un onglet.
 *
 * <p>Rendue tout de suite, l'URL ne mènerait plus à rien : l'onglet la charge après que
 * `window.open` a rendu la main. Une minute laisse au lecteur PDF le temps de tout lire.</p>
 */
const DELAI_AVANT_LIBERATION_MS = 60_000;

function extensionDe(nomFichier?: string | null): string {
    const nom = (nomFichier || '').toLowerCase().trim();
    return nom.includes('.') ? nom.slice(nom.lastIndexOf('.')) : '';
}

/**
 * Type sous lequel le fichier peut s'afficher, ou `null` s'il ne doit que s'enregistrer.
 *
 * @param sansExtensionEstPdf un nom sans extension est tenu pour un PDF : c'est le cas du fonds
 *        documentaire, dont les fichiers sont désignés par leur numéro.
 */
export function typeAffichable(blob: Blob, nomFichier?: string | null, sansExtensionEstPdf = false): string | null {
    const declare = (blob?.type || '').toLowerCase().split(';')[0].trim();
    const affichables = Object.values(TYPES_AFFICHABLES);
    if (affichables.includes(declare)) {
        return declare;
    }
    // Un type précis et non affichable (text/html, image/svg+xml…) l'emporte sur l'extension :
    // c'est précisément le cas d'un fichier déguisé.
    if (!TYPES_GENERIQUES.includes(declare) && declare.includes('/')) {
        return null;
    }
    const extension = extensionDe(nomFichier);
    if (!extension) {
        return sansExtensionEstPdf ? 'application/pdf' : null;
    }
    return TYPES_AFFICHABLES[extension] ?? null;
}

/** Le même contenu, sous le type retenu : c'est ce type, et lui seul, que verra le navigateur. */
export function reemballer(blob: Blob, type: string): Blob {
    return blob.type === type ? blob : new Blob([blob], { type });
}

/** Enregistre le fichier sous son nom, puis rend l'URL au navigateur. */
export function enregistrerBlob(blob: Blob, nomFichier: string): void {
    const url = URL.createObjectURL(blob);
    const lien = document.createElement('a');
    lien.href = url;
    lien.download = nomFichier || 'fichier';
    lien.click();
    setTimeout(() => URL.revokeObjectURL(url), 100);
}

/**
 * Ouvre un PDF ou une image dans un nouvel onglet ; enregistre tout autre fichier.
 *
 * @return `true` si le fichier a été ouvert, `false` s'il a été enregistré.
 */
export function ouvrirOuEnregistrer(blob: Blob, nomFichier: string, sansExtensionEstPdf = false): boolean {
    const type = typeAffichable(blob, nomFichier, sansExtensionEstPdf);
    if (!type) {
        enregistrerBlob(blob, nomFichier);
        return false;
    }
    const url = URL.createObjectURL(reemballer(blob, type));
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), DELAI_AVANT_LIBERATION_MS);
    return true;
}
