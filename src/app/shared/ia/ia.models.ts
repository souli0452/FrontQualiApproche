/**
 * Types de l'assistance rédactionnelle IA.
 *
 * <p>Miroir du backend ia-service : {@code DemandeAssistanceDto}, {@code SuggestionIaDto} et
 * {@code VerdictSuggestion}. Les libellés des types d'assistance sont alignés sur
 * {@code TypeAssistance.java} — toute valeur inconnue est rejetée par le serveur.</p>
 */

export type TypeAssistance =
    | 'DESCRIPTION_NON_CONFORMITE'
    | 'CAUSES_PLAN_ACTION'
    | 'SOLUTIONS_PLAN_ACTION'
    | 'CONTENU_DOCUMENT_QMS'
    | 'REFORMULATION'
    | 'TEXTE_LIBRE';

export type VerdictSuggestion = 'ACCEPTEE' | 'MODIFIEE' | 'REJETEE';

export interface DemandeAssistance {
    typeAssistance: TypeAssistance;
    texteSource: string;
    contexte?: Record<string, string>;
    ressourceType?: string;
    ressourceId?: string;
}

export interface SuggestionIa {
    suggestion: string;
    suggestionId: string;
    avertissement: string;
}

/**
 * Enveloppe standard du produit ({@code ApiResponse.java} du module common) : le contenu utile
 * est porté par {@code data}, jamais à la racine.
 */
export interface IaApiResponse<T> {
    message: string;
    data: T;
    statusCode: number;
}

// ─── Fil de discussion ───────────────────────────────────────────────────────

export type RoleMessage = 'UTILISATEUR' | 'ASSISTANT';

export interface MessageConversation {
    role: RoleMessage;
    contenu: string;
    rang: number;
    createdAt?: string;
    /**
     * Données réelles jointes à une réponse (question prédéfinie). Rendues telles quelles sous la
     * phrase de l'assistant, et jamais reformulées par lui.
     */
    donnees?: ElementReponse[];
    /** Chiffres réels joints à une réponse de statistiques, affichés tels quels. */
    chiffres?: Chiffre[];
    /** Total annoncé par le service métier : il peut dépasser ce que porte `donnees`. */
    total?: number;
}

export interface DemandeMessage {
    /** Absent au premier message : le fil s'ouvre alors côté serveur. */
    conversationId?: string;
    message: string;
}

export interface ReponseConversation {
    conversationId: string;
    reponse: string;
    avertissement: string;
    /** Messages restants avant la fin du fil : de quoi prévenir avant de buter sur la borne. */
    messagesRestants: number;
}

export interface Conversation {
    id: string;
    titre: string;
    nombreMessages: number;
    derniereActiviteAt?: string;
    /** Porté seulement quand on demande un fil précis. */
    messages?: MessageConversation[];
}

// ─── Questions prédéfinies, adossées à l'API métier ──────────────────────────

export type CodeQuestion =
    | 'CE_QUI_M_ATTEND'
    | 'MES_PLANS_ACTION'
    | 'DOCUMENTS_A_VISER'
    | 'DEMANDES_A_INSTRUIRE'
    | 'CHIFFRES_DE_L_ORGANISATION'
    | 'CHIFFRES_DE_MA_STRUCTURE'
    | 'MES_CHIFFRES';

export interface QuestionPredefinie {
    code: CodeQuestion;
    libelle: string;
    description: string;
}

/**
 * Une ligne de résultat. Elle vient du service métier et s'affiche **telle quelle** : rien ici
 * n'est passé par la plume du modèle, et rien ne doit l'être.
 */
export interface ElementReponse {
    reference: string;
    libelle?: string;
    niveau?: string;
    etat?: string;
    ressourceType?: string;
    ressourceId?: string;
}

/** Un chiffre, déjà mis en forme par le serveur — ni l'écran ni le modèle ne le recalculent. */
export interface Chiffre {
    libelle: string;
    valeur: string;
    /** Nuance d'alerte : `retard`, `bas`, ou absente si le chiffre n'appelle rien. */
    alerte?: string;
}

export interface ReponseQuestion {
    code: CodeQuestion;
    libelle: string;
    elements: ElementReponse[];
    chiffres: Chiffre[];
    total: number;
    commentaire: string;
    conversationId: string;
    avertissement: string;
}
