import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgPrimeModule } from '../../../../../prime-ng.module';
import { DocumentQms, QmsAuditLog } from '../../../../models/gestion-documentaire.model';

/**
 * Piste d'audit d'un document : journal des actions, avec leur auteur et leur horodatage.
 *
 * <p>Composant de présentation : les entrées lui sont fournies, il ne les charge pas.</p>
 */
@Component({
    selector: 'app-qms-document-audit',
    standalone: true,
    imports: [CommonModule, NgPrimeModule],
    templateUrl: './qms-document-audit.component.html'
})
export class QmsDocumentAuditComponent {
    @Input() document!: DocumentQms;
    @Input() auditLogs: QmsAuditLog[] = [];
    @Output() close = new EventEmitter<void>();
}
