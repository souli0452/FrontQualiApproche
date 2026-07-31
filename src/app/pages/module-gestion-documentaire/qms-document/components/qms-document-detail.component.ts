import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgPrimeModule } from '../../../../../prime-ng.module';
import { DocumentQms } from '../../../../models/gestion-documentaire.model';
import { WorkflowActionDto, WorkflowStateDto } from '../../../../models/workflow.model';

/**
 * Fiche d'un document : caractéristiques, état, et barre d'actions.
 *
 * <p>C'est ici que se concentrent les actions possibles sur un document, la liste s'étant limitée
 * à l'ouverture d'une ligne. Chaque bouton n'apparaît que si l'utilisateur détient la permission
 * correspondante, et les actions de circuit sont celles que le serveur déclare autorisées à
 * l'étape courante — l'écran ne propose donc jamais une action qui serait refusée.</p>
 */
@Component({
    selector: 'app-qms-document-detail',
    standalone: true,
    imports: [CommonModule, NgPrimeModule],
    templateUrl: './qms-document-detail.component.html'
})
export class QmsDocumentDetailComponent {
    @Input() document!: DocumentQms;
    @Input() workflowState?: WorkflowStateDto;

    /** Permissions de l'utilisateur, résolues par le parent. */
    @Input() canDownload = false;
    @Input() canViewHistory = false;
    @Input() canViewAudit = false;
    @Input() canValidate = false;
    @Input() canShare = false;

    @Input() statusLabel: (doc: DocumentQms) => string = () => '';
    @Input() statusSeverity: (doc: DocumentQms) => string = () => 'info';
    @Input() actionIcon: (action: WorkflowActionDto) => string = () => 'pi pi-cog';
    @Input() actionClass: (action: WorkflowActionDto) => string = () => 'p-button-secondary';

    @Output() close = new EventEmitter<void>();
    @Output() openDocument = new EventEmitter<DocumentQms>();
    @Output() downloadPdf = new EventEmitter<DocumentQms>();
    @Output() viewHistory = new EventEmitter<DocumentQms>();
    @Output() viewAudit = new EventEmitter<DocumentQms>();
    @Output() share = new EventEmitter<DocumentQms>();
    @Output() executeAction = new EventEmitter<WorkflowActionDto>();

    get allowedActions(): WorkflowActionDto[] {
        return this.workflowState?.allowedActions ?? [];
    }
}
