import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TypeConstatRef } from '../../models/audit.model';

/**
 * La nature d'un constat, choisie parmi les types de constat paramétrés : un segment par type,
 * à la couleur du type, comme le sélecteur « Constat » de la maquette (C10, C10M, C10P).
 */
@Component({
    selector: 'app-nature-choix',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="flex flex-wrap gap-2">
            <button *ngFor="let t of types" type="button" [disabled]="disabled" (click)="choisir(t)"
                    class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border transition-colors disabled:cursor-not-allowed"
                    [ngClass]="t.id === valeur
                        ? 'font-semibold text-surface-900 dark:text-surface-0'
                        : 'border-surface-300 dark:border-surface-600 text-surface-600 dark:text-surface-300 bg-transparent hover:bg-surface-100 dark:hover:bg-surface-800'"
                    [style.borderColor]="t.id === valeur ? (t.couleur || 'var(--p-primary-color)') : null"
                    [style.background]="t.id === valeur ? teinte(t.couleur) : null">
                <span class="w-2.5 h-2.5 rounded-full shrink-0" [style.background]="t.couleur || '#94a3b8'"></span>
                {{ t.libelle }}
                <span *ngIf="t.genereNonConformite" class="text-[10px] font-bold text-red-600 dark:text-red-400">NC</span>
            </button>
            <span *ngIf="!types.length" class="text-xs text-amber-600">Aucun type de constat paramétré pour votre direction.</span>
        </div>
    `
})
export class NatureChoixComponent {
    @Input() types: TypeConstatRef[] = [];
    @Input() valeur?: string | null;
    @Input() disabled = false;
    @Output() valeurChange = new EventEmitter<string>();

    choisir(t: TypeConstatRef): void {
        if (t.id && !this.disabled) {
            this.valeur = t.id;
            this.valeurChange.emit(t.id);
        }
    }

    /** Le fond du segment choisi : la couleur du type, très atténuée. */
    teinte(couleur?: string): string {
        return couleur && /^#[0-9a-f]{6}$/i.test(couleur) ? couleur + '1f' : 'var(--p-primary-50)';
    }
}
