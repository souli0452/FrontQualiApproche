import { CommonModule } from '@angular/common';
import { AfterViewChecked, Component, ElementRef, EventEmitter, OnInit, Output, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { SkeletonModule } from 'primeng/skeleton';
import { TextareaModule } from 'primeng/textarea';
import { IaService } from './ia.service';
import { ElementReponse, MessageConversation, QuestionPredefinie } from './ia.models';

/** Clé du fil en cours, pour le retrouver après un rechargement de page. */
const CLE_FIL = 'quali-ai-conversation';

/** En deçà de ce nombre de messages restants, l'écran prévient que le fil touche à sa fin. */
const SEUIL_ALERTE_LONGUEUR = 4;

/**
 * Où conduit chaque type de ressource, et sous quel paramètre.
 *
 * <p>Aucun dossier n'a de route de détail : la fiche est une boîte de dialogue ouverte depuis sa
 * liste. Les écrans savent déjà le faire depuis l'adresse — c'est ainsi qu'un lien de courriel
 * ouvre un dossier —, et on emprunte donc leur convention plutôt que d'en créer une seconde.</p>
 *
 * <p>Un identifiant qui ne rend rien laisse la liste en place : ces écrans le prévoient, et le
 * dossier a pu sortir du périmètre entre le relevé et le clic.</p>
 */
const DESTINATIONS: Record<string, { route: string; parametre: string }> = {
    NON_CONFORMITE: { route: '/non-conformite/traitement', parametre: 'ncId' },
    PLAN_ACTION: { route: '/non-conformite/plan-action', parametre: 'ncId' },
    DOCUMENT: { route: '/gestion-documentaire/documents', parametre: 'documentId' },
    DEMANDE_DOCUMENT: { route: '/gestion-documentaire/demandes', parametre: 'demandeId' }
};

/**
 * Le fil de discussion avec l'assistant qualité, tel qu'il s'ouvre depuis la barre du haut.
 *
 * <p>Complément des boutons « Assister avec l'IA » posés près des champs, et non leur remplaçant :
 * le bouton écrit <b>dans un champ</b>, ce fil répond <b>à une question</b>. On y demande ce
 * qu'est une action corrective, comment structurer une analyse de causes, comment formuler un
 * constat.</p>
 *
 * <p>L'assistant ne voit <b>aucune</b> donnée de l'organisation — ni dossiers, ni documents, ni
 * échéances — et le dit lui-même quand on l'interroge dessus. L'avertissement sous le fil le
 * rappelle : c'est la question qu'on pose le plus volontiers à une bulle de conversation, et
 * celle sur laquelle un modèle inventerait le plus volontiers.</p>
 *
 * <p>Le fil est tenu par le serveur. L'écran n'en garde que l'identifiant, et le relit au
 * besoin : un historique conservé ici seul disparaîtrait au rechargement, et un historique
 * renvoyé au modèle depuis le navigateur pourrait être forgé.</p>
 */
@Component({
    selector: 'app-quali-ai-chat',
    standalone: true,
    imports: [CommonModule, FormsModule, ButtonModule, MessageModule, SkeletonModule, TextareaModule],
    templateUrl: './quali-ai-chat.component.html',
    // L'hôte doit lui-même s'étirer et accepter de rétrécir : posé dans un tiroir, un composant
    // de hauteur libre laisse le fil grandir jusqu'à chasser la zone de saisie hors de l'écran.
    styles: [`:host { display: block; height: 100%; min-height: 0; }`]
})
export class QualiAiChatComponent implements OnInit, AfterViewChecked {

    @ViewChild('fil') private filElement?: ElementRef<HTMLElement>;

    /** Émis quand on quitte le fil pour un dossier : le tiroir doit se refermer derrière. */
    @Output() navigue = new EventEmitter<void>();

    messages: MessageConversation[] = [];

    /** Les questions que l'assistant sait poser à l'API — servies par le serveur. */
    questions: QuestionPredefinie[] = [];
    saisie = '';
    chargement = false;
    erreur = '';
    avertissement = '';
    messagesRestants = Number.MAX_SAFE_INTEGER;

    private conversationId: string | null = null;
    private doitDefiler = false;

    constructor(
        private iaService: IaService,
        private router: Router
    ) {}

    ngOnInit(): void {
        // Le catalogue échoue sans conséquence : le fil reste utilisable à la saisie libre, il
        // perd seulement ses raccourcis.
        this.iaService.questions().subscribe({
            next: (questions) => (this.questions = questions),
            error: () => (this.questions = [])
        });

        const fil = this.lireFilRetenu();
        if (fil) {
            this.rouvrir(fil);
        }
    }

    ngAfterViewChecked(): void {
        // Le fil se lit par le bas : après chaque ajout, on y ramène la vue. Fait ici et non à
        // l'envoi, car la hauteur n'est connue qu'une fois le message rendu.
        if (this.doitDefiler && this.filElement) {
            this.filElement.nativeElement.scrollTop = this.filElement.nativeElement.scrollHeight;
            this.doitDefiler = false;
        }
    }

    /** Le fil touche-t-il à sa fin ? L'écran le dit avant que le serveur ne refuse. */
    get filPresqueComplet(): boolean {
        return this.messagesRestants <= SEUIL_ALERTE_LONGUEUR;
    }

    envoyer(): void {
        const question = this.saisie.trim();
        if (!question || this.chargement) {
            return;
        }

        this.erreur = '';
        this.chargement = true;
        this.saisie = '';
        // Affichée tout de suite : attendre la réponse pour montrer sa propre question donne
        // l'impression que le clic n'a rien fait.
        this.ajouter({ role: 'UTILISATEUR', contenu: question, rang: this.messages.length + 1 });

        this.iaService
            .envoyerMessage({ conversationId: this.conversationId ?? undefined, message: question })
            .subscribe({
                next: (reponse) => {
                    this.chargement = false;
                    this.conversationId = reponse.conversationId;
                    this.retenirLeFil(reponse.conversationId);
                    this.avertissement = reponse.avertissement;
                    this.messagesRestants = reponse.messagesRestants;
                    this.ajouter({
                        role: 'ASSISTANT',
                        contenu: reponse.reponse,
                        rang: this.messages.length + 1
                    });
                },
                error: (erreur: HttpErrorResponse) => {
                    this.chargement = false;
                    // Le serveur n'a rien retenu de ce tour — sa transaction est défaite. L'écran
                    // s'aligne : la question retirée du fil et rendue à la zone de saisie, prête à
                    // repartir d'un seul geste, plutôt qu'un échange boiteux qui n'existe nulle
                    // part ailleurs.
                    this.messages.pop();
                    this.saisie = question;
                    this.erreur = this.messageDErreur(erreur);
                }
            });
    }

    /**
     * Pose une question prédéfinie : c'est le serveur qui interroge l'API métier, avec vos droits.
     *
     * <p>La réponse porte deux choses de nature différente, et l'écran les tient séparées : les
     * <b>données</b>, rendues telles quelles sous la bulle, et le <b>commentaire</b> du modèle.
     * Jamais l'inverse — un assistant qui réécrirait les chiffres finirait par en donner de faux.</p>
     */
    poser(question: QuestionPredefinie): void {
        if (this.chargement) {
            return;
        }
        this.erreur = '';
        this.chargement = true;
        this.ajouter({ role: 'UTILISATEUR', contenu: question.libelle, rang: this.messages.length + 1 });

        this.iaService.poserQuestion(question.code, this.conversationId ?? undefined).subscribe({
            next: (reponse) => {
                this.chargement = false;
                if (reponse.conversationId) {
                    this.conversationId = reponse.conversationId;
                    this.retenirLeFil(reponse.conversationId);
                }
                this.avertissement = reponse.avertissement;
                this.ajouter({
                    role: 'ASSISTANT',
                    contenu: reponse.commentaire,
                    rang: this.messages.length + 1,
                    donnees: reponse.elements,
                    chiffres: reponse.chiffres,
                    total: reponse.total
                });
            },
            error: (erreur: HttpErrorResponse) => {
                this.chargement = false;
                this.messages.pop();
                this.erreur = this.messageDErreur(erreur);
            }
        });
    }

    /** Ouvre un fil neuf : le contexte repart propre, l'ancien reste consultable côté serveur. */
    nouveauFil(): void {
        this.conversationId = null;
        this.messages = [];
        this.erreur = '';
        this.messagesRestants = Number.MAX_SAFE_INTEGER;
        this.oublierLeFil();
    }

    /** Une ligne conduit-elle quelque part ? Sinon elle ne se donne pas l'air d'être cliquable. */
    estOuvrable(element: ElementReponse): boolean {
        return !!element.ressourceId && !!element.ressourceType && !!DESTINATIONS[element.ressourceType];
    }

    /**
     * Ouvre le dossier d'une ligne, et referme le tiroir derrière.
     *
     * <p>Le laisser ouvert couvrirait l'écran qu'on vient de demander — on a cliqué pour aller
     * voir, pas pour continuer à discuter par-dessus.</p>
     */
    ouvrir(element: ElementReponse): void {
        if (!this.estOuvrable(element)) {
            return;
        }
        const destination = DESTINATIONS[element.ressourceType!];
        this.router.navigate([destination.route],
            { queryParams: { [destination.parametre]: element.ressourceId } });
        this.navigue.emit();
    }

    /** Entrée envoie, Maj+Entrée passe à la ligne — l'usage d'une zone de discussion. */
    surTouche(evenement: KeyboardEvent): void {
        if (evenement.key === 'Enter' && !evenement.shiftKey) {
            evenement.preventDefault();
            this.envoyer();
        }
    }

    private rouvrir(id: string): void {
        this.iaService.conversation(id).subscribe({
            next: (fil) => {
                this.conversationId = fil.id;
                this.messages = fil.messages ?? [];
                this.doitDefiler = true;
            },
            // Fil supprimé, expiré, ou ouvert par un autre compte sur ce navigateur : on repart
            // à neuf sans rien dire, il n'y a là aucune anomalie à signaler à l'utilisateur.
            error: () => this.oublierLeFil()
        });
    }

    private ajouter(message: MessageConversation): void {
        this.messages = [...this.messages, message];
        this.doitDefiler = true;
    }

    private messageDErreur(erreur: HttpErrorResponse): string {
        switch (erreur.status) {
            case 402:
                return erreur.error?.message
                    ?? "Le module Assistant IA n'est pas souscrit à votre abonnement.";
            case 403:
                return "Vous n'avez pas le droit de solliciter l'assistant IA.";
            case 409:
                return erreur.error?.message
                    ?? 'Cette conversation a atteint sa longueur maximale. Ouvrez-en une nouvelle.';
            case 429:
                return "Le budget d'utilisation de l'assistant IA est atteint pour aujourd'hui.";
            case 502:
            case 503:
            case 504:
                return "L'assistant est momentanément indisponible. Réessayez dans quelques instants.";
            case 0:
                return 'Impossible de joindre le serveur. Vérifiez votre connexion.';
            default:
                return erreur.error?.message ?? "L'assistant n'a pas pu répondre.";
        }
    }

    // Le stockage du navigateur peut être refusé (navigation privée, site bloqué) : son absence ne
    // doit jamais empêcher de discuter, seulement de retrouver le fil après un rechargement.
    private lireFilRetenu(): string | null {
        try {
            return sessionStorage.getItem(CLE_FIL);
        } catch {
            return null;
        }
    }

    private retenirLeFil(id: string): void {
        try {
            sessionStorage.setItem(CLE_FIL, id);
        } catch {
            /* sans conséquence : le fil vit côté serveur */
        }
    }

    private oublierLeFil(): void {
        this.conversationId = null;
        this.messages = [];
        try {
            sessionStorage.removeItem(CLE_FIL);
        } catch {
            /* sans conséquence */
        }
    }
}
