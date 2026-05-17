import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SkeletonModule } from 'primeng/skeleton';

@Component({
    selector: 'app-nc-stats-card',
    standalone: true,
    imports: [CommonModule, SkeletonModule],
    template: `
    <div class="card-stats p-5 h-full relative overflow-hidden transition-all duration-300" [ngClass]="'card-' + color">
        <!-- SQUELETTE (Si loading est vrai) -->
        <div *ngIf="loading">
            <div class="flex justify-between mb-3">
                <p-skeleton width="4rem" height="1rem"></p-skeleton>
                <p-skeleton shape="circle" size="1.5rem"></p-skeleton>
            </div>
            <p-skeleton width="80%" height="3rem" styleClass="mb-4"></p-skeleton>
            <div class="flex gap-2">
                <p-skeleton width="3rem" height="1rem"></p-skeleton>
                <p-skeleton width="100%" height="1rem"></p-skeleton>
            </div>
        </div>
        <!-- La Vague SVG (fond) -->
        <ng-container *ngIf="!loading">
        <svg class="absolute bottom-0 left-0 w-full h-20 opacity-[0.08]" 
            [ngClass]="'text-' + color + '-dark'"
            viewBox="0 0 100 30" preserveAspectRatio="none">
            <path d="M0,30 L0,15 C20,20 40,5 60,15 C80,25 90,10 100,5 L100,30 Z" fill="currentColor"/>
        </svg>

        <div class="relative z-10">
            <!-- Header: Label + Icon -->
            <div class="flex justify-between items-start mb-2">
                <div class="text-sm uppercase tracking-wider font-bold" [ngClass]="'text-' + color + '-dark'">
                    {{ label }}
                </div>
                <i [class]="icon + ' text-sm'" [ngClass]="'text-' + color + '-dark'"></i>
            </div>

            <!-- Body: Value -->
            <div class="text-5xl font-semibold mb-2" [ngClass]="'text-' + color + '-dark'">
                {{ value }}
            </div>

            <!-- Footer: Badge + Description -->
            <div class="flex items-center gap-2 mt-4">
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold" [ngClass]="'bg-' + color + '-badge text-' + color + '-dark'">
                    {{ badge }}
                </span>
                <span class="text-xs leading-tight text-black dark:text-white flex-1">
                    {{ description }}
                </span>
            </div>
        </div>
        </ng-container>
    </div>
    `,
    styles: [`
        /* Dégradés exacts basés sur ton fichier indicateur-cle */
        .card-blue { background: linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(37, 99, 235, 0.1) 100%); }
        .text-blue-dark { color: #0e7490; }
        .bg-blue-badge { background: rgba(6, 182, 212, 0.2); }

        .card-orange { background: linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(234, 88, 12, 0.1) 100%); }
        .text-orange-dark { color: #b45309; }
        .bg-orange-badge { background: rgba(245, 158, 11, 0.2); }

        .card-red { background: linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(185, 28, 28, 0.1) 100%); }
        .text-red-dark { color: #b91c1c; }
        .bg-red-badge { background: rgba(239, 68, 68, 0.2); }

        .card-green { background: linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(21, 128, 61, 0.1) 100%); }
        .text-green-dark { color: #15803d; }
        .bg-green-badge { background: rgba(34, 197, 94, 0.2); }

        .card-stats {
            border-radius: 8px;
            // border: 1px solid var(--surface-border);
            &:hover { transform: translateY(-3px); }
        }
    `]
})
export class NcStatsCardComponent {
    @Input() label: string = '';
    @Input() value: number | string = 0;
    @Input() icon: string = '';
    @Input() color: 'blue' | 'orange' | 'red' | 'green' | 'purple' = 'blue';
    @Input() badge: string = '';
    @Input() description: string = '';
    @Input() loading: boolean = false; 
}
