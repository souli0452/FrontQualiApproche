import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * La mise en page des formulaires de création du module, sur le modèle de la déclaration d'une
 * non-conformité : le formulaire à gauche (deux tiers), les conseils à droite (un tiers).
 *
 * <p>Contenus projetés : le formulaire (par défaut), `[actions]` pour la barre de boutons sous le
 * formulaire, `[cote]` pour des panneaux supplémentaires au-dessus des conseils.</p>
 */
@Component({
    selector: 'app-audit-page-formulaire',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="flex flex-col md:flex-row p-4">
            <div class="w-full md:w-2/3 md:pr-4">
                <div class="p-4 bg-gray-50 dark:bg-surface-900 rounded-xl border border-2 border-gray-100 dark:border-surface-700">
                    <div class="flex items-center gap-3">
                        <div class="flex items-center justify-center bg-blue-50 dark:bg-blue-950/40 text-blue-500 rounded-full shrink-0" style="width: 3.5rem; height: 3.5rem">
                            <i class="pi text-2xl" [ngClass]="icone"></i>
                        </div>
                        <div class="flex flex-col">
                            <span class="font-bold text-2xl text-surface-900 dark:text-surface-0 mb-1">{{ titre }}</span>
                            <span class="text-surface-500 text-sm">{{ sousTitre }}</span>
                        </div>
                    </div>
                    <hr class="my-3 border-surface-200 dark:border-surface-700">
                    <div class="surface-section">
                        <ng-content></ng-content>
                    </div>
                </div>
                <div class="flex justify-between gap-2 mt-6">
                    <ng-content select="[actions]"></ng-content>
                </div>
            </div>
            <div class="w-full md:w-1/3 md:pl-4 mt-6 md:mt-0 flex flex-col gap-6">
                <ng-content select="[cote]"></ng-content>
                <div *ngIf="conseils.length" class="p-4 bg-gray-50 dark:bg-surface-900 rounded-xl border border-2 border-gray-100 dark:border-surface-700">
                    <h3 class="text-xl font-bold text-surface-900 dark:text-surface-0 mt-0 mb-4">Conseils rapides</h3>
                    <div class="flex flex-col gap-3">
                        <div *ngFor="let c of conseils" class="flex items-start gap-3">
                            <i class="pi pi-check-circle text-green-500 text-xl mt-1"></i>
                            <span class="text-surface-700 dark:text-surface-300 leading-relaxed">{{ c }}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `
})
export class AuditPageFormulaireComponent {
    @Input() titre = '';
    @Input() sousTitre = '';
    @Input() icone = 'pi-plus-circle';
    @Input() conseils: string[] = [];
}
