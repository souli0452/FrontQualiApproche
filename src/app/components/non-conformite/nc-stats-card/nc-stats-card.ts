import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SkeletonModule } from 'primeng/skeleton';

@Component({
    selector: 'app-nc-stats-card',
    standalone: true,
    imports: [CommonModule, SkeletonModule],
    template: `
    <div class="card-stats p-5 h-full relative overflow-hidden transition-all duration-300 border border-white/50" [ngClass]="'card-' + color">
        
        <!-- SQUELETTE (Si loading est vrai) -->
        <div *ngIf="loading" class="relative z-10">
            <p-skeleton width="4rem" height="1.5rem" styleClass="mb-3 rounded-md"></p-skeleton>
            <p-skeleton width="3rem" height="2.5rem" styleClass="mb-2"></p-skeleton>
            <p-skeleton width="100%" height="1rem" styleClass="mb-1"></p-skeleton>
            <p-skeleton width="80%" height="2rem"></p-skeleton>
        </div>

        <!-- CONTENU RÉEL -->
        <ng-container *ngIf="!loading">
            <!-- Motifs abstraits dynamiques par couleur -->
            <ng-container [ngSwitch]="color">
                <!-- Motif Orange -->
                <div *ngSwitchCase="'orange'" class="absolute -right-6 top-1/2 -translate-y-1/2 flex opacity-30 flex-wrap w-24 h-24 rotate-45 pointer-events-none">
                    <div class="w-10 h-10 bg-[#FFDCA8] rounded-2xl m-1"></div>
                    <div class="w-10 h-10 bg-[#FFDCA8] rounded-2xl m-1"></div>
                    <div class="w-10 h-10 bg-[#FFDCA8] rounded-2xl m-1"></div>
                    <div class="w-10 h-10 bg-[#FFDCA8] rounded-2xl m-1"></div>
                </div>
                <!-- Motif Bleu -->
                <div *ngSwitchCase="'blue'" class="absolute -right-4 top-4 flex flex-wrap w-24 h-24 opacity-30 pointer-events-none">
                    <div class="w-10 h-10 bg-[#C6D8FF] m-1 rounded-tl-lg"></div>
                    <div class="w-10 h-10 bg-[#C6D8FF] m-1 rounded-tr-full"></div>
                    <div class="w-10 h-10 bg-[#C6D8FF] m-1 rounded-bl-full"></div>
                    <div class="w-10 h-10 bg-[#C6D8FF] m-1 rounded-br-lg"></div>
                </div>
                <!-- Motif Rouge -->
                <div *ngSwitchCase="'red'" class="absolute -right-2 top-1/2 -translate-y-1/2 flex flex-col w-16 h-20 opacity-30 pointer-events-none">
                    <div class="w-16 h-10 bg-[#FFC9C9] rounded-bl-full mb-1"></div>
                    <div class="w-16 h-10 bg-[#FFC9C9] rounded-tl-full mt-1"></div>
                </div>
                <!-- Motif Vert -->
                <div *ngSwitchCase="'green'" class="absolute -right-6 top-1/2 -translate-y-1/2 w-24 h-24 bg-[#C5E8CE] rotate-45 rounded-[1.5rem] opacity-30 pointer-events-none flex items-center justify-center">
                    <div class="w-12 h-12 bg-[#EEF7F0] rounded-xl"></div>
                </div>
                <!-- Motif Violet (Par défaut) -->
                <div *ngSwitchDefault class="absolute -right-4 bottom-0 flex flex-wrap w-24 h-24 opacity-30 pointer-events-none">
                    <div class="w-20 h-20 bg-[#D8B4FE] rounded-full m-1"></div>
                </div>
            </ng-container>

            <!-- Contenu Texte -->
            <div class="relative z-10 flex flex-col justify-between h-full">
                <div>
                    <!-- Label -->
                    <span class="bg-white text-[11px] font-semibold px-2 py-1 rounded-md inline-block mb-3 shadow-sm" [ngClass]="'text-' + color + '-dark'">
                        {{ label }}
                    </span>
                    <!-- Valeur -->
                    <div class="text-4xl font-bold text-surface-900 mb-1 leading-none tracking-tight">
                        {{ value }}
                    </div>
                    <!-- Titre Badge -->
                    <div *ngIf="badge" class="text-surface-700 font-bold text-sm w-full leading-snug">
                        {{ badge }}
                    </div>
                    <!-- Description -->
                    <div *ngIf="description" class="text-surface-700 text-xs w-full leading-snug mb-2">
                        {{ description }}
                    </div>
                    
                    <!-- Espace libre pour du contenu personnalisé (ex: petites statistiques en plus) -->
                    <ng-content></ng-content>
                </div>

                <!-- Icône Bouton (flèche par défaut) -->
                <div class="absolute right-0 top-0">
                    <span class="text-xs rounded-full p-4 bg-white h-4 w-4 font-bold text-surface-900 hover:shadow-md transition-all cursor-pointer flex items-center justify-center gap-1" [ngClass]="'hover:text-' + color + '-dark hover:border-' + color + '-dark'">
                        <i [class]="icon + ' text-[10px]'"></i>
                    </span>
                </div>
            </div>
        </ng-container>
    </div>
    `,
    styles: [`
        /* Couleurs Premium */
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
export class NcStatsCardComponent {
    @Input() label: string = '';
    @Input() value: number | string = 0;
    @Input() icon: string = '';
    @Input() color: 'blue' | 'orange' | 'red' | 'green' | 'purple' = 'blue';
    @Input() badge: string = '';
    @Input() description: string = '';
    @Input() loading: boolean = false; 
}
