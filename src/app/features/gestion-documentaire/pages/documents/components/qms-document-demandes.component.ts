import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgPrimeModule } from '@prime-ng';
import { DocumentQms } from '@features/gestion-documentaire/models/document.model';
import { DemandeDocumentDto } from '@features/gestion-documentaire/models/demande.model';

/**
 * Demandes de modification et de suppression portées sur un document.
 *
 * <p>Quatrième regard sur un dossier, distinct des trois autres : l'historique porte sur les
 * versions du fichier, la piste d'audit sur les opérations, la traçabilité sur les décisions du
 * circuit du document — aucune ne dit ce qu'on a <i>demandé</i> à son sujet, ni ce qui en a été
 * décidé.</p>
 */
@Component({
    selector: 'app-qms-document-demandes',
    standalone: true,
    imports: [CommonModule, NgPrimeModule],
    templateUrl: './qms-document-demandes.component.html'
})
export class QmsDocumentDemandesComponent {
    @Input() document?: DocumentQms;
    @Input() demandes: DemandeDocumentDto[] = [];
    @Input() loading = false;

    @Output() close = new EventEmitter<void>();

    /** Nature de la demande, dite en toutes lettres. */
    libelleType(demande: DemandeDocumentDto): string {
        return demande.type === 'SUPPRESSION' ? 'Suppression' : 'Modification';
    }

    /**
     * État lisible. « Acceptée » n'est pas « faite » : une modification acceptée attend son
     * fichier remplaçant, et une suppression décidée mais non exécutée doit se voir comme telle.
     */
    libelleEtat(demande: DemandeDocumentDto): string {
        switch (demande.etat) {
            case 'EN_COURS': return 'En cours d’instruction';
            case 'ACCEPTEE': return demande.type === 'MODIFICATION'
                ? 'Acceptée — remplaçant attendu'
                : 'Acceptée — retrait en cours';
            case 'REFUSEE': return 'Refusée';
            case 'EXECUTEE': return demande.type === 'MODIFICATION' ? 'Remplacé' : 'Document supprimé';
            default: return demande.etat;
        }
    }

    couleurEtat(demande: DemandeDocumentDto): string {
        switch (demande.etat) {
            case 'EN_COURS': return 'bg-[#0ea5e9]/10 text-[#0084ca] dark:text-sky-300 border-[#0ea5e9]/35';
            case 'ACCEPTEE': return 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30';
            case 'REFUSEE': return 'bg-surface-100 dark:bg-surface-800 text-[var(--text-color-secondary)] border-[#dddddd] dark:border-surface-700';
            case 'EXECUTEE': return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
            default: return 'bg-surface-100 dark:bg-surface-800 text-[var(--text-color-secondary)] border-[#dddddd] dark:border-surface-700';
        }
    }

    icone(demande: DemandeDocumentDto): string {
        return demande.type === 'SUPPRESSION' ? 'pi pi-trash' : 'pi pi-pencil';
    }

    couleurIcone(demande: DemandeDocumentDto): string {
        return demande.type === 'SUPPRESSION' ? 'text-rose-500' : 'text-[#0084ca] dark:text-sky-400';
    }
}
