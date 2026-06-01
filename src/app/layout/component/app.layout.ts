import { Component, Renderer2, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { AppTopbar } from './app.topbar';
import { AppSidebar } from './app.sidebar';
import { AppFooter } from './app.footer';
import { LayoutService } from '../service/layout.service';
import { AuthService } from '../../services/auth-services/auth.service';

@Component({
    selector: 'app-layout',
    standalone: true,
    imports: [CommonModule, AppTopbar, AppSidebar, RouterModule, AppFooter],
    template: `<div class="layout-wrapper" [ngClass]="containerClass">

        <app-sidebar></app-sidebar>
        <div class="layout-main-container">
                <app-topbar></app-topbar>

                <!-- Bandeau de licence -->
                <div *ngIf="daysRemaining !== undefined && daysRemaining <= 10"
                     [ngClass]="{'license-warning': daysRemaining > 0, 'license-expired': daysRemaining <= 0}"
                     class="license-banner">
                    <i class="pi pi-exclamation-triangle mr-2"></i>
                    <span *ngIf="daysRemaining > 0">Votre licence expire dans <b>{{ daysRemaining }} jours</b>. Pensez à la renouveler pour conserver l'accès à vos services.</span>
                    <span *ngIf="daysRemaining <= 0">Votre licence est <b>expirée</b>. Vous êtes en période de grâce. Il vous reste <b>{{ 7 + daysRemaining }} jours</b> avant le blocage.</span>
                </div>

            <div class="layout-main">
                <router-outlet></router-outlet>
            </div>
            <!--
            <app-footer></app-footer> -->
        </div>
        <div class="layout-mask animate-fadein"></div>
    </div> `
})
export class AppLayout {
    overlayMenuOpenSubscription: Subscription;
    menuOutsideClickListener: any;

    daysRemaining: number | undefined;
    
    isSuperAdmin(): boolean {
        const user = JSON.parse(localStorage.getItem('user')!);
        return user?.appRoles?.includes('SUPER_ADMIN') || 
               (user?.roles && user.roles.includes('SUPER_ADMIN')) ||
               (user?.user?.roles && user.user.roles.includes('SUPER_ADMIN'));
    }

    @ViewChild(AppSidebar) appSidebar!: AppSidebar;
    @ViewChild(AppTopbar) appTopBar!: AppTopbar;

    constructor(
        public layoutService: LayoutService,
        public renderer: Renderer2,
        public router: Router,
        private authService: AuthService
    ) {
        this.daysRemaining = this.authService.getLicenseDaysRemaining();
        this.overlayMenuOpenSubscription = this.layoutService.overlayOpen$.subscribe(() => {
            if (!this.menuOutsideClickListener) {
                this.menuOutsideClickListener = this.renderer.listen('document', 'click', (event) => {
                    if (this.isOutsideClicked(event)) {
                        this.hideMenu();
                    }
                });
            }

            if (this.layoutService.layoutState().staticMenuMobileActive) {
                this.blockBodyScroll();
            }
        });

        this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
            this.hideMenu();
        });
    }

    isOutsideClicked(event: MouseEvent) {
        const sidebarEl = document.querySelector('.layout-sidebar');
        const topbarEl = document.querySelector('.layout-menu-button');
        const eventTarget = event.target as Node;

        return !(sidebarEl?.isSameNode(eventTarget) || sidebarEl?.contains(eventTarget) || topbarEl?.isSameNode(eventTarget) || topbarEl?.contains(eventTarget));
    }

    hideMenu() {
        this.layoutService.layoutState.update((prev) => ({ ...prev, overlayMenuActive: false, staticMenuMobileActive: false, menuHoverActive: false }));
        if (this.menuOutsideClickListener) {
            this.menuOutsideClickListener();
            this.menuOutsideClickListener = null;
        }
        this.unblockBodyScroll();
    }

    blockBodyScroll(): void {
        if (document.body.classList) {
            document.body.classList.add('blocked-scroll');
        } else {
            document.body.className += ' blocked-scroll';
        }
    }

    unblockBodyScroll(): void {
        if (document.body.classList) {
            document.body.classList.remove('blocked-scroll');
        } else {
            document.body.className = document.body.className.replace(new RegExp('(^|\\b)' + 'blocked-scroll'.split(' ').join('|') + '(\\b|$)', 'gi'), ' ');
        }
    }

    get containerClass() {
        return {
            'layout-overlay': this.layoutService.layoutConfig().menuMode === 'overlay',
            'layout-static': this.layoutService.layoutConfig().menuMode === 'static',
            'layout-static-inactive': this.layoutService.layoutState().staticMenuDesktopInactive && this.layoutService.layoutConfig().menuMode === 'static',
            'layout-overlay-active': this.layoutService.layoutState().overlayMenuActive,
            'layout-mobile-active': this.layoutService.layoutState().staticMenuMobileActive
        };
    }

    ngOnDestroy() {
        if (this.overlayMenuOpenSubscription) {
            this.overlayMenuOpenSubscription.unsubscribe();
        }

        if (this.menuOutsideClickListener) {
            this.menuOutsideClickListener();
        }
    }
}
