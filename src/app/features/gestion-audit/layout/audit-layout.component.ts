import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { NgPrimeModule } from '@prime-ng';
import { MenuItem } from 'primeng/api';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { HeaderPage } from '@shared/header-page/header-page';
import { AuditGestionService } from '../services/audit.service';
import { NotificationsAuditResume } from '../models/audit.model';

@Component({
    selector: 'app-audit-layout',
    standalone: true,
    imports: [CommonModule, NgPrimeModule, RouterModule, HeaderPage],
    templateUrl: './audit-layout.component.html',
    styleUrl: './audit-layout.component.scss'
})
export class AuditLayoutComponent implements OnInit, OnDestroy {
    items: MenuItem[] = [];
    activeTab: string = '';

    private destroy$ = new Subject<void>();
    private routerSubscription: any;

    breadcrumbs = [
        { label: 'Tableau de bord', routerLink: '/' },
        { label: 'Gestion des audits', routerLink: '/gestion-audit' }
    ];

    constructor(private router: Router, private auditService: AuditGestionService) {
        this.routerSubscription = this.router.events.subscribe((event) => {
            if (event instanceof NavigationEnd) {
                this.activeTab = event.urlAfterRedirects.split('?')[0];
            }
        });
    }

    ngOnInit(): void {
        this.activeTab = this.router.url.split('?')[0];
        this.buildMenu();
        // Les compteurs des onglets, comme dans le module Non-conformités : relus après chaque geste.
        this.auditService.notificationsAudit$.pipe(takeUntil(this.destroy$)).subscribe(r => this.buildMenu(r));
        this.auditService.rafraichirNotifications();
    }

    buildMenu(r?: NotificationsAuditResume): void {
        this.items = [
            {
                label: "Vue d'ensemble",
                icon: 'pi pi-chart-bar',
                routerLink: '/gestion-audit/vue-ensemble'
            },
            {
                label: "Programme d'audit",
                icon: 'pi pi-calendar',
                routerLink: '/gestion-audit/programme'
            },
            {
                label: 'Constatations',
                icon: 'pi pi-file-check',
                routerLink: '/gestion-audit/constatations'
            },
            {
                label: 'Suivi du programme',
                icon: 'pi pi-chart-line',
                routerLink: '/gestion-audit/suivi'
            },
            {
                label: 'Checklists',
                icon: 'pi pi-list-check',
                routerLink: '/gestion-audit/checklists'
            },
            {
                label: 'Auditeurs',
                icon: 'pi pi-users',
                routerLink: '/gestion-audit/auditeurs'
            },
            {
                label: 'Référentiel RQAP-BF',
                icon: 'pi pi-sitemap',
                routerLink: '/gestion-audit/referentiel-rqapbf'
            }
        ];
        const compteurs: Record<string, number | undefined> = {
            '/gestion-audit/programme': r?.programme,
            '/gestion-audit/constatations': r?.constats,
            '/gestion-audit/suivi': r?.suivi,
            '/gestion-audit/checklists': r?.checklists
        };
        this.items = this.items.map(i => {
            const n = compteurs[i.routerLink as string];
            return { ...i, badge: n && n > 0 ? String(n) : undefined };
        });
    }

    onTabChange(url: any): void {
        if (url && typeof url === 'string') {
            this.router.navigate([url]);
        }
    }

    trackByRouterLink(_index: number, item: MenuItem): string {
        return (item.routerLink as string) || item.label || '';
    }

    ngOnDestroy(): void {
        if (this.routerSubscription) {
            this.routerSubscription.unsubscribe();
        }
        this.destroy$.next();
        this.destroy$.complete();
    }
}
