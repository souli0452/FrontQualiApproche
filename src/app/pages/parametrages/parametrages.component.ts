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
            { label: 'Réglages de l\'organisation', icon: 'pi pi-cog', routerLink: '/configurations/config-systeme' },
            // Configuration des circuits de validation, rapatriée ici depuis sa propre section.
            // Les trois écrans voyagent ensemble : les circuits seuls auraient laissé le catalogue
            // d'étapes et les modèles d'e-mail sans aucun chemin depuis le menu.
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
