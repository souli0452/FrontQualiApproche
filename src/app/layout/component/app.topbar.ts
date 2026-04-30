import { Component, OnInit } from '@angular/core';
import { Router, RouterModule, NavigationEnd, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { LayoutService } from '../service/layout.service';
import { MenuModule } from 'primeng/menu';
import { AuthService } from '../../services/auth-services/auth.service';
import { AvatarModule } from 'primeng/avatar';
import { MenuItem } from 'primeng/api';
import { OverlayBadgeModule } from 'primeng/overlaybadge';
import { Title } from '@angular/platform-browser';
import { filter, map } from 'rxjs/operators';

import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';

import { GlobalSearchService } from '../../services/global-search.service';

@Component({
    selector: 'app-topbar',
    standalone: true,
    imports: [RouterModule, CommonModule, MenuModule, AvatarModule, OverlayBadgeModule, IconFieldModule, InputIconModule, InputTextModule, FormsModule],
    template: ` <div class="layout-topbar">
        <div class="layout-topbar-logo-container">
            <button class="layout-menu-button layout-topbar-action" (click)="layoutService.onMenuToggle()">
                <i class="pi pi-bars"></i>
            </button>
            <div class="layout-topbar-title text-surface-900 dark:text-surface-0">
                {{ pageTitle }}
            </div>
        </div>

        <div class="layout-topbar-search md:flex items-center flex-1 justify-center max-w-[500px]">
            <p-iconField iconPosition="left" class="w-full mx-4">
                <p-inputIcon styleClass="pi pi-search"></p-inputIcon>
                <input type="text" 
                       pInputText 
                       placeholder="Que recherchez-vous ?" 
                       [(ngModel)]="searchQuery" 
                       (input)="onSearchInput()"
                       (keyup.enter)="onSearch()"
                       class="w-full py-2 border-surface-border dark:border-surface-700 bg-surface-100 dark:bg-surface-800 focus:ring-1 focus:ring-primary-500 rounded-xl" />
            </p-iconField>
        </div>

        <div class="layout-topbar-actions">
            <!-- Bouton pour changer de thème (Dark/Light) -->
            <button type="button" class="layout-topbar-action flex items-center justify-center p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors mr-2" (click)="toggleDarkMode()">
                <i class="pi transition-transform duration-200" style="font-size: 1.2rem"
                   [ngClass]="{ 'pi-moon': !layoutService.isDarkTheme(), 'pi-sun': layoutService.isDarkTheme() }"></i>
            </button>


            <p-menu #menu [popup]="true" [model]="items" (onHide)="menuOpen = false" (onShow)="menuOpen = true" styleClass="user-menu">
                <ng-template pTemplate="item" let-item>
                    <ng-container [ngSwitch]="item.id">
                        <!-- Bloc Profil Riche -->
                        <div *ngSwitchCase="'profile-header'" class="flex items-center gap-3 p-1 border-b border-surface-100 dark:border-surface-800">
                            <p-overlayBadge severity="success" styleClass="status-badge-small">
                                <p-avatar *ngIf="user" 
                                          [style]="{ 'background-color': 'var(--p-primary-color)', 'color': '#ffffff', 'width': '30px', 'height': '30px', 'font-weight': 'bold' }"
                                          shape="circle">{{ user?.firstName.charAt(0).toLocaleUpperCase() }}
                                </p-avatar>
                            </p-overlayBadge>
                            <div class="flex flex-col flex-1">
                                <span class="font-medium text-sm text-surface-900 dark:text-surface-0 leading-tight">{{ user?.firstName }} {{ user?.lastName }}</span>
                                <span class="text-xs text-slate-500 font-normal">En ligne</span>
                            </div>
                            <button type="button" class="p-button p-button-link p-0 text-sm font-normal text-slate-500 bg-profil rounded-md" (click)="goToProfile()">Profil</button>
                        </div>

                        <!-- Item de déconnexion standard -->
                        <a *ngSwitchCase="'logout'" (click)="item.command()" class="flex text-[14px] mt-2 items-center p-2 gap-2 text-surface-900 dark:text-surface-0 hover:bg-surface-100 dark:hover:bg-surface-900 transition-colors cursor-pointer rounded-md mx-2 mb-2">
                            <i [class]="item.icon"></i>
                            <span class="font-normal">{{ item.label }}</span>
                        </a>
                    </ng-container>
                </ng-template>
            </p-menu>

            <button type="button" class="layout-topbar-action flex items-center gap-2 p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors" (click)="menu.toggle($event)">
                <p-overlayBadge severity="success" styleClass="status-badge">
                    <p-avatar *ngIf="user" 
                              [style]="{ 'background-color': 'var(--p-primary-color)', 'color': '#ffffff', 'width': '30px', 'height': '30px', 'font-weight': 'bold' }"
                              shape="circle">{{ user.firstName.charAt(0).toLocaleUpperCase() }}
                    </p-avatar>
                </p-overlayBadge>
                <i class="icon-fleche pi transition-transform duration-200" 
                   [ngClass]="{ 'pi-chevron-down': !menuOpen, 'pi-chevron-up': menuOpen }"></i>
            </button>
        </div>
    </div>`,
    styles: [`
        :host ::ng-deep .status-badge .p-badge {
            width: 12px;
            height: 12px;
            min-width: 12px;
            top: auto;
            bottom: -2px;
            right: -2px;
            border: 2px solid white;
        }

        :host ::ng-deep .status-badge-small .p-badge {
            width: 10px;
            height: 10px;
            min-width: 10px;
            top: auto;
            bottom: 0px;
            right: 0px;
            border: 2px solid white;
        }

        :host ::ng-deep .user-menu.p-menu {
            min-width: 250px;
            padding: 5px;
            border: 1px solid rgba(0,0,0,0.2);
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
    `]
})
export class AppTopbar implements OnInit {
    items!: MenuItem[];
    user: any;
    menuOpen: boolean = false;
    pageTitle: string = '';
    searchQuery: string = '';

    constructor(
        public layoutService: LayoutService,
        private authService: AuthService,
        private router: Router,
        private titleService: Title,
        private activatedRoute: ActivatedRoute,
        private globalSearchService: GlobalSearchService
    ) {}

    ngOnInit() {
        this.user = this.authService.getUser();
        this.updateTitle();

        // Écouter les changements de route pour mettre à jour le titre
        this.router.events.pipe(
            filter(event => event instanceof NavigationEnd)
        ).subscribe(() => {
            this.updateTitle();
        });

        this.items = [
            { id: 'profile-header' },
            { id: 'logout', label: 'Se déconnecter', icon: 'pi pi-sign-out', command: () => this.authService.logout() }
        ];
    }

    toggleDarkMode() {
        const config = this.layoutService.layoutConfig();
        // Alterne la propriété darkTheme (true/false) dans le signal de configuration
        this.layoutService.layoutConfig.set({ ...config, darkTheme: !config.darkTheme });
    }


    private updateTitle() {
        let child = this.activatedRoute.root;
        while (child.firstChild) {
            child = child.firstChild;
        }
        this.pageTitle = child.snapshot.title || child.snapshot.data['title'] || this.titleService.getTitle();
    }

    goToProfile() {
        this.router.navigate(['/page/profil']);
    }

    onSearchInput() {
        this.globalSearchService.updateSearchQuery(this.searchQuery);
    }

    onSearch() {
        if (this.searchQuery && this.searchQuery.trim()) {
            console.log('Searching for:', this.searchQuery);
            // Rediriger vers la page de recherche globale
            this.router.navigate(['/page/recherche'], { queryParams: { q: this.searchQuery } });
            this.searchQuery = ''; // Optionnel : vider la recherche
        }
    }
}
