import { AMELIORATION_SERVICE } from "../../../services/quali-url-configs";

export class NonConformiteUrlConfig {
    static readonly GET_NON_CONFORMITE_BY_STATUS_ROOT_URL = `${AMELIORATION_SERVICE}/non-conformite/`;
    static readonly UPDATE_NON_CONFORMITE = `${AMELIORATION_SERVICE}/non-conformite/update/many`;
    static readonly GET_NON_CONFORMITE_IMPUTED = `${AMELIORATION_SERVICE}/non-conformite/imputed/`;
    static readonly GET_NON_CONFORMITE_ALL = `${AMELIORATION_SERVICE}/non-conformite/all`;
    static readonly GET_NON_CONFORMITE_BY_ETAPE_ORIGIN = `${AMELIORATION_SERVICE}/non-conformite/structure/origin/`;
    static readonly GET_NON_CONFORMITE_BY_ETAPE_SUMIT = `${AMELIORATION_SERVICE}/non-conformite/structure/soumission/`;
    static readonly GET_PLAN_ACTION = `${AMELIORATION_SERVICE}/plan-action/all/by-email/`;
    static readonly GET_PLAN_ACTION_ALL = `${AMELIORATION_SERVICE}/plan-action/all/`;
    static readonly UPDATE_PLAN_ACTION = `${AMELIORATION_SERVICE}/plan-action/update`;
    static readonly GET_Stat_BY_STATUS_ROOT_URL = `${AMELIORATION_SERVICE}/non-conformite/stats/nf-struct`;
    static readonly GET_Stat_MENSUEL_ROOT_URL = `${AMELIORATION_SERVICE}/non-conformite/stats/nf/`;
    static readonly GET_Stat_MENSUEL_STATUS_ROOT_URL = `${AMELIORATION_SERVICE}/non-conformite/stats/nf/status/`;
    static readonly STAT_PLAN_ACTION_ALL = `${AMELIORATION_SERVICE}/plan-action/stats/status/`;
    static readonly GET_NON_CONFORMITE_ALL_By_Structure = `${AMELIORATION_SERVICE}/non-conformite/structure/`;
    static readonly GET_Stat_MENSUEL_NIVEAU_ROOT_URL = `${AMELIORATION_SERVICE}/non-conformite/stats/nf/niveau/`;

    /**
     * Fichiers d'une non-conformité, sur le serveur d'objets.
     *
     * <p>Le dépôt rend une référence — c'est elle, et non le contenu, que le moteur de workflow
     * transporte comme valeur d'un champ de type fichier.</p>
     */
    /**
     * Non-conformités sur lesquelles l'utilisateur a une décision à prendre.
     *
     * <p>C'est le moteur de workflow qui les désigne : les listes de traitement se composaient
     * jusqu'ici d'un croisement rôle × état tenu côté front, si bien qu'un utilisateur ouvrait des
     * dossiers sur lesquels le serveur refusait ensuite toute action.</p>
     */
    static readonly NON_CONFORMITE_A_TRAITER = `${AMELIORATION_SERVICE}/non-conformite/a-traiter`;
    static readonly PLAN_ACTION_A_TRAITER = `${AMELIORATION_SERVICE}/plan-action/a-traiter`;

    /** Création d'un plan d'action rattaché à une non-conformité. */
    static readonly CREATE_PLAN_ACTION = `${AMELIORATION_SERVICE}/plan-action/create`;
    static readonly DELETE_PLAN_ACTION = `${AMELIORATION_SERVICE}/plan-action/delete`;

    static fichiers(nonConformiteId: string): string {
        return `${AMELIORATION_SERVICE}/non-conformite/${nonConformiteId}/fichiers`;
    }

    /**
     * Fiche récapitulative d'une non-conformité clôturée, en PDF.
     *
     * <p>Composée par le serveur — identification, constat, plans d'action, visas du circuit —
     * et refusée par lui tant que le dossier n'est pas clôturé.</p>
     */
    static ficheCloture(nonConformiteId: string): string {
        return `${AMELIORATION_SERVICE}/non-conformite/${nonConformiteId}/fiche-cloture`;
    }

    /**
     * Mise à jour d'un dossier.
     *
     * <p>Distincte de {@code UPDATE_NON_CONFORMITE}, qui vise {@code /update/many} : accoler un
     * identifiant à celle-ci donnait « /update/many&lt;id&gt; », une adresse qu'aucun point d'entrée
     * ne dessert.</p>
     */
    static miseAJour(nonConformiteId: string): string {
        return `${AMELIORATION_SERVICE}/non-conformite/update/${nonConformiteId}`;
    }
}
