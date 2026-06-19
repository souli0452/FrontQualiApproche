import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { NgPrimeModule } from '../../../prime-ng.module';
import { MenuItem } from 'primeng/api';
import { ButtonGroupModule } from 'primeng/buttongroup';

@Component({
  selector: 'app-parametrages',
  standalone: true,
  imports: [
    CommonModule,
    NgPrimeModule, 
    ButtonGroupModule, 
    RouterModule,
  ],
  templateUrl: './parametrages.component.html',
  styleUrl: './parametrages.component.scss'
})
export class ParametragesComponent implements OnInit, OnDestroy {
    items: MenuItem[] | undefined;
    activeTab: string = '';
    routerSubscription: any;

    constructor(private router: Router) {
        this.routerSubscription = this.router.events.subscribe((event) => {
            if (event instanceof NavigationEnd) {
                this.activeTab = event.urlAfterRedirects.split('?')[0];
            }
        });
    }

    ngOnInit() {
        this.activeTab = this.router.url.split('?')[0];
        this.items = [
            { label: 'Configuration globale', icon: 'pi pi-cog', routerLink: '/configurations/config-systeme' },
            { label: 'Utilisateurs', icon: 'pi pi-users', routerLink: '/configurations/utilisateurs' },
            { label: 'Rôles & Permissions', icon: 'pi pi-lock', routerLink: '/configurations/roles' },
            { label: 'Catégorie de Processus', icon: 'pi pi-cog', routerLink: '/configurations/type-processus' },
            { label: 'Origine de Non-Conformité', icon: 'pi pi-list', routerLink: '/configurations/type-nc' },
            { label: 'Niveau de Non-Conformité', icon: 'pi pi-sort-amount-up', routerLink: '/configurations/niveau-nc' },
            // { label: 'Type d\'Action Corrective', icon: 'pi pi-bolt', routerLink: '/configurations/type-action' },
            { label: 'Processus', icon: 'pi pi-map-marker', routerLink: '/configurations/service' }
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
