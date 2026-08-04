import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { NgPrimeModule } from '../../../prime-ng.module';

/**
 * Cadre du paramétrage documentaire : en-tête, onglets, contenu.
 *
 * <p>La barre d'onglets avait été retirée quand l'écran n'en portait plus qu'un — un onglet seul ne
 * propose aucun choix. Elle reprend son sens maintenant que trois référentiels s'y règlent : les
 * types de document, les priorités et les niveaux de confidentialité.</p>
 */
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
    items: MenuItem[] = [];
    activeTab = '';
    private routerSubscription: any;

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
            { label: 'Priorités', icon: 'pi pi-flag', routerLink: '/parametrage-document/priorites' },
            { label: 'Confidentialité', icon: 'pi pi-lock', routerLink: '/parametrage-document/confidentialite' }
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
