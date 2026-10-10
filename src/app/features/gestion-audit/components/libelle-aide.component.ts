import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PopoverModule } from 'primeng/popover';

/** Le libellé d'un champ et son « ? » d'aide, comme sur la déclaration d'une non-conformité. */
@Component({
    selector: 'app-audit-libelle',
    standalone: true,
    imports: [CommonModule, PopoverModule],
    template: `
        <div class="flex items-center mb-1 gap-2">
            <label class="font-semibold m-0">{{ texte }} <span *ngIf="requis" class="text-red-500">*</span></label>
            <ng-container *ngIf="aide">
                <i class="pi pi-question-circle text-surface-500 cursor-pointer hover:text-primary transition-colors" (click)="bulle.toggle($event)"></i>
                <p-popover #bulle>
                    <div class="p-2 text-sm text-surface-700 leading-relaxed" style="max-width: 300px;">{{ aide }}</div>
                </p-popover>
            </ng-container>
            <span class="ml-auto"><ng-content></ng-content></span>
        </div>
    `
})
export class AuditLibelleComponent {
    @Input() texte = '';
    @Input() aide = '';
    @Input() requis = false;
}
