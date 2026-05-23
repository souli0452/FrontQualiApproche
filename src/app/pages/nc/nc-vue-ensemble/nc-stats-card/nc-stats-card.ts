import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SkeletonModule } from 'primeng/skeleton';

@Component({
    selector: 'app-nc-stats-card',
    standalone: true,
    imports: [CommonModule, SkeletonModule],
    template: `
    <div class="card-stats p-6 h-full relative overflow-hidden transition-all duration-300 border border-white/50" [ngClass]="'card-' + color">
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
        <svg class="absolute bottom-0 left-0 w-full h-20 opacity-[0.05]" 
            [ngClass]="'text-' + color + '-dark'"
            viewBox="0 0 100 30" preserveAspectRatio="none">
            <path d="M0,30 L0,15 C20,20 40,5 60,15 C80,25 90,10 100,5 L100,30 Z" fill="currentColor"/>
        </svg>

        <div class="relative z-10 flex flex-col h-full">
            <!-- Header: Label + Icon -->
            <div class="flex justify-between items-start mb-4">
                <span class="bg-white text-[11px] font-bold px-2 py-1 rounded-md shadow-sm" [ngClass]="'text-' + color + '-dark'">
                    {{ label }}
                </span>
                <i [class]="icon + ' text-sm'" [ngClass]="'text-' + color + '-dark'"></i>
            </div>

            <!-- Body: Value -->
            <div class="text-4xl font-bold text-surface-900 mb-2 leading-none tracking-tight">
                {{ value }}
            </div>

            <!-- Footer: Badge + Description -->
            <div class="mt-auto pt-3">
                <span class="text-xs font-semibold text-surface-700 leading-snug flex items-center gap-2">
                    <span class="px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap" [ngClass]="'bg-' + color + '-badge text-' + color + '-dark'">
                        {{ badge }}
                    </span>
                    {{ description }}
                </span>
            </div>
        </div>
        </ng-container>
    </div>
    `,
    styles: [`
        /* Couleurs SaaS Pastel exactes */
        .card-blue { background: #EDF4FF; }
        .text-blue-dark { color: #3B82F6; }
        .bg-blue-badge { background: rgba(59, 130, 246, 0.2); }

        .card-orange { background: #FFF5EB; }
        .text-orange-dark { color: #D49E5D; }
        .bg-orange-badge { background: rgba(212, 158, 93, 0.2); }

        .card-red { background: #FFF0F0; }
        .text-red-dark { color: #EF4444; }
        .bg-red-badge { background: rgba(239, 68, 68, 0.2); }

        .card-green { background: #EEF7F0; }
        .text-green-dark { color: #15803D; }
        .bg-green-badge { background: rgba(21, 128, 61, 0.2); }

        .card-purple { background: #F5EEFF; }
        .text-purple-dark { color: #A855F7; }
        .bg-purple-badge { background: rgba(168, 85, 247, 0.2); }

        .card-stats {
            border-radius: 1.5rem;
            &:hover { transform: translateY(-3px); box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }
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
