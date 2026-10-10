import { CanDeactivateFn } from '@angular/router';
import { Observable } from 'rxjs';

/** Une page qui sait si l'on peut la quitter sans perdre ce qui vient d'être saisi. */
export interface QuitterSansPerte {
    peutQuitter(): boolean | Observable<boolean>;
}

/**
 * Retient la sortie d'une page tant qu'une saisie risque de se perdre.
 *
 * <p>La notation RQAP-BF protégeait ses propres boutons (Précédent, Suivant, fil d'Ariane), mais
 * pas le menu ni les liens de l'en-tête : une preuve ou un commentaire saisis sans niveau
 * disparaissaient sans un mot. C'est la page qui décide (enregistrer, avertir) : le garde ne fait
 * que lui poser la question.</p>
 */
export const sortieDeNotationGuard: CanDeactivateFn<QuitterSansPerte> = page => page?.peutQuitter?.() ?? true;
