import { Component, Renderer2, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { AppTopbar } from './app.topbar';
import { AppSidebar } from './app.sidebar';
import { AppFooter } from './app.footer';
import { AppReglagesRequis } from './app.reglages-requis';
import { LayoutService } from '../service/layout.service';
import { AuthService } from '../../services/auth-services/auth.service';
import { LicenceDialogComponent } from '../../shared/licence/licence-dialog.component';

@Component({
    selector: 'app-layout',
    standalone: true,
    imports: [CommonModule, AppTopbar, AppSidebar, RouterModule, AppFooter, AppReglagesRequis,
        LicenceDialogComponent],
    template: `<div class="layout-wrapper" [ngClass]="containerClass">

        <app-sidebar></app-sidebar>
        <div class="layout-main-container">
                <app-topbar></app-topbar>

            <div class="layout-main">
                <!-- Licence de l'installation : bandeau à l'approche du terme, fenêtre qui
                     s'impose tant qu'aucune licence valide n'est posée. Elle remplace le bandeau
                     précédent, qui lisait un nombre de jours figé à la construction de l'écran —
                     et annonçait « licence expirée » tant que la session n'était pas chargée. -->
                <app-licence-dialog></app-licence-dialog>
                <router-outlet></router-outlet>
            </div>
            <app-footer></app-footer>
        </div>
        <div class="layout-mask animate-fadein"></div>

        <!-- Réglages sans lesquels la plateforme fonctionne mal en silence : exigés de
             l'administrateur au lancement, et de lui seul — nul autre ne peut y répondre. -->
        <app-reglages-requis></app-reglages-requis>
    </div> `
})
export class AppLayout {
    overlayMenuOpenSubscription: Subscription;
    menuOutsideClickListener: any;

    daysRemaining: number | undefined;
    
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
