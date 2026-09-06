import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { NgPrimeModule } from '@prime-ng';
import { MenuItem } from 'primeng/api';

import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { LayoutService } from '@core/layout';
import { RoleService, NonConformiteService } from '../services';
import { HeaderPage } from '@shared/header-page/header-page';

@Component({
  selector: 'app-non-conformite-layout',
  standalone: true,
  imports: [
    CommonModule,
    NgPrimeModule, 
    RouterModule,
    HeaderPage
  ],
  templateUrl: './non-conformite-layout.component.html',
  styleUrl: './non-conformite-layout.component.scss'
})
export class NonConformiteLayoutComponent implements OnInit, OnDestroy {
    items: MenuItem[] | undefined;
    activeTab: string = '';
    routerSubscription: any;
    destroy$: Subject<boolean> = new Subject<boolean>();

    constructor(
        private router: Router,
        public layoutService: LayoutService,
        private nonConformiteService: NonConformiteService,
        public roleService: RoleService
    ) {
        this.routerSubscription = this.router.events.subscribe((event) => {
            if (event instanceof NavigationEnd) {
                this.activeTab = event.urlAfterRedirects.split('?')[0];
            }
        });
    }

    breadcrumbs = [
        { label: 'Tableau de bord', routerLink: '/' },
        { label: 'Non-Conformités', routerLink: '/non-conformite' }
    ];

    ngOnInit() {
        this.activeTab = this.router.url.split('?')[0];
        this.nonConformiteService.notificationsNC$
            .pipe(takeUntil(this.destroy$))
            .subscribe(notifs => {
                this.buildMenu(notifs);
            });
    }

    buildMenu(notifs: any) {
        // On somme toutes les tâches actives en cours de traitement (tout sauf les brouillons)
        let totalBadge = (notifs?.reception || 0) 
            + (notifs?.affectation || 0) 
            + (notifs?.validationPilote || 0) 
            + (notifs?.validationRQ || 0) 
            + (notifs?.cloture || 0) 
            + (notifs?.imputees || 0)
            + (notifs?.nonTraiter || 0)
            + (notifs?.soumission || 0);

        // Déclaration des 3 onglets principaux accessibles à tous
        this.items = [
            { 
                label: "Vue d'ensemble", 
                icon: 'pi pi-chart-bar', 
                routerLink: '/non-conformite/vue-ensemble' 
            },
            {
                label: 'Traitement & Suivi',
                icon: 'pi pi-cog',
                routerLink: '/non-conformite/traitement-suivi',
                badge: totalBadge > 0 ? totalBadge.toString() : undefined
            },
            {
                label: 'Mes Non-Conformités publiées',
                icon: 'pi pi-calendar',
                routerLink: '/non-conformite/publiees'
            }
        ];
    }

    onTabChange(url: any) {
        if (url && typeof url === 'string') {
            this.router.navigate([url]);
        }
    }

    trackByRouterLink(_index: number, item: MenuItem): string {
        return (item.routerLink as string) || item.label || '';
    }

    ngOnDestroy() {
        if (this.routerSubscription) {
            this.routerSubscription.unsubscribe();
        }
        this.destroy$.next(true);
        this.destroy$.complete();
    }
}
