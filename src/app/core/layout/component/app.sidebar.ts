import { Component, ElementRef, ViewChild } from '@angular/core';
import { AppMenu } from './app.menu';
import { LayoutService } from '../service/layout.service';
import { CommonModule, NgClass } from '@angular/common';
import { ScrollPanelModule } from 'primeng/scrollpanel';
import { Router } from '@angular/router';
import { AuthService, accesAutorise } from '../../auth';
import { TooltipModule } from 'primeng/tooltip';

@Component({
    selector: 'app-sidebar',
    standalone: true,
    imports: [AppMenu, NgClass, CommonModule, ScrollPanelModule, TooltipModule],
    template: ` 
    <div class="layout-sidebar flex flex-col justify-between" [class.collapsed-sidebar]="!isMenuActive()">
        <!-- Bouton toggle -->
        <button class="sidebar-toggle-btn shadow-md" (click)="layoutService.onMenuToggle()">
            <i class="pi text-xl font-bold" [ngClass]="isMenuActive() ? 'pi-angle-left' : 'pi-bars'"></i>
        </button>

        <!-- Utilisation de p-scrollPanel pour permettre le scroll du menu uniquement -->
        <div class="flex-1 min-h-0 overflow-y-auto pr-1">
            <app-menu></app-menu>
        </div>

        <!-- Bloc Footer ancré tout en bas -->
        <div class="relative mt-4 shrink-0 overflow-hidden rounded-xl">
            <video 
                #bgVideo
                poster="assets/images/design-detail/Footer-image.png"
                autoplay 
                loop 
                [muted]="true"
                muted
                playsinline 
                preload="auto"
                class="w-full h-[135px] object-cover rounded-xl block pointer-events-none opacity-20">
                <source src="assets/videos/footer-dashboard.mp4" type="video/mp4">
            </video>
            <div class="custom-footer">
                <div class="deconnexion-profil flex items-center justify-center gap-3 mb-4">
                    <button (click)="goToProfile()" class="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all duration-200 border border-white/20 hover:scale-105 cursor-pointer" pTooltip="Mon Profil" tooltipPosition="top">
                        <i class="pi pi-user text-lg"></i>
                    </button>
                    <button *ngIf="canViewLicence()" (click)="goToLicence()" class="flex items-center justify-center w-10 h-10 rounded-full bg-sky-500/20 hover:bg-sky-500/40 text-white transition-all duration-200 border border-sky-500/30 hover:scale-105 cursor-pointer" pTooltip="Licence" tooltipPosition="top">
                        <i class="pi pi-shield text-lg"></i>
                    </button>
                    <button (click)="logout()" class="flex items-center justify-center w-10 h-10 rounded-full bg-red-500/20 hover:bg-red-500/40 text-white transition-all duration-200 border border-red-500/30 hover:scale-105 cursor-pointer" pTooltip="Déconnexion" tooltipPosition="top">
                        <i class="pi pi-power-off text-lg"></i>
                    </button>
                </div>
                <p class="text-white/80 text-[13px] text-center m-0">QualiSira © 2026. Tous droits réservés.</p>
            </div>
        </div>
    </div>`
})
export class AppSidebar {
    constructor(
        public el: ElementRef, 
        public layoutService: LayoutService,
        private router: Router,
        private authService: AuthService
    ) {}

    @ViewChild('bgVideo') bgVideo?: ElementRef<HTMLVideoElement>;

    goToProfile() {
        this.router.navigate(['/profil']);
    }

    goToLicence() {
        this.router.navigate(['/licence']);
    }

    logout() {
        this.authService.logout();
    }

    canViewLicence(): boolean {
        return accesAutorise(['licence-write', 'config-global-write', 'CONFIG_GLOBAL_MANAGE']);
    }

    isMenuActive() {
        const state = this.layoutService.layoutState();
        if (window.innerWidth > 991) {
            return !state.staticMenuDesktopInactive;
        } else {
            return state.staticMenuMobileActive;
        }
    }

    ngAfterViewInit() {
        if (this.bgVideo?.nativeElement) {
            const video = this.bgVideo.nativeElement;
            video.muted = true;
            video.play().catch(err => console.warn('Lecture auto:', err));
        }
    }
}

