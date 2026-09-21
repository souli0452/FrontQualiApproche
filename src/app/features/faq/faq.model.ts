/** Une pièce jointe d'entrée de FAQ. La référence de stockage ne sort jamais du serveur. */
export interface FichierFaq {
    id?: string;
    faqId?: string;
    nom?: string;
    ext?: string;
    type?: string;
}

/**
 * Une entrée de la foire aux questions.
 *
 * <p>Recopie du contrat rendu par referentiel-service. La FAQ est un référentiel de
 * l'application : elle s'affiche dans l'aide, et l'assistant IA la lit pour répondre au lieu
 * d'inventer.</p>
 */
export interface EntreeFaq {
    id?: string;
    question?: string;
    reponse?: string;
    /** Visible dans l'aide et récitée par l'assistant. */
    publiee?: boolean;
    fichiers?: FichierFaq[];
    updateAt?: string;
}
