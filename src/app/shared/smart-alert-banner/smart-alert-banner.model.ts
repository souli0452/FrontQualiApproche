export type SmartAlertColor = 'amber' | 'sky' | 'blue' | 'emerald' | 'rose' | 'purple' | 'orange';

export interface SmartAlertItem {
    id?: string;
    count: number;
    badgeText?: string;
    message: string;
    icon?: string;
    color?: SmartAlertColor;
    routerLink?: string | any[];
    actionLabel?: string;
}
