import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MentionRQAPBF } from '../models/audit.model';

/**
 * La mention qu'un score RQAP-BF vaut selon la grille de la direction : niveau, étoiles, mention,
 * et les garde-fous qui l'ont retenue (recette du 17 oct. 2026, observation 28).
 */
@Component({
    selector: 'app-mention-rqapbf',
    standalone: true,
    imports: [CommonModule],
    template: `
        <ng-container *ngIf="mention">
            <div class="font-semibold">{{ mention.niveau }}</div>
            <div class="text-amber-500 text-lg my-1" [attr.aria-label]="mention.etoiles + ' étoile(s) sur ' + etoiles.length">
                <i *ngFor="let e of etoiles" class="pi" [ngClass]="e ? 'pi-star-fill' : 'pi-star'"></i>
            </div>
            <div class="text-sm">{{ mention.mention }}</div>
            <div class="text-xs text-surface-500">Tranche [{{ mention.scoreMin | number: '1.0-1' }} – {{ mention.scoreMax | number: '1.0-1' }}{{ mention.scoreMax >= 100 ? ']' : '[' }}</div>
            <div *ngIf="mention.plafonnee" class="text-xs text-orange-600 mt-2">
                <i class="pi pi-exclamation-triangle text-xs"></i>
                Plafonnée : domaine(s) sous 50 % — {{ mention.domainesSousLeSeuil?.join(', ') }}.
            </div>
            <div *ngIf="mention.sousReserve" class="text-xs text-orange-600 mt-1">
                <i class="pi pi-info-circle text-xs"></i>
                Sous réserve de la levée de {{ mention.ecarts }} écart(s), traité(s) au module Non-conformités.
            </div>
        </ng-container>
    `
})
export class MentionRqapbfComponent {
    @Input() mention?: MentionRQAPBF | null;

    /** Quatre étoiles au moins, comme la grille par défaut ; plus si la direction en donne plus. */
    get etoiles(): boolean[] {
        const n = this.mention?.etoiles ?? 0;
        return Array.from({ length: Math.max(4, n) }, (_, i) => i < n);
    }
}
