import { Injectable } from '@angular/core';

/** Identifiants saisis à la connexion, le temps de passer de l'écran de connexion à celui du nouveau mot de passe. */
export interface IdentifiantsTemporaires {
    username: string;
    motDePasse: string;
}

/**
 * Porte le mot de passe temporaire de l'écran de connexion à l'écran de changement.
 *
 * <p>Le serveur exige l'ancien mot de passe pour en poser un nouveau. Il passait jusqu'ici en
 * paramètre d'URL (`oldpwd`), donc dans l'historique du navigateur, les journaux du serveur web et
 * l'en-tête Referer. L'état de navigation du routeur ne vaut guère mieux : le navigateur le range
 * dans l'historique de session, qui peut finir sur disque. On le garde donc dans la mémoire de
 * l'application, et seulement jusqu'à ce que l'écran de changement le reprenne.</p>
 *
 * <p>Le revers est assumé : une page rechargée perd le mot de passe, et l'utilisateur doit se
 * reconnecter — ce qui le redirige aussitôt ici.</p>
 */
@Injectable({ providedIn: 'root' })
export class MotDePasseTemporaireService {

    private identifiants: IdentifiantsTemporaires | null = null;

    deposer(username: string, motDePasse: string): void {
        this.identifiants = { username, motDePasse };
    }

    /** Rend les identifiants déposés et les efface : un secret ne se lit qu'une fois. */
    reprendre(): IdentifiantsTemporaires | null {
        const identifiants = this.identifiants;
        this.identifiants = null;
        return identifiants;
    }
}
