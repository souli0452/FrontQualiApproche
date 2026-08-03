import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { NgPrimeModule } from '../../../prime-ng.module';

@Component({
  selector: 'app-configuration-workflow-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    NgPrimeModule
  ],
  templateUrl: './configuration-workflow.html',
  styleUrl: './configuration-workflow.scss'
})
export class ConfigurationWorkflowLayoutComponent implements OnInit, OnDestroy {
    items: MenuItem[] = [];
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
        // Une seule entrée pour les circuits : ils se configuraient auparavant dans deux écrans
        // distincts selon le type de ressource, alors qu'ils partagent le même modèle.
        this.items = [
            { label: 'Circuits de validation', icon: 'pi pi-sitemap', routerLink: '/configuration-workflow/circuits' },
            { label: 'Catalogue des Étapes', icon: 'pi pi-list-check', routerLink: '/configuration-workflow/etapes' },
            { label: 'Modèles d’e-mail', icon: 'pi pi-envelope', routerLink: '/configuration-workflow/email-template' },
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
