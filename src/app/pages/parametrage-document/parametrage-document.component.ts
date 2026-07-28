import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { NgPrimeModule } from '../../../prime-ng.module';
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'app-parametrage-document',
  standalone: true,
  imports: [
    CommonModule,
    NgPrimeModule,
    RouterModule,
  ],
  templateUrl: './parametrage-document.component.html',
  styleUrl: './parametrage-document.component.scss'
})
export class ParametrageDocumentComponent implements OnInit, OnDestroy {
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
            { label: 'Types de documents', icon: 'pi pi-tags', routerLink: '/parametrage-document/types' },
            { label: 'Étapes', icon: 'pi pi-list-check', routerLink: '/parametrage-document/etapes' },
            { label: 'Workflows', icon: 'pi pi-sitemap', routerLink: '/parametrage-document/workflows' }
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
