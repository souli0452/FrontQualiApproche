import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgPrimeModule } from '../../../../../prime-ng.module';
import { DocumentQms } from '../../../../models/gestion-documentaire.model';
import { ValidationHistoryDto } from '../../../../models/workflow.model';

/**
 * Traçabilité du circuit de validation : qui a décidé quoi, quand, et sur quelles bases.
 *
 * <p>Ces enregistrements existaient depuis toujours côté serveur sans qu'aucun écran ne les
 * relise : l'historique documentaire présenté jusqu'ici est celui des <b>versions</b> du fichier,
 * et la piste d'audit celui des accès. Ni l'un ni l'autre ne disait qui avait validé, ni pourquoi.
 * C'est pourtant la question que pose un auditeur.</p>
 *
 * <p>À distinguer donc des deux vues voisines : celle-ci porte sur les décisions, valeurs saisies
 * comprises.</p>
 */
@Component({
  selector: 'app-qms-workflow-historique',
  standalone: true,
  imports: [CommonModule, NgPrimeModule],
  templateUrl: './qms-workflow-historique.component.html'
})
export class QmsWorkflowHistoriqueComponent {
  @Input() document?: DocumentQms;
  @Input() historique: ValidationHistoryDto[] = [];
  @Input() loading = false;

  @Output() close = new EventEmitter<void>();

  /**
   * Distingue une approbation d'un rejet à partir du libellé enregistré.
   *
   * <p>L'historique conserve le libellé de la transition franchie — celui qu'a lu le décideur —
   * et non sa valeur machine. Un circuit peut donc nommer ses actions librement ; le repérage
   * reste volontairement tolérant, et retombe sur un rendu neutre s'il ne reconnaît rien.</p>
   */
  estRejet(entree: ValidationHistoryDto): boolean {
    const decision = (entree.decision ?? '').toLowerCase();
    return decision.includes('rejet') || decision.includes('refus') || decision.includes('reject');
  }

  estApprobation(entree: ValidationHistoryDto): boolean {
    const decision = (entree.decision ?? '').toLowerCase();
    return (
      !this.estRejet(entree) &&
      (decision.includes('valid') || decision.includes('approu') || decision.includes('accept'))
    );
  }

  icone(entree: ValidationHistoryDto): string {
    if (this.estRejet(entree)) return 'pi pi-times-circle';
    if (this.estApprobation(entree)) return 'pi pi-check-circle';
    return 'pi pi-arrow-right-arrow-left';
  }

  couleur(entree: ValidationHistoryDto): string {
    if (this.estRejet(entree)) return 'text-red-600';
    if (this.estApprobation(entree)) return 'text-emerald-600';
    return 'text-slate-500';
  }

  aDesValeurs(entree: ValidationHistoryDto): boolean {
    return (entree.fieldValues?.length ?? 0) > 0;
  }
}
