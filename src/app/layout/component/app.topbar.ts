import { Component, OnInit, ViewChild } from '@angular/core';
import { Router, RouterModule, NavigationEnd, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { LayoutService } from '../service/layout.service';
import { AuthService } from '../../services/auth-services/auth.service';
import { MenuItem, MessageService } from 'primeng/api';
import { Title } from '@angular/platform-browser';
import { filter, map, takeUntil } from 'rxjs/operators';
import { FormsModule, ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';

import { GlobalSearchService } from '../../services/global-search.service';
import { NgPrimeModule } from '../../../prime-ng.module';
import { Popover } from 'primeng/popover';
import { showToast, StatusEnum, hasAnyPermission, isLicenseActive } from '../../utils';
import { Subject } from 'rxjs';
import { ProcNonConformiteService } from '../../pages/proc-non-conformite/proc-non-conformite.service';


@Component({
    selector: 'app-topbar',
    standalone: true,
    imports: [RouterModule, NgPrimeModule, CommonModule, FormsModule, ReactiveFormsModule],
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
                <button type="button" pTooltip="Centre d'aide" tooltipPosition="bottom" (click)="helpVisible = true" class="px-3 py-2 p-button-secondary rounded-full transition-colors hover:bg-surface-100 dark:hover:bg-surface-800">
                    <i class="pi pi-question-circle" style="font-size: 1.2rem"></i>
                </button>

                <!-- Bouton de Notifications -->
                <button type="button" pTooltip="Notifications" tooltipPosition="bottom" (click)="notificationPopover.toggle($event)" class="relative px-3 py-2 p-button-secondary rounded-full transition-colors hover:bg-surface-100 dark:hover:bg-surface-800">
                    <i class="pi pi-bell" style="font-size: 1.2rem"></i>
                    
                    <!-- Le badge rouge qui clignote uniquement si notificationCount > 0 -->
                    <span *ngIf="notificationCount > 0" class="absolute top-0 right-0 flex h-4 w-4 items-center justify-center">
                        <!-- L'effet radar (ping) derrière le badge -->
                        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <!-- Le badge rouge au premier plan -->
                        <span class="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-white text-[10px] items-center justify-center border border-white dark:border-surface-900 font-bold">
                            {{ notificationCount }}
                        </span>
                    </span>
                </button>

                <!-- Bouton pour changer de thème (Dark/Light) -->
                <button type="button" size="small" class="px-3 py-1 rounded-full" (click)="toggleDarkMode()">
                    <i class="pi transition-transform duration-200" style="font-size: 1.2rem"
                    [ngClass]="{ 'pi-moon': !layoutService.isDarkTheme(), 'pi-sun': layoutService.isDarkTheme() }"></i>
                </button>

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
        <p-popover #notificationPopover>
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
                            <span class="font-medium text-sm mb-2 text-surface-900 dark:text-surface-0">{{ notif.title }}</span>
                            <p class="text-xs line-height text-surface-600 dark:text-surface-400 mt-1 leading-normal">{{ notif.detail }}</p>
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
        ::ng-deep .custom-bottom-drawer {
            height: auto !important;
            max-width: 50rem !important;
            width: 100% !important;
            left: 0 !important;
            right: 0 !important;
            margin: 0 auto !important;
            border-radius: 10px 10px 0 0 !important;
            border: none !important;
            overflow: hidden !important;
        }

        .line-height {
            margin: 0 !important;
            line-height: 0px !important;
        }

        @media screen and (max-width: 600px) {
            ::ng-deep .custom-bottom-drawer {
                max-width: 100% !important;
                border-radius: 0 !important;
            }
        }
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

    isLicenseActive = isLicenseActive;
    hasAnyPermission = hasAnyPermission;
    destroy$: Subject<boolean> = new Subject<boolean>();


    @ViewChild('notificationPopover') notificationPopover!: Popover; 

    helpVisible: boolean = false;
    notificationCount: number = 3;
    notificationVisible: boolean = false;

    // Liste dynamique des notifications
    notifications: any[] = [];

    constructor(
        public layoutService: LayoutService,
        private authService: AuthService,
        private router: Router,
        private titleService: Title,
        private activatedRoute: ActivatedRoute,
        private globalSearchService: GlobalSearchService,
        protected fb: UntypedFormBuilder,
        protected messageService: MessageService,
        private procService: ProcNonConformiteService
    ) {
    }


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

        // Souscription aux notifications globales de NC
        this.procService.notificationsNC$.pipe(takeUntil(this.destroy$)).subscribe((notifs: any) => {
            this.notificationCount = notifs.total || 0;
            this.notifications = [];

            if (notifs.brouillons > 0) {
                this.notifications.push({
                    title: "Brouillons en cours",
                    detail: `Vous avez ${notifs.brouillons} Non-Conformité(s) en attente de finalisation.`,
                    time: "À l'instant",
                    icon: "pi pi-pencil",
                    colorClass: "bg-orange-100 text-orange-600",
                    read: false
                });
            }
            if (notifs.reception > 0) {
                this.notifications.push({
                    title: "Non-conformités de votre service",
                    detail: `Votre service a ${notifs.reception} Non-Conformité(s) publiée(s) en attente de validation.`,
                    time: "À l'instant",
                    icon: "pi pi-users",
                    colorClass: "bg-orange-100 text-orange-600",
                    read: false
                });
            }
            if (notifs.imputees > 0) {
                this.notifications.push({
                    title: "Actions à traiter",
                    detail: `Vous avez ${notifs.imputees} Non-Conformité(s) imputée(s) pour traitement.`,
                    time: "Urgent",
                    icon: "pi pi-exclamation-circle",
                    colorClass: "bg-red-100 text-red-600",
                    read: false
                });
            }
            if (notifs.validationRQ > 0) {
                this.notifications.push({
                    title: "Validation RQ",
                    detail: `Vous avez ${notifs.validationRQ} Non-Conformité(s) que vous devez valider.`,
                    time: "Urgent",
                    icon: "pi pi-shield",
                    colorClass: "bg-red-100 text-red-600",
                    read: false
                });
            }
            if (notifs.enAttenteValidation > 0) {
                this.notifications.push({
                    title: "Validation Globale",
                    detail: `Il y a ${notifs.enAttenteValidation} Non-Conformité(s) en attente de validation.`,
                    time: "Urgent",
                    icon: "pi pi-shield",
                    colorClass: "bg-red-100 text-red-600",
                    read: false
                });
            }
            if (notifs.validationPilote > 0) {
                this.notifications.push({
                    title: "Validation des plans d'actions",
                    detail: `Il y a ${notifs.validationPilote} plan(s) d'actions en attente de validation.`,
                    time: "Urgent",
                    icon: "pi pi-shield",
                    colorClass: "bg-red-100 text-red-600",
                    read: false
                });
            }
            if (notifs.cloture > 0) {
                this.notifications.push({
                    title: "Clôture des Non-Conformités",
                    detail: `Il y a ${notifs.cloture} Non-Conformité(s) en attente de clôture.`,
                    time: "À traiter",
                    icon: "pi pi-check-circle",
                    colorClass: "bg-green-100 text-green-600",
                    read: false
                });
            }
            if (notifs.affectation > 0) {
                this.notifications.push({
                    title: "Affectation",
                    detail: `Vous avez ${notifs.affectation} Non-Conformité(s) en attente d'affectation.`,
                    time: "Urgent",
                    icon: "pi pi-shield",
                    colorClass: "bg-red-100 text-red-600",
                    read: false
                });
            }
            if (notifs.nonTraiter > 0) {
                this.notifications.push({
                    title: "Traitement",
                    detail: `Vous avez ${notifs.nonTraiter} Plan(s) d'actions en attente de traitement.`,
                    time: "Urgent",
                    icon: "pi pi-shield",
                    colorClass: "bg-red-100 text-red-600",
                    read: false
                });
            }
        });
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
