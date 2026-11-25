import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SmartAlertColor, SmartAlertItem } from './smart-alert-banner.model';

const COLOR_CLASSES: Record<SmartAlertColor, {
    iconBg: string;
    iconText: string;
    badgeText: string;
}> = {
    amber: {
        iconBg: 'bg-amber-500/15 dark:bg-amber-500/25',
        iconText: 'text-amber-600 dark:text-amber-400',
        badgeText: 'text-amber-600 dark:text-amber-400'
    },
    sky: {
        iconBg: 'bg-[#0084ca]/15 dark:bg-[#0084ca]/25',
        iconText: 'text-[#0084ca] dark:text-sky-400',
        badgeText: 'text-[#0084ca] dark:text-sky-400'
    },
    blue: {
        iconBg: 'bg-[#0084ca]/15 dark:bg-[#0084ca]/25',
        iconText: 'text-[#0084ca] dark:text-sky-400',
        badgeText: 'text-[#0084ca] dark:text-sky-400'
    },
    emerald: {
        iconBg: 'bg-emerald-500/15 dark:bg-emerald-500/25',
        iconText: 'text-emerald-600 dark:text-emerald-400',
        badgeText: 'text-emerald-700 dark:text-emerald-400'
    },
    rose: {
        iconBg: 'bg-rose-500/15 dark:bg-rose-500/25',
        iconText: 'text-rose-600 dark:text-rose-400',
        badgeText: 'text-rose-700 dark:text-rose-400'
    },
    purple: {
        iconBg: 'bg-purple-500/15 dark:bg-purple-500/25',
        iconText: 'text-purple-600 dark:text-purple-400',
        badgeText: 'text-purple-700 dark:text-purple-400'
    },
    orange: {
        iconBg: 'bg-orange-500/15 dark:bg-orange-500/25',
        iconText: 'text-orange-600 dark:text-orange-400',
        badgeText: 'text-orange-600 dark:text-orange-400'
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
