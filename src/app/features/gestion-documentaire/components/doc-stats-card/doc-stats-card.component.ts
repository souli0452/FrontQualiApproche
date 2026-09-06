import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SkeletonModule } from 'primeng/skeleton';

@Component({
    selector: 'app-doc-stats-card',
    standalone: true,
    imports: [CommonModule, SkeletonModule],
    template: `
    <div class="card-stats p-5 h-full relative overflow-hidden transition-all duration-300 border border-white/50" [ngClass]="'card-' + color">

        <!-- SQUELETTE (Si loading est vrai) -->
        <div *ngIf="loading" class="relative z-10">
            <p-skeleton width="4rem" height="1.5rem" styleClass="mb-3 rounded-md"></p-skeleton>
            <p-skeleton width="3rem" height="2.5rem" styleClass="mb-2"></p-skeleton>
            <p-skeleton width="100%" height="1rem" styleClass="mb-1"></p-skeleton>
        </div>

        <!-- CONTENU RÉEL -->
        <ng-container *ngIf="!loading">
            <div class="relative z-10 flex flex-col justify-between h-full">
                <div>
                    <span class="bg-white text-[11px] font-semibold px-2 py-1 rounded-md inline-block mb-3 shadow-sm" [ngClass]="'text-' + color + '-dark'">
                        {{ label }}
                    </span>
                    <div class="text-4xl font-bold text-surface-900 mb-1 leading-none tracking-tight">
                        {{ value }}
                    </div>
                    <div *ngIf="description" class="text-surface-700 text-xs w-full leading-snug mb-2">
                        {{ description }}
                    </div>
                    <ng-content></ng-content>
                </div>

                <div class="absolute right-2 top-2">
                    <span class="text-xs rounded-full p-3 bg-white h-4 w-4 font-bold text-surface-900 flex items-center justify-center">
                        <i [class]="icon + ' text-[12px]'"></i>
                    </span>
                </div>
            </div>
        </ng-container>
    </div>
    `,
    styles: [`
        .card-blue { background: #EDF4FF; }
        .text-blue-dark { color: #3B82F6; }

        .card-orange { background: #FFF5EB; }
        .text-orange-dark { color: #D49E5D; }

        .card-red { background: #FFF0F0; }
        .text-red-dark { color: #EF4444; }

        .card-green { background: #EEF7F0; }
        .text-green-dark { color: #15803D; }

        .card-purple { background: #F5EEFF; }
        .text-purple-dark { color: #A855F7; }

        .card-stats {
            border-radius: 1.5rem;
            &:hover { transform: translateY(-4px); box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); }
        }
    `]
})
export class DocStatsCardComponent {
    @Input() label: string = '';
    @Input() value: number | string = 0;
    @Input() icon: string = '';
    @Input() color: 'blue' | 'orange' | 'red' | 'green' | 'purple' = 'blue';
    @Input() description: string = '';
    @Input() loading: boolean = false;
}
