import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { QualiUrlConfig } from '../../core/services/url-config';
import {
    Conversation,
    DemandeAssistance,
    DemandeMessage,
    IaApiResponse,
    QuestionPredefinie,
    ReponseConversation,
    ReponseQuestion,
    SuggestionIa,
    VerdictSuggestion
} from './ia.models';

/**
 * Point d'entrée de l'assistant IA rédactionnel (ia-service via la passerelle).
 *
 * <p>Les réponses suivent l'enveloppe standard {@code ApiResponse} : le contenu utile est porté
 * par {@code data} jamais à la racine.</p>
 */
@Injectable({ providedIn: 'root' })
export class IaService {
    constructor(private http: HttpClient) {}

    /**
     * Sollicite une suggestion de rédaction.
     *
     * <p>Sans le voile global : le bouton porte déjà son propre état de chargement, et couvrir
     * l'application entière par-dessus une boîte de dialogue qui s'annonce déjà en train de
     * travailler n'apprend rien — cela empêche seulement de relire l'écran pendant les quelques
     * secondes que dure une génération.</p>
     *
     * @backend POST `${IA_SERVICE}/ia/assistance`
     */
    demanderAssistance(demande: DemandeAssistance): Observable<SuggestionIa> {
        return this.http
            .post<IaApiResponse<SuggestionIa>>(QualiUrlConfig.IA_ASSISTANCE_URL, demande, {
                headers: { 'X-Skip-Loader': 'true' }
            })
            .pipe(map((reponse) => reponse.data));
    }

    /**
     * Prononce le sort d'une suggestion : acceptée telle quelle, retouchée ou écartée.
     *
     * @backend POST `${IA_SERVICE}/ia/suggestions/{id}/verdict`
     */
    envoyerVerdict(suggestionId: string, verdict: VerdictSuggestion): Observable<unknown> {
        return this.http.post<unknown>(QualiUrlConfig.IA_SUGGESTION_VERDICT_URL(suggestionId), { verdict });
    }

    /**
     * Pose une question à l'assistant. Sans `conversationId`, un fil s'ouvre côté serveur.
     *
     * <p>Le fil est tenu par le serveur et non par l'écran : c'est lui qu'on renvoie au modèle à
     * chaque tour, et un historique fourni par le navigateur se forgerait.</p>
     *
     * <p>Sans le voile global : une génération dure plusieurs secondes, et couvrir l'application
     * entière pendant ce temps interdirait de relire le fil — ou simplement de faire autre chose —
     * pour une attente qui ne concerne qu'une bulle. C'est l'esprit de {@code X-Skip-Loader}, que
     * l'intercepteur applique déjà à toutes les lectures : le squelette est rendu à l'endroit où
     * la réponse apparaîtra.</p>
     *
     * @backend POST `${IA_SERVICE}/ia/conversation`
     */
    envoyerMessage(demande: DemandeMessage): Observable<ReponseConversation> {
        return this.http
            .post<IaApiResponse<ReponseConversation>>(QualiUrlConfig.IA_CONVERSATION_URL, demande, {
                headers: { 'X-Skip-Loader': 'true' }
            })
            .pipe(map((reponse) => reponse.data));
    }

    /**
     * Relit un fil et tous ses messages, pour le rouvrir tel qu'il a été laissé.
     *
     * @backend GET `${IA_SERVICE}/ia/conversations/{id}`
     */
    conversation(id: string): Observable<Conversation> {
        return this.http
            .get<IaApiResponse<Conversation>>(QualiUrlConfig.IA_CONVERSATION_PAR_ID_URL(id))
            .pipe(map((reponse) => reponse.data));
    }

    /**
     * Les questions que l'assistant sait poser à l'API métier.
     *
     * <p>Servies par le serveur plutôt que codées ici : une question ajoutée côté back paraît dans
     * le fil sans livrer un frontal.</p>
     *
     * @backend GET `${IA_SERVICE}/ia/questions`
     */
    questions(): Observable<QuestionPredefinie[]> {
        return this.http
            .get<IaApiResponse<QuestionPredefinie[]>>(QualiUrlConfig.IA_QUESTIONS_URL)
            .pipe(map((reponse) => reponse.data));
    }

    /**
     * Pose une question prédéfinie. Le serveur interroge le module métier **avec vos droits**,
     * puis l'assistant commente ce qu'on lui tend.
     *
     * @backend POST `${IA_SERVICE}/ia/questions/{code}`
     */
    poserQuestion(code: string, conversationId?: string): Observable<ReponseQuestion> {
        return this.http
            .post<IaApiResponse<ReponseQuestion>>(QualiUrlConfig.IA_QUESTION_URL(code),
                { conversationId }, { headers: { 'X-Skip-Loader': 'true' } })
            .pipe(map((reponse) => reponse.data));
    }
}
