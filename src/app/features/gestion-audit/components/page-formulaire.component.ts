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
        <div class="flex flex-col md:flex-row py-2">
            <div class="w-full md:w-2/3 md:pr-4">
                <div class="p-5 bg-[var(--surface-card)] rounded-[5px] border border-[#dddddd] dark:border-surface-700 shadow-card">
                    <div class="flex items-center gap-3">
                        <div class="flex items-center justify-center bg-[#0084ca]/10 dark:bg-[#0084ca]/20 text-[#0084ca] dark:text-sky-400 rounded-full shrink-0" style="width: 3.5rem; height: 3.5rem">
                            <i class="pi !text-2xl" [ngClass]="icone"></i>
                        </div>
                        <div class="flex flex-col">
                            <span class="font-bold text-[18px] text-[var(--heading-color)] mb-0.5">{{ titre }}</span>
                            <span class="text-[var(--text-color-secondary)] text-[13px]">{{ sousTitre }}</span>
                        </div>
                    </div>
                    <hr class="my-4 border-[#dddddd] dark:border-surface-700">
                    <div class="surface-section">
                        <ng-content></ng-content>
                    </div>
                </div>
                <div class="flex justify-between gap-2 mt-5">
                    <ng-content select="[actions]"></ng-content>
                </div>
            </div>
            <div class="w-full md:w-1/3 md:pl-4 mt-6 md:mt-0 flex flex-col gap-5">
                <ng-content select="[cote]"></ng-content>
                <div *ngIf="conseils.length" class="p-5 bg-[var(--surface-card)] rounded-[5px] border border-[#dddddd] dark:border-surface-700 shadow-card">
                    <h3 class="text-[16px] font-bold text-[var(--heading-color)] mt-0 mb-4">Conseils rapides</h3>
                    <div class="flex flex-col gap-3">
                        <div *ngFor="let c of conseils" class="flex items-start gap-2.5">
                            <i class="pi pi-check-circle text-emerald-500 !text-base mt-0.5 shrink-0"></i>
                            <span class="text-[13px] text-[var(--text-color-secondary)] leading-relaxed">{{ c }}</span>
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
