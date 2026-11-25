import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { NgPrimeModule } from '@prime-ng';
import { MenuItem } from 'primeng/api';
import { HeaderPage } from '@shared/header-page/header-page';
import { filter, Subscription } from 'rxjs';

@Component({
    selector: 'app-configurations',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        NgPrimeModule,
        RouterModule,
        HeaderPage
    ],
    templateUrl: './configurations.component.html',
    styleUrl: './configurations.component.scss'
})
export class ConfigurationsComponent implements OnInit, OnDestroy {
    items: MenuItem[] = [];
    currentUrl: string = '';
    private routerSubscription?: Subscription;

    breadcrumbs = [
        { label: 'Tableau de bord', routerLink: '/' },
        { label: 'Configurations', routerLink: '/configurations' }
    ];

    constructor(private router: Router) {
        this.routerSubscription = this.router.events.pipe(
            filter(event => event instanceof NavigationEnd)
        ).subscribe((event: any) => {
            this.currentUrl = event.urlAfterRedirects.split('?')[0];
        });
    }

    ngOnInit(): void {
        this.currentUrl = this.router.url.split('?')[0];
        this.items = [
            { label: "Réglages de l'organisation", icon: 'pi pi-cog', routerLink: '/configurations/config-systeme' },
            { label: 'Circuits de validation', icon: 'pi pi-sitemap', routerLink: '/configurations/circuits' },
            { label: 'Catalogue des Étapes', icon: 'pi pi-list-check', routerLink: '/configurations/etapes-circuit' },
            { label: 'Modèles d’e-mail', icon: 'pi pi-envelope', routerLink: '/configurations/modeles-email' }
        ];
    }

    get activeTab(): string {
        const match = this.items.find(i => typeof i.routerLink === 'string' && this.currentUrl.startsWith(i.routerLink));
        return (match?.routerLink as string) ?? this.currentUrl;
    }

    onTabChange(url: any): void {
        if (url && typeof url === 'string') {
            this.router.navigate([url]);
        }
    }

    onTabClick(url: any): void {
        if (url && typeof url === 'string' && url === this.activeTab && this.currentUrl !== url) {
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
    }
}

// Alias de rétrocompatibilité
export { ConfigurationsComponent as ParametragesComponent };
