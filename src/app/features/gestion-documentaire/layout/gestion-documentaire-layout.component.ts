import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { NgPrimeModule } from '@prime-ng';
import { MenuItem } from 'primeng/api';
import { NgxPermissionsModule } from 'ngx-permissions';
import { HeaderPage } from '../../../shared/header-page/header-page';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DocumentaireATraiterService, DocumentaireATraiter } from '../services/documentaire-a-traiter.service';


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

    constructor(
        private router: Router,
        private documentaireATraiterService: DocumentaireATraiterService
    ) {
        this.routerSubscription = this.router.events.subscribe((event) => {
            if (event instanceof NavigationEnd) {
                this.activeTab = event.urlAfterRedirects.split('?')[0];
            }
        });
    }

    ngOnInit(): void {
        this.activeTab = this.router.url.split('?')[0];
        
        // 1. Initialiser le menu par défaut
        this.initMenu();

        // 2. Écouter en temps réel les documents et demandes en attente
        this.documentaireATraiterService.aTraiter$
            .pipe(takeUntil(this.destroy$))
            .subscribe((etat) => {
                this.updateBadges(etat);
            });

        // 3. Déclencher le chargement des compteurs
        this.documentaireATraiterService.rafraichir().subscribe();
    }

    initMenu(): void {
        this.items = [
            { 
                label: "Vue d'ensemble", 
                icon: 'pi pi-chart-bar', 
                routerLink: '/gestion-documentaire/vue-ensemble' 
            },
            { 
                label: 'Documents', 
                icon: 'pi pi-file', 
                routerLink: '/gestion-documentaire/documents'
            },
            { 
                label: 'Documents partagés avec moi', 
                icon: 'pi pi-share-alt', 
                routerLink: '/gestion-documentaire/partages' 
            },
            { 
                label: 'Demandes', 
                icon: 'pi pi-inbox', 
                routerLink: '/gestion-documentaire/demandes'
            }
        ];
    }

    updateBadges(etat?: DocumentaireATraiter): void {
        const docsATraiter = etat?.documents?.length || 0;
        const demandesATraiter = etat?.demandes?.length || 0;

        const docTab = this.items.find(i => i.routerLink === '/gestion-documentaire/documents');
        if (docTab) {
            docTab.badge = docsATraiter > 0 ? docsATraiter.toString() : undefined;
        }

        const demandeTab = this.items.find(i => i.routerLink === '/gestion-documentaire/demandes');
        if (demandeTab) {
            demandeTab.badge = demandesATraiter > 0 ? demandesATraiter.toString() : undefined;
        }
    }

    creerDocument(): void {
        console.log('>>> [DEBUG] Clic sur Nouveau Document intercepté !');
        this.router.navigate(['/gestion-documentaire/create']).then(succes => {
            console.log('>>> [DEBUG] Navigation vers /create réussie ?', succes);
        }).catch(err => {
            console.error('>>> [DEBUG] Erreur de navigation :', err);
        });
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
