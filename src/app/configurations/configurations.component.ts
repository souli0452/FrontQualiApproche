import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { NgPrimeModule } from '@prime-ng';
import { MenuItem } from 'primeng/api';
import { ButtonGroupModule } from 'primeng/buttongroup';
import { HeaderPage } from '@shared/header-page/header-page';
import { filter, Subscription } from 'rxjs';

@Component({
  selector: 'app-configurations',
  standalone: true,
  imports: [
    CommonModule,
    NgPrimeModule, 
    ButtonGroupModule, 
    RouterModule,
    HeaderPage
  ],
  templateUrl: './configurations.component.html',
  styleUrl: './configurations.component.scss'
})
export class ConfigurationsComponent implements OnInit, OnDestroy {
    items: MenuItem[] | undefined;
    activeTab: string = '';
    private routerSubscription?: Subscription;

    constructor(private router: Router) {
        this.routerSubscription = this.router.events.pipe(
            filter(event => event instanceof NavigationEnd)
        ).subscribe((event: any) => {
            this.activeTab = event.urlAfterRedirects.split('?')[0];
        });
    }

    breadcrumbs = [
        { label: 'Tableau de bord', routerLink: '/' },
        { label: 'Configurations', routerLink: '/configurations' }
    ];

    ngOnInit() {
        this.activeTab = this.router.url.split('?')[0];
        this.items = [
            { label: 'Réglages de l\'organisation', icon: 'pi pi-cog', routerLink: '/configurations/config-systeme' },
            { label: 'Circuits de validation', icon: 'pi pi-sitemap', routerLink: '/configurations/circuits' },
            { label: 'Catalogue des Étapes', icon: 'pi pi-list-check', routerLink: '/configurations/etapes-circuit' },
            { label: 'Modèles d’e-mail', icon: 'pi pi-envelope', routerLink: '/configurations/modeles-email' },
        ];
    }

    onTabChange(url: any) {
        if (url && typeof url === 'string') {
            this.router.navigate([url]);
        }
    }

    ngOnDestroy() {
        if (this.routerSubscription) {
            this.routerSubscription.unsubscribe();
        }
    }
}

// Alias de rétrocompatibilité
export { ConfigurationsComponent as ParametragesComponent };
