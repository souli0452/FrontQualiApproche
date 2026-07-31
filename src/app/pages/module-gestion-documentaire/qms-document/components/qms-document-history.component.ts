import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgPrimeModule } from '../../../../../prime-ng.module';
import { DocumentQms, QmsDocumentVersion } from '../../../../models/gestion-documentaire.model';

/**
 * Historique des versions d'un document : chronologie des itérations et de leurs motifs.
 *
 * <p>Composant de présentation : les versions lui sont fournies, il ne les charge pas.</p>
 */
@Component({
    selector: 'app-qms-document-history',
    standalone: true,
    imports: [CommonModule, NgPrimeModule],
    templateUrl: './qms-document-history.component.html'
})
export class QmsDocumentHistoryComponent {
    @Input() document!: DocumentQms;
    @Input() versionHistory: QmsDocumentVersion[] = [];
    @Output() close = new EventEmitter<void>();
}
