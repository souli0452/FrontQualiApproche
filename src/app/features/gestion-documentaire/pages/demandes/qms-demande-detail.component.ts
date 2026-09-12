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
console.error('>>> [DEBUG QmsDemandeDetailComponent imports]:', {
    CommonModule: typeof CommonModule,
    NgPrimeModule: typeof NgPrimeModule,
    WorkflowHistoriqueComponent: typeof WorkflowHistoriqueComponent
});

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

    @Output() close = new EventEmitter<void>();
    @Output() executeAction = new EventEmitter<WorkflowActionDto>();
    @Output() deposerRemplacant = new EventEmitter<DemandeDocumentDto>();

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
            case 'EN_COURS': return 'bg-blue-50 text-blue-700 border-blue-100';
            case 'ACCEPTEE': return 'bg-amber-50 text-amber-800 border-amber-100';
            case 'REFUSEE': return 'bg-slate-100 text-slate-600 border-slate-200';
            case 'EXECUTEE': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
            default: return 'bg-slate-50 text-slate-600 border-slate-200';
        }
    }

    /** Une décision de rejet se distingue d'un accord : la couleur du bouton le dit. */
    classeAction(action: WorkflowActionDto): string {
        return action.decision === 'REJETE' ? 'p-button-danger' : 'p-button-primary';
    }

    iconeAction(action: WorkflowActionDto): string {
        return action.decision === 'REJETE' ? 'pi pi-times' : 'pi pi-check';
    }
}
