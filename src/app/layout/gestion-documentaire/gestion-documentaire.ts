import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { NgPrimeModule } from '../../../prime-ng.module';
import { MenuItem } from 'primeng/api';
import { NgxPermissionsModule } from 'ngx-permissions';

@Component({
    selector: 'app-gestion-documentaire-layout',
    standalone: true,
    imports: [
        CommonModule,
        NgPrimeModule,
        RouterModule,
        NgxPermissionsModule
    ],
    templateUrl: './gestion-documentaire.html',
    styleUrl: './gestion-documentaire.scss'
})
export class GestionDocumentaireLayoutComponent implements OnInit, OnDestroy {
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

    ngOnInit(): void {
        this.activeTab = this.router.url.split('?')[0];
        this.items = [
            { label: "Vue d'ensemble", icon: 'pi pi-chart-bar', routerLink: '/gestion-documentaire/vue-ensemble' },
            { label: 'Documents', icon: 'pi pi-file', routerLink: '/gestion-documentaire/documents' },
            { label: 'Documents partagés avec moi', icon: 'pi pi-share-alt', routerLink: '/gestion-documentaire/partages' }
        ];
    }

    onTabChange(url: any) {
        if (url && typeof url === 'string') {
            this.router.navigate([url]);
        }
    }

    navigateToCreate(): void {
        this.router.navigate(['/gestion-documentaire/nouveau']);
    }

    ngOnDestroy(): void {
        if (this.routerSubscription) {
            this.routerSubscription.unsubscribe();
        }
    }
}
