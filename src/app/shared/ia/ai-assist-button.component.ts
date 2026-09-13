import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { accesAutorise } from '../../core/auth/auth-utils';
import { ModuleAbonnement } from '../../core/enums/module-abonnement.enum';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { MessageModule } from 'primeng/message';
import { TextareaModule } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';
import { IaService } from './ia.service';
import { TypeAssistance, VerdictSuggestion } from './ia.models';

/** Permission qu'exige le serveur pour solliciter l'assistant et prononcer un verdict. */
const PERMISSION_SOLLICITER = 'assistant-ia-write';

/**
 * Bouton discret « Assister avec l'IA », réutilisable près de n'importe quel champ texte.
 *
 * <p>Au clic, la demande part à l'ia-service avec le texte source et le contexte de l'écran ;
 * la suggestion revient dans une boîte de dialogue où l'utilisateur peut la retoucher avant de
 * l'insérer. Le verdict (acceptée, modifiée, rejetée) est renvoyé au serveur pour la
 * traçabilité, sans bloquer l'interface.</p>
 *
 * <p>Le bouton ne paraît que là où son clic peut aboutir — permission détenue et module souscrit
 * (voir {@link ngOnInit}). Le contrôle vit ici, et non chez les écrans qui posent le bouton :
 * c'est la même condition partout, et chaque point d'insertion à venir en hérite au lieu de la
 * redécouvrir.</p>
 */
@Component({
    selector: 'app-ai-assist-button',
    standalone: true,
    imports: [CommonModule, FormsModule, ButtonModule, DialogModule, MessageModule, TextareaModule, TooltipModule],
    templateUrl: './ai-assist-button.component.html'
})
export class AiAssistButtonComponent implements OnInit {
    /** Nature de l'assistance demandée : détermine le prompt côté serveur. */
    @Input({ required: true }) typeAssistance!: TypeAssistance;

    /** Lecture paresseuse de la source : évaluée au clic, quand le champ est à jour. */
    @Input() source?: () => string;

    /** Source statique, quand le texte ne dépend pas d'un champ vivant. */
    @Input() texteSource?: string;

    @Input() contexte?: Record<string, string>;
    @Input() ressourceType?: string;
    @Input() ressourceId?: string;
    @Input() disabled = false;

    /** Texte final à insérer : la suggestion, éventuellement retouchée par l'utilisateur. */
    @Output() accepter = new EventEmitter<string>();

    /**
     * Le bouton est-il offert à cet utilisateur, sur cette installation ? Faux tant que l'une des
     * deux conditions manque, et le composant ne rend alors rien du tout.
     */
    affiche = false;

    chargement = false;
    dialogVisible = false;
    avertissement = '';
    texteEdite = '';

    /** Texte exact renvoyé par le serveur : toute retouche fait basculer le verdict à MODIFIEE. */
    private suggestionOriginale = '';
    private suggestionId: string | null = null;

    constructor(
        private iaService: IaService,
        private messageService: MessageService
    ) {}

    /**
     * Deux conditions, et la même règle que le menu et le garde de routes ({@code accesAutorise}) :
     * la permission dit ce que la personne peut faire, l'abonnement ce que l'organisation a acheté.
     *
     * <p>Sans ce filtre, le bouton s'offrait à tous et ne rendait qu'un refus après le clic — un
     * 403 pour qui n'a pas la permission, un 402 pour qui n'a pas souscrit le module. Or seul le
     * super administrateur reçoit {@code assistant-ia-write} : sur une installation ordinaire,
     * chaque déclarant voyait donc une fonction qui ne lui répondait que par une erreur, ce qui
     * donne à un droit manquant l'allure d'un bogue, et à une option non souscrite celle d'une
     * panne plutôt que d'une offre.</p>
     */
    ngOnInit(): void {
        this.affiche = accesAutorise([PERMISSION_SOLLICITER], ModuleAbonnement.ASSISTANT_IA);
    }

    solliciter(): void {
        const texteSource = (this.source ? this.source() : (this.texteSource ?? '')).trim();
        if (!texteSource) {
            this.messageService.add({
                severity: 'info',
                summary: 'Assistant IA',
                detail: "Décrivez d'abord brièvement la situation : l'assistant a besoin d'éléments pour proposer une rédaction."
            });
            return;
        }

        this.chargement = true;
        this.iaService
            .demanderAssistance({
                typeAssistance: this.typeAssistance,
                texteSource,
                contexte: this.contexte,
                ressourceType: this.ressourceType,
                ressourceId: this.ressourceId
            })
            .subscribe({
                next: (suggestion) => {
                    this.chargement = false;
                    this.suggestionOriginale = suggestion.suggestion;
                    this.suggestionId = suggestion.suggestionId;
                    this.texteEdite = suggestion.suggestion;
                    this.avertissement = suggestion.avertissement;
                    this.dialogVisible = true;
                },
                error: (erreur: HttpErrorResponse) => {
                    this.chargement = false;
                    this.signalerErreur(erreur);
                }
            });
    }

    inserer(): void {
        const verdict: VerdictSuggestion =
            this.texteEdite === this.suggestionOriginale ? 'ACCEPTEE' : 'MODIFIEE';
        this.prononcerVerdict(verdict);
        this.dialogVisible = false;
        this.accepter.emit(this.texteEdite);
    }

    ignorer(): void {
        // Fermeture par la croix ou par « Ignorer » : la suggestion est écartée.
        this.prononcerVerdict('REJETEE');
        this.dialogVisible = false;
    }

    /**
     * Le verdict renseigne la traçabilité sans engager l'écran : un échec se contente du journal,
     * l'utilisateur a déjà obtenu ce qu'il voulait.
     */
    private prononcerVerdict(verdict: VerdictSuggestion): void {
        const id = this.suggestionId;
        this.suggestionId = null;
        if (!id) return;
        this.iaService.envoyerVerdict(id, verdict).subscribe({
            error: (erreur) => console.warn("Le verdict de la suggestion IA n'a pas pu être enregistré.", erreur)
        });
    }

    private signalerErreur(erreur: HttpErrorResponse): void {
        let detail: string;
        switch (erreur.status) {
            case 402:
                detail = erreur.error?.message
                    ?? "Le module Assistant IA n'est pas souscrit à votre abonnement. Contactez l'éditeur pour l'ajouter.";
                break;
            case 429:
                detail = "Le budget d'utilisation de l'assistant IA est atteint. Réessayez plus tard ou contactez votre administrateur.";
                break;
            case 502:
            case 503:
            case 504:
                detail = "L'assistant IA est momentanément indisponible. Réessayez dans quelques instants.";
                break;
            case 0:
                detail = 'Impossible de joindre le serveur. Vérifiez votre connexion puis réessayez.';
                break;
            default:
                detail = erreur.error?.message ?? "Une erreur est survenue lors de la génération de la suggestion.";
        }
        this.messageService.add({
            severity: erreur.status === 402 || erreur.status === 429 ? 'warn' : 'error',
            summary: 'Assistant IA indisponible',
            detail,
            life: 8000
        });
    }
}
