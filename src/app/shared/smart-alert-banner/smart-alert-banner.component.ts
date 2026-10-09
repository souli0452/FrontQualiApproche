import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SmartAlertColor, SmartAlertItem } from './smart-alert-banner.model';

const COLOR_CLASSES: Record<SmartAlertColor, {
    border: string;
    bg: string;
    iconBg: string;
    iconText: string;
    badgeBg: string;
    badgeText: string;
    btn: string;
}> = {
    amber: {
        border: 'border-amber-500/20 dark:border-amber-500/30',
        bg: 'bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-500/15',
        iconBg: 'bg-amber-500/20 dark:bg-amber-500/30',
        iconText: 'text-amber-600 dark:text-amber-400',
        badgeBg: 'bg-amber-500 text-white',
        badgeText: 'text-amber-700 dark:text-amber-300',
        btn: 'text-amber-700 dark:text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 dark:bg-amber-500/20 dark:hover:bg-amber-500/30'
    },
    sky: {
        border: 'border-sky-500/20 dark:border-sky-500/30',
        bg: 'bg-gradient-to-r from-sky-500/10 via-sky-500/5 to-transparent dark:from-sky-500/15',
        iconBg: 'bg-sky-500/20 dark:bg-sky-500/30',
        iconText: 'text-sky-600 dark:text-sky-400',
        badgeBg: 'bg-sky-500 text-white',
        badgeText: 'text-sky-700 dark:text-sky-300',
        btn: 'text-sky-700 dark:text-sky-300 bg-sky-500/15 hover:bg-sky-500/25 dark:bg-sky-500/20 dark:hover:bg-sky-500/30'
    },
    blue: {
        border: 'border-blue-500/20 dark:border-blue-500/30',
        bg: 'bg-gradient-to-r from-blue-500/10 via-blue-500/5 to-transparent dark:from-blue-500/15',
        iconBg: 'bg-blue-500/20 dark:bg-blue-500/30',
        iconText: 'text-blue-600 dark:text-blue-400',
        badgeBg: 'bg-blue-500 text-white',
        badgeText: 'text-blue-700 dark:text-blue-300',
        btn: 'text-blue-700 dark:text-blue-300 bg-blue-500/15 hover:bg-blue-500/25 dark:bg-blue-500/20 dark:hover:bg-blue-500/30'
    },
    emerald: {
        border: 'border-emerald-500/20 dark:border-emerald-500/30',
        bg: 'bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent dark:from-emerald-500/15',
        iconBg: 'bg-emerald-500/20 dark:bg-emerald-500/30',
        iconText: 'text-emerald-600 dark:text-emerald-400',
        badgeBg: 'bg-emerald-500 text-white',
        badgeText: 'text-emerald-700 dark:text-emerald-300',
        btn: 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25 dark:bg-emerald-500/20 dark:hover:bg-emerald-500/30'
    },
    rose: {
        border: 'border-rose-500/20 dark:border-rose-500/30',
        bg: 'bg-gradient-to-r from-rose-500/10 via-rose-500/5 to-transparent dark:from-rose-500/15',
        iconBg: 'bg-rose-500/20 dark:bg-rose-500/30',
        iconText: 'text-rose-600 dark:text-rose-400',
        badgeBg: 'bg-rose-500 text-white',
        badgeText: 'text-rose-700 dark:text-rose-300',
        btn: 'text-rose-700 dark:text-rose-300 bg-rose-500/15 hover:bg-rose-500/25 dark:bg-rose-500/20 dark:hover:bg-rose-500/30'
    },
    purple: {
        border: 'border-purple-500/20 dark:border-purple-500/30',
        bg: 'bg-gradient-to-r from-purple-500/10 via-purple-500/5 to-transparent dark:from-purple-500/15',
        iconBg: 'bg-purple-500/20 dark:bg-purple-500/30',
        iconText: 'text-purple-600 dark:text-purple-400',
        badgeBg: 'bg-purple-500 text-white',
        badgeText: 'text-purple-700 dark:text-purple-300',
        btn: 'text-purple-700 dark:text-purple-300 bg-purple-500/15 hover:bg-purple-500/25 dark:bg-purple-500/20 dark:hover:bg-purple-500/30'
    },
    orange: {
        border: 'border-orange-500/20 dark:border-orange-500/30',
        bg: 'bg-gradient-to-r from-orange-500/10 via-orange-500/5 to-transparent dark:from-orange-500/15',
        iconBg: 'bg-orange-500/20 dark:bg-orange-500/30',
        iconText: 'text-orange-600 dark:text-orange-400',
        badgeBg: 'bg-orange-500 text-white',
        badgeText: 'text-orange-700 dark:text-orange-300',
        btn: 'text-orange-700 dark:text-orange-300 bg-orange-500/15 hover:bg-orange-500/25 dark:bg-orange-500/20 dark:hover:bg-orange-500/30'
    }
};

@Component({
    selector: 'app-smart-alert-banner',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './smart-alert-banner.component.html'
})
export class SmartAlertBannerComponent {
    @Input() alerts: SmartAlertItem[] = [];
    @Input() loading: boolean = false;

    private dismissedSet = new Set<string | number>();

    get activeAlerts(): SmartAlertItem[] {
        if (this.loading || !this.alerts) return [];
        return this.alerts.filter((item, index) => {
            const key = item.id ?? index;
            return !this.dismissedSet.has(key) && (item.count > 0);
        });
    }

    dismiss(item: SmartAlertItem, index: number): void {
        const key = item.id ?? index;
        this.dismissedSet.add(key);
    }

    getColorConfig(color?: SmartAlertColor) {
        return COLOR_CLASSES[color || 'amber'] || COLOR_CLASSES.amber;
    }

    trackByKey(index: number, item: SmartAlertItem): string | number {
        return item.id ?? index;
    }
}
