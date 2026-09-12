import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SkeletonModule } from 'primeng/skeleton';
import { MeterGroup } from 'primeng/metergroup';

export type KpiCardColor = 'orange' | 'blue' | 'red' | 'green' | 'purple';

export interface KpiProgressionItem {
    label: string;
    value: number | string;
    icon?: string;
}

const KPI_COLOR_THEMES: Record<string, {
    cardBorder: string;
    cardBg: string;
    glowBg: string;
    iconBg: string;
    iconColor: string;
    pillBg: string;
    pillText: string;
    accentLine: string;
}> = {
    orange: {
        cardBorder: 'border-[#0084ca] hover:border-[#0084ca] dark:border-amber-500/30 dark:hover:border-amber-500/60',
        cardBg: 'bg-[#0084ca] first-card via-surface-0 to-surface-0/90 dark:from-amber-500/[0.12] dark:via-surface-900 dark:to-surface-900/90',
        glowBg: 'bg-[#0084ca]/15 dark:bg-amber-500/20',
        iconBg: 'bg-[#0084ca]/15 dark:bg-amber-500/25',
        iconColor: 'text-white dark:text-white',
        pillBg: 'bg-white dark:bg-amber-500/20',
        pillText: 'text-white dark:text-white',
        accentLine: 'bg-[#0084ca]'
    },
    blue: {
        cardBorder: 'border-sky-500 hover:border-sky-600 dark:border-sky-500/30 dark:hover:border-sky-500/60',
        cardBg: 'bg-gradient-to-tr from-white via-surface-0 to-surface-0/90 dark:from-sky-500/[0.12] dark:via-surface-900 dark:to-surface-900/90',
        glowBg: 'bg-sky-500/15 dark:bg-sky-500/20',
        iconBg: 'bg-sky-500/15 dark:bg-sky-500/25',
        iconColor: 'text-sky-600 dark:text-sky-400',
        pillBg: 'bg-sky-500/15 dark:bg-sky-500/20',
        pillText: 'text-sky-700 dark:text-sky-300',
        accentLine: 'bg-sky-500'
    },
    red: {
        cardBorder: 'border-rose-500 hover:border-rose-600 dark:border-rose-500/30 dark:hover:border-rose-500/60',
        cardBg: 'bg-gradient-to-tr from-white via-surface-0 to-surface-0/90 dark:from-rose-500/[0.12] dark:via-surface-900 dark:to-surface-900/90',
        glowBg: 'bg-rose-500/15 dark:bg-rose-500/20',
        iconBg: 'bg-rose-500/15 dark:bg-rose-500/25',
        iconColor: 'text-rose-600 dark:text-rose-400',
        pillBg: 'bg-rose-500/15 dark:bg-rose-500/20',
        pillText: 'text-rose-700 dark:text-rose-300',
        accentLine: 'bg-rose-500'
    },
    green: {
        cardBorder: 'border-emerald-500 hover:border-emerald-600 dark:border-emerald-500/30 dark:hover:border-emerald-500/60',
        cardBg: 'bg-gradient-to-tr from-white via-surface-0 to-surface-0/90 dark:from-emerald-500/[0.12] dark:via-surface-900 dark:to-surface-900/90',
        glowBg: 'bg-emerald-500/15 dark:bg-emerald-500/20',
        iconBg: 'bg-emerald-500/15 dark:bg-emerald-500/25',
        iconColor: 'text-emerald-600 dark:text-emerald-400',
        pillBg: 'bg-emerald-500/15 dark:bg-emerald-500/20',
        pillText: 'text-emerald-700 dark:text-emerald-300',
        accentLine: 'bg-emerald-500'
    },
    purple: {
        cardBorder: 'border-purple-500/20 hover:border-purple-500/40 dark:border-purple-500/30 dark:hover:border-purple-500/60',
        cardBg: 'bg-gradient-to-tr from-white via-surface-0 to-surface-0/90 dark:from-purple-500/[0.12] dark:via-surface-900 dark:to-surface-900/90',
        glowBg: 'bg-purple-500/15 dark:bg-purple-500/20',
        iconBg: 'bg-purple-500/15 dark:bg-purple-500/25',
        iconColor: 'text-purple-600 dark:text-purple-400',
        pillBg: 'bg-purple-500/15 dark:bg-purple-500/20',
        pillText: 'text-purple-700 dark:text-purple-300',
        accentLine: 'bg-purple-500'
    }
};

@Component({
    selector: 'app-kpi-card',
    standalone: true,
    imports: [CommonModule, RouterModule, SkeletonModule],
    templateUrl: './kpi-card.component.html'
})
export class KpiCardComponent {
    @Input() label: string = '';
    @Input() title: string = '';
    @Input() value: number | string = 0;
    @Input() icon: string = 'pi pi-chart-line';
    @Input() color: string = 'blue';
    @Input() description?: string = '';
    @Input() routerLink?: string | any[];
    @Input() clickable: boolean = false;
    @Input() loading: boolean = false;
    @Input() progressionItems?: KpiProgressionItem[] = [];
    @Input() percentage?: number;

    // Nouveaux inputs pour enrichir le 1er bloc (et personnalisation avancée)
    @Input() metaBadge?: string = '';
    @Input() subText?: string = '';
    @Input() meterData?: any[] = [];
    @Input() meterMax?: number = 100;

    @Output() cardClick = new EventEmitter<MouseEvent>();

    get theme() {
        return KPI_COLOR_THEMES[this.color] || KPI_COLOR_THEMES['blue'];
    }

    onCardClick(event: MouseEvent): void {
        if (this.clickable || this.routerLink) {
            this.cardClick.emit(event);
        }
    }
}
