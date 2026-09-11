import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SmartAlertBannerComponent, SmartAlertItem } from '@shared';

@Component({
    standalone: true,
    selector: 'app-alerte-traitement',
    imports: [CommonModule, SmartAlertBannerComponent],
    template: `
        <app-smart-alert-banner [alerts]="alerts" [loading]="loading"></app-smart-alert-banner>
    `
})
export class AlerteTraitement {
    @Input() countNcATraiter: number = 0;
    @Input() countPlansATraiter: number = 0;
    @Input() loading: boolean = false;

    get alerts(): SmartAlertItem[] {
        const list: SmartAlertItem[] = [];
        if (this.countNcATraiter > 0) {
            list.push({
                count: this.countNcATraiter,
                badgeText: 'Action requise',
                message: `Non-conformité${this.countNcATraiter > 1 ? 's' : ''} en attente de traitement`,
                icon: 'pi pi-exclamation-circle',
                color: 'amber',
                routerLink: '/non-conformite/traitement',
                actionLabel: 'Traiter'
            });
        }
        if (this.countPlansATraiter > 0) {
            list.push({
                count: this.countPlansATraiter,
                badgeText: "Plan d'action",
                message: `Plan${this.countPlansATraiter > 1 ? 's' : ''} d'action à réaliser`,
                icon: 'pi pi-file-edit',
                color: 'sky',
                routerLink: '/non-conformite/plan-action',
                actionLabel: 'Consulter'
            });
        }
        return list;
    }
}