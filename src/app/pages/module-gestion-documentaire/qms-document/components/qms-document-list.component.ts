import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgPrimeModule } from '../../../../../prime-ng.module';
import { DocumentQms, QmsDocumentType } from '../../../../models/gestion-documentaire.model';

/**
 * Liste des documents : recherche, filtres et tableau.
 *
 * <p>Composant de présentation — il ne détient aucun état métier et ne fait aucun appel : les
 * critères de recherche lui sont fournis et toute action est remontée au parent. Le menu d'actions
 * par ligne a été retiré : une ligne s'ouvre, et c'est la fiche du document qui expose les actions
 * possibles, en fonction des droits de l'utilisateur.</p>
 */
@Component({
    selector: 'app-qms-document-list',
    standalone: true,
    imports: [CommonModule, FormsModule, NgPrimeModule],
    templateUrl: './qms-document-list.component.html'
})
export class QmsDocumentListComponent {
    @Input() documents: DocumentQms[] = [];
    @Input() documentTypes: QmsDocumentType[] = [];
    @Input() structures: any[] = [];
    @Input() loading = false;

    @Input() searchQuery = '';
    @Input() selectedType = '';
    @Input() selectedService = '';

    @Output() searchQueryChange = new EventEmitter<string>();
    @Output() selectedTypeChange = new EventEmitter<string>();
    @Output() selectedServiceChange = new EventEmitter<string>();

    /** Rechargement demandé : saisie validée, filtre modifié ou bouton Actualiser. */
    @Output() refresh = new EventEmitter<void>();
    /** Ouverture de la fiche d'un document. */
    @Output() open = new EventEmitter<DocumentQms>();

    /** Libellé et couleur de l'état, fournis par le parent qui détient la règle d'affichage. */
    @Input() statusLabel: (doc: DocumentQms) => string = () => '';
    @Input() statusSeverity: (doc: DocumentQms) => string = () => 'info';

    /**
     * État du circuit, résolu par le parent auprès de workflow-service.
     *
     * <p>Complète l'état du document sans le remplacer : celui-ci dit où en est le fichier
     * (brouillon, obsolète, en retard de révision), celui-là où en est sa validation — et
     * si l'utilisateur qui consulte a une décision à prendre.</p>
     */
    @Input() etapeDeCircuit: (doc: DocumentQms) => string | undefined = () => undefined;
    @Input() aUneDecisionAttendue: (doc: DocumentQms) => boolean = () => false;
    @Input() circuitTermine: (doc: DocumentQms) => boolean = () => false;
}
