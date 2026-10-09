import { CriteriaDto, FilterExtra } from '../../../models/criteria.model';
import { NcFilter } from '../components/nc-filter-bar/nc-filter-bar';

/**
 * Traduction de la barre de filtres en critères que le serveur sait exécuter.
 *
 * <p>Chaque écran filtrait sa liste dans le navigateur, sur la <b>page déjà chargée</b> : cocher un
 * processus ne retirait que des lignes de la page courante, le compteur annonçait un total qui ne
 * correspondait à rien, et les dossiers des pages suivantes restaient invisibles quel que soit le
 * filtre posé. La même fonction de filtrage était recopiée dans neuf écrans, chacun libre de
 * diverger.</p>
 *
 * <p>La sélection appartient à la base, seule à voir tous les dossiers. Ce fichier ne fait plus que
 * dire, une fois, sur quelles colonnes portent les trois listes de la barre.</p>
 */

/**
 * Colonne visée par le filtre « Processus ».
 *
 * <p>La barre propose les <b>structures</b> de type service et transmet leur identifiant ;
 * {@code origineId} est la structure que le dossier concerne, telle que l'écran de traitement
 * l'inscrit. Le filtrage local comparait ces identifiants à {@code typeProcessusId} — la catégorie
 * de processus, qui vit dans un autre référentiel : la comparaison n'était jamais vraie, et le
 * filtre ne retenait rien.</p>
 *
 * <p>Nommée ici plutôt que répétée : si le filtre doit un jour porter sur la structure émettrice
 * ({@code structureSoumissionId}) ou sur la catégorie, c'est cette ligne qui change.</p>
 */
const COLONNE_PROCESSUS = 'origineId';

/** Colonne du niveau de gravité, au référentiel des niveaux de non-conformité. */
const COLONNE_GRAVITE = 'niveauNonConformiteId';

/**
 * Colonne de l'origine. Ce que l'écran nomme « origine » est le <b>type</b> de non-conformité au
 * référentiel : la barre l'alimente depuis ce référentiel-là.
 */
const COLONNE_ORIGINE = 'typeNonConformiteId';

/** Colonne de la date de déclaration — celle que les listes affichent. */
const COLONNE_DATE = 'createdAt';

/** Identifiants retenus dans une sélection multiple, la barre rendant des objets. */
function identifiants(selection: any): string[] {
    if (!Array.isArray(selection)) {
        return [];
    }
    return selection.map((element: any) => element?.id ?? element).filter((id: any) => !!id);
}

/** Jour au format que le serveur attend, sans décalage de fuseau. */
function jour(date: Date): string {
    const mois = `${date.getMonth() + 1}`.padStart(2, '0');
    const jourDuMois = `${date.getDate()}`.padStart(2, '0');
    return `${date.getFullYear()}-${mois}-${jourDuMois}`;
}

/**
 * Critères correspondant à ce qui est coché dans la barre de filtres.
 *
 * <p>Les bornes de date portent l'heure : la colonne est horodatée, et une borne haute au jour seul
 * vaudrait minuit — elle écarterait tout ce qui a été déclaré ce jour-là, et le résultat manquerait
 * sans cause visible.</p>
 */
export function criteresDeLaBarre(filtre?: NcFilter): FilterExtra[] {
    if (!filtre) {
        return [];
    }
    const criteres: FilterExtra[] = [];

    if (filtre.dateDebut) {
        criteres.push({ field: COLONNE_DATE, operator: 'GTE', value: `${jour(filtre.dateDebut)}T00:00:00` });
    }
    if (filtre.dateFin) {
        criteres.push({ field: COLONNE_DATE, operator: 'LTE', value: `${jour(filtre.dateFin)}T23:59:59` });
    }

    const processus = identifiants(filtre.process);
    if (processus.length) {
        criteres.push({ field: COLONNE_PROCESSUS, operator: 'IN', value: processus });
    }

    const gravites = identifiants(filtre.gravite);
    if (gravites.length) {
        criteres.push({ field: COLONNE_GRAVITE, operator: 'IN', value: gravites });
    }

    const origines = identifiants(filtre.origine);
    if (origines.length) {
        criteres.push({ field: COLONNE_ORIGINE, operator: 'IN', value: origines });
    }

    return criteres;
}

/**
 * Critères d'une recherche : le périmètre de l'écran, et ce que l'utilisateur a coché.
 *
 * <p>Le périmètre vient en premier et ne se négocie pas — l'étape du circuit que l'écran montre, la
 * structure dont il relève. Les deux se cumulent : ils sont combinés par un ET côté serveur.</p>
 *
 * @param portee critères propres à l'écran, qui définissent ce qu'il liste
 * @param filtre ce qui est coché dans la barre, s'il y a lieu
 */
export function criteresDeRecherche(portee: FilterExtra[], filtre?: NcFilter): CriteriaDto {
    return { filters: [...portee, ...criteresDeLaBarre(filtre)] };
}
