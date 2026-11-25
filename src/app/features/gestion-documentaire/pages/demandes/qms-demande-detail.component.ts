import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgPrimeModule } from '@prime-ng';
import { ValidationHistoryDto, WorkflowActionDto, WorkflowStateDto } from '../../../../models/workflow.model';
import { WorkflowHistoriqueComponent } from '../../../workflow/execution/workflow-historique.component';
import { DemandeDocumentDto } from '@features/gestion-documentaire/models/demande.model';

/**
 * Fiche d'une demande : ce qu'elle porte, où elle en est, et ce qu'on peut en faire.
 *
 * <p>Sans cet écran, le circuit des demandes existait sans que rien ne permette de le faire
 * avancer : la liste montrait des demandes en instruction que personne ne pouvait instruire.</p>
 *
 * <p>Les actions proposées sont celles que le serveur déclare autorisées à l'étape courante — même
 * principe que la fiche d'un document : l'écran ne propose jamais une décision qui serait
 * refusée.</p>
 */
@Component({
    selector: 'app-qms-demande-detail',
    standalone: true,
    imports: [CommonModule, NgPrimeModule, WorkflowHistoriqueComponent],
    templateUrl: './qms-demande-detail.component.html'
})
export class QmsDemandeDetailComponent {
    @Input() demande?: DemandeDocumentDto;
    @Input() workflowState?: WorkflowStateDto;
    @Input() historique: ValidationHistoryDto[] = [];
    @Input() loading = false;

    /** L'utilisateur peut-il déposer le document remplaçant d'une modification acceptée ? */
    @Input() canDeposerRemplacant = false;

    /** Vrai quand l'état du circuit n'a pas pu être obtenu : rien ne peut alors être proposé. */
    @Input() etatIndisponible = false;

    /** La pièce jointe est en cours de récupération : le lien attend plutôt que de doubler. */
    @Input() pieceEnCours = false;

    /** Section active dans la navigation latérale ('detail' ou 'historique') */
    ongletActif: 'detail' | 'historique' = 'detail';

    @Output() close = new EventEmitter<void>();
    @Output() executeAction = new EventEmitter<WorkflowActionDto>();
    @Output() deposerRemplacant = new EventEmitter<DemandeDocumentDto>();

    /** Demande de relecture de la pièce jointe : c'est l'écran porteur qui appelle le serveur
     *  et qui l'ouvre dans le volet d'aperçu. */
    @Output() consulterPieceJointe = new EventEmitter<DemandeDocumentDto>();

    /**
     * Décisions proposées : celles que le serveur déclare autorisées à l'étape courante.
     *
     * <p>Aucune garde applicative ne s'y ajoute. Le circuit vérifie déjà le rôle de l'étape auprès
     * de user-service, et doubler ce contrôle d'une permission propre à l'écran masquait toute
     * décision à qui détenait pourtant le rôle attendu — une permission récemment ajoutée au
     * dictionnaire n'est acquise aux rôles qu'au redémarrage de user-service, et l'écran restait
     * muet sur la raison.</p>
     */
    get actionsAutorisees(): WorkflowActionDto[] {
        return this.workflowState?.allowedActions ?? [];
    }

    /**
     * Le circuit est clos : plus aucune décision n'est attendue.
     *
     * <p>Lu sur l'état de la demande, non sur le circuit : c'est support-service qui sait qu'une
     * décision finale est tombée, `WorkflowStateDto` ne porte pas de marqueur de clôture.</p>
     */
    get circuitTermine(): boolean {
        return this.demande?.etat === 'REFUSEE' || this.demande?.etat === 'EXECUTEE';
    }

    /** Seule une modification acceptée attend un fichier ; le reste n'a rien à déposer. */
    get attendUnRemplacant(): boolean {
        return this.demande?.type === 'MODIFICATION' && this.demande?.etat === 'ACCEPTEE';
    }

    libelleType(): string {
        return this.demande?.type === 'SUPPRESSION' ? 'Suppression' : 'Modification';
    }

    libelleEtat(): string {
        if (!this.demande) {
            return '';
        }
        switch (this.demande.etat) {
            case 'EN_COURS': return 'En cours d’instruction';
            case 'ACCEPTEE': return this.demande.type === 'MODIFICATION'
                ? 'Acceptée — remplaçant attendu'
                : 'Acceptée — retrait en cours';
            case 'REFUSEE': return 'Refusée';
            case 'EXECUTEE': return this.demande.type === 'MODIFICATION'
                ? 'Remplacé' : 'Document supprimé';
            default: return this.demande.etat;
        }
    }

    couleurEtat(): string {
        switch (this.demande?.etat) {
            case 'EN_COURS': return 'bg-[#0ea5e9]/10 text-[#0084ca] dark:text-sky-300 border-[#0ea5e9]/35';
            case 'ACCEPTEE': return 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30';
            case 'REFUSEE': return 'bg-surface-100 dark:bg-surface-800 text-[var(--text-color-secondary)] border-[#dddddd] dark:border-surface-700';
            case 'EXECUTEE': return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
            default: return 'bg-surface-100 dark:bg-surface-800 text-[var(--text-color-secondary)] border-[#dddddd] dark:border-surface-700';
        }
    }

    /** Une décision de rejet se distingue d'un accord : la couleur du bouton le dit. */
    classeAction(action: WorkflowActionDto): string {
        return action.decision === 'REJETE' ? 'p-button-danger p-button-sm' : 'p-button-info p-button-sm';
    }

    iconeAction(action: WorkflowActionDto): string {
        return action.decision === 'REJETE' ? 'pi pi-times' : 'pi pi-check';
    }
}
