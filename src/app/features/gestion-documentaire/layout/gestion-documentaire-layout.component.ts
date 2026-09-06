import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { NgPrimeModule } from '@prime-ng';
import { MenuItem } from 'primeng/api';
import { NgxPermissionsModule } from 'ngx-permissions';
import { HeaderPage } from '@shared/header-page/header-page';
import { Subject } from 'rxjs';

/**
 * Layout principal du module Gestion Documentaire.
 *
 * Fournit l'en-tête standardisé (breadcrumbs, titre, bouton de dépôt sous licence)
 * ainsi que le hub de navigation par onglets :
 * - Vue d'ensemble (/gestion-documentaire/vue-ensemble)
 * - Répertoire documentaire (/gestion-documentaire/documents)
 * - Documents partagés (/gestion-documentaire/partages)
 * - Demandes (/gestion-documentaire/demandes)
 */
@Component({
    selector: 'app-gestion-documentaire-layout',
    standalone: true,
    imports: [
        CommonModule,
        NgPrimeModule,
        RouterModule,
        NgxPermissionsModule,
        HeaderPage
    ],
    templateUrl: './gestion-documentaire-layout.component.html',
    styleUrl: './gestion-documentaire-layout.component.scss'
})
export class GestionDocumentaireLayoutComponent implements OnInit, OnDestroy {
    items: MenuItem[] = [];
    activeTab: string = '';
    private routerSubscription: any;
    private destroy$ = new Subject<void>();

    breadcrumbs = [
        { label: 'Tableau de bord', routerLink: '/' },
        { label: 'Gestion Documentaire', routerLink: '/gestion-documentaire' }
    ];

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
            { label: 'Documents partagés avec moi', icon: 'pi pi-share-alt', routerLink: '/gestion-documentaire/partages' },
            { label: 'Demandes', icon: 'pi pi-inbox', routerLink: '/gestion-documentaire/demandes' }
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

    ngOnDestroy(): void {
        if (this.routerSubscription) {
            this.routerSubscription.unsubscribe();
        }
        this.destroy$.next();
        this.destroy$.complete();
    }
}
