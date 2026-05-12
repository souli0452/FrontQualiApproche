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
import { DrawerModule } from 'primeng/drawer';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { PopoverModule } from 'primeng/popover';

import { GlobalSearchService } from '../../services/global-search.service';

@Component({
    selector: 'app-topbar',
    standalone: true,
    imports: [RouterModule, PopoverModule, DrawerModule, ButtonModule, CommonModule, MenuModule, AvatarModule, OverlayBadgeModule, IconFieldModule, InputIconModule, InputTextModule, FormsModule],
    template: ` 
    <div class="pre-layout-topbar">
        <div class="layout-topbar">
            <div class="layout-topbar-logo-container">
                <button class="layout-menu-button p-button-secondary  layout-topbar-action" (click)="layoutService.onMenuToggle()">
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

                <!-- Bouton Centre d'Aide -->
                <button type="button" (click)="helpVisible = true" class="px-3 py-2 p-button-secondary rounded-full mr-2 transition-colors hover:bg-surface-100 dark:hover:bg-surface-800">
                    <i class="pi pi-question-circle" style="font-size: 1.2rem"></i>
                </button>

                <!-- Bouton de Notifications -->
                <button type="button" (click)="notificationVisible.toggle($event)" class="relative px-3 py-2 p-button-secondary rounded-full mr-2 transition-colors hover:bg-surface-100 dark:hover:bg-surface-800">
                    <i class="pi pi-bell" style="font-size: 1.2rem"></i>
                    
                    <!-- Le badge rouge qui s'affiche uniquement si notificationCount > 0 -->
                    <span *ngIf="notificationCount > 0" 
                          class="absolute top-0 right-0 bg-red-500 text-white rounded-full text-[10px] w-4 h-4 flex items-center justify-center border border-white dark:border-surface-900">
                        {{ notificationCount }}
                    </span>
                </button>

                <!-- Bouton pour changer de thème (Dark/Light) -->
                <button type="button" size="small" class="px-3 py-1 rounded-full" (click)="toggleDarkMode()">
                    <i class="pi transition-transform duration-200" style="font-size: 1.2rem"
                    [ngClass]="{ 'pi-moon': !layoutService.isDarkTheme(), 'pi-sun': layoutService.isDarkTheme() }"></i>
                </button>


                <p-menu #menu [popup]="true" [model]="items" (onHide)="menuOpen = false" (onShow)="menuOpen = true" styleClass="user-menu" appendTo="body">
                    <ng-template pTemplate="item" let-item>
                        <ng-container [ngSwitch]="item.id">
                            <!-- Bloc Profil Riche -->
                            <div *ngSwitchCase="'profile-header'" class="flex items-center gap-3 p-1 border-b border-surface-100 dark:border-surface-800">
                                <p-overlayBadge severity="success" styleClass="status-badge-small">
                                    <p-avatar *ngIf="user" 
                                            [style]="{ 'background-color': 'var(--secondary-color)', 'color': '#ffffff', 'width': '30px', 'height': '30px', 'font-weight': 'bold' }"
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
                                [style]="{ 'background-color': 'var(--secondary-color)', 'color': '#ffffff', 'width': '30px', 'height': '30px', 'font-weight': 'bold' }"
                                shape="circle">{{ user.firstName.charAt(0).toLocaleUpperCase() }}
                        </p-avatar>
                    </p-overlayBadge>
                    <i class="icon-fleche pi transition-transform duration-200" 
                    [ngClass]="{ 'pi-chevron-down': !menuOpen, 'pi-chevron-up': menuOpen }"></i>
                </button>
            </div>
        </div>
    <p-popover #notificationVisible>
        <ng-template pTemplate="header">
                <div class="inline-flex align-items-center justify-content-center gap-2">
                    <span class="layout-topbar-title">
                        <span>Notifications</span>
                    </span>                      
                </div>
            </ng-template>    
            <div class="flex flex-col gap-3 mt-4">
                
                <div *ngFor="let notif of notifications" 
                     class="flex items-start gap-3 p-3 rounded-xl hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors cursor-pointer border border-transparent"
                     [ngClass]="{'bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30': !notif.read}">
                    
                    <div class="w-10 h-10 rounded-full flex items-center justify-center shrink-0" [ngClass]="notif.colorClass">
                        <i [class]="notif.icon"></i>
                    </div>
                    
                    <!-- Contenu -->
                    <div class="flex flex-col flex-1">
                        <span class="font-medium text-sm text-surface-900 dark:text-surface-0">{{ notif.title }}</span>
                        <span class="text-xs text-surface-600 dark:text-surface-400 mt-1 leading-normal">{{ notif.detail }}</span>
                        <span class="text-[10px] text-surface-500 mt-2 font-medium">{{ notif.time }}</span>
                    </div>
                    
                    <!-- Point indicateur Non-lu -->
                    <div *ngIf="!notif.read" class="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0"></div>
                </div>
                
            </div>
    </p-popover>
        <!-- Drawer du Centre d'Aide -->
        <p-drawer [modal]="true" [(visible)]="helpVisible" position="right" [style]="{width: '500px'}">
            <ng-template pTemplate="header">
                <div class="inline-flex align-items-center justify-content-center gap-2">
                    <span class="layout-topbar-title">
                        <span>Centre d'aide</span>
                    </span>                      
                </div>
            </ng-template>    
            
            <div class="flex flex-col gap-3 mt-4">
                <div class="p-4 border-2 border-dashed border-surface-200 dark:border-surface-700 rounded-xl flex items-center justify-center text-surface-500">
                    Le contenu du centre d'aide (FAQ, guides, support) sera ajouté ici plus tard...
                </div>
            </div>
        </p-drawer>

    </div>
    `,
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

    helpVisible: boolean = false;
    notificationCount: number = 3;
    notificationVisible: boolean = false;

    // FAUSSES DONNÉES DE TEST POUR LES NOTIFICATIONS
    notifications = [
        {
            id: 1,
            title: "Nouveau formulaire d'audit",
            detail: "Un nouveau formulaire d'audit a été assigné à votre structure.",
            time: "2 min ago",
            icon: "pi pi-file-edit",
            colorClass: "bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400",
            read: false
        },
        {
            id: 2,
            title: "Validation requise",
            detail: "La direction a besoin de votre validation pour le rapport trimestriel.",
            time: "1h ago",
            icon: "pi pi-check-circle",
            colorClass: "bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400",
            read: false
        },
        {
            id: 3,
            title: "Mise à jour du système",
            detail: "La maintenance du système est prévue pour ce weekend.",
            time: "3 days ago",
            icon: "pi pi-cog",
            colorClass: "bg-gray-100 dark:bg-gray-900/20 text-gray-600 dark:text-gray-400",
            read: true
        }
    ];

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
            
            // On récupère le titre à ce niveau s'il existe
            const title = child.snapshot.title || child.snapshot.data['title'];
            
            if (title) {
                // Si on a trouvé un titre, on l'assigne et on s'arrête (c'est la page mère)
                this.pageTitle = title;
                return; 
            }
        }
        
        // Si aucun titre n'a été trouvé dans la boucle, on utilise le titre par défaut du service
        this.pageTitle = this.titleService.getTitle();
    }

    goToProfile() {
        this.router.navigate(['/profil']);
    }

    onSearchInput() {
        this.globalSearchService.updateSearchQuery(this.searchQuery);
    }

    onSearch() {
        if (this.searchQuery && this.searchQuery.trim()) {
            console.log('Searching for:', this.searchQuery);
            // Rediriger vers la page de recherche globale
            this.router.navigate(['/recherche'], { queryParams: { q: this.searchQuery } });
            this.searchQuery = ''; // Optionnel : vider la recherche
        }
    }
}
