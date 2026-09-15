import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';
import { ProgressBar } from 'primeng/progressbar';
import { Subscription } from 'rxjs';
import { FeaturesService } from '@core/services/feature-service';

@Component({
    selector: 'app-inside-loader',
    standalone: true,
    imports: [CommonModule, ProgressBar],
    templateUrl: './inside-loader.component.html',
    styleUrl: './inside-loader.component.scss'
})
export class InsideLoaderComponent implements OnInit, OnDestroy {
    visible: boolean = false;
    progress: number = 0;

    private isNavigating: boolean = false;
    private isHttpLoading: boolean = false;
    private progressInterval: any;
    private completeTimeout: any;
    private subscriptions = new Subscription();

    constructor(
        private router: Router,
        private featureService: FeaturesService
    ) {}

    ngOnInit(): void {
        // 1. Branchement sur la navigation entre les pages (Router)
        this.subscriptions.add(
            this.router.events.subscribe((event) => {
                if (event instanceof NavigationStart) {
                    this.isNavigating = true;
                    this.demarrerChargement();
                } else if (
                    event instanceof NavigationEnd ||
                    event instanceof NavigationCancel ||
                    event instanceof NavigationError
                ) {
                    this.isNavigating = false;
                    this.verifierFinChargement();
                }
            })
        );

        // 2. Branchement sur les requêtes API (POST, PUT, DELETE, transitions workflow)
        this.subscriptions.add(
            this.featureService.loader.subscribe((isLoading) => {
                this.isHttpLoading = !!isLoading;
                if (this.isHttpLoading) {
                    this.demarrerChargement();
                } else {
                    this.verifierFinChargement();
                }
            })
        );
    }

    ngOnDestroy(): void {
        this.clearTimers();
        this.subscriptions.unsubscribe();
    }

    private demarrerChargement(): void {
        if (this.completeTimeout) {
            clearTimeout(this.completeTimeout);
            this.completeTimeout = null;
        }

        if (!this.visible) {
            this.visible = true;
            this.progress = 15; // Démarrage immédiat
        }

        if (this.progressInterval) clearInterval(this.progressInterval);

        // Progression fluide façon "NProgress" : avance vite puis ralentit vers 90%
        this.progressInterval = setInterval(() => {
            if (this.progress < 70) {
                this.progress += 4;
            } else if (this.progress < 90) {
                this.progress += 1;
            }
        }, 80);
    }

    private verifierFinChargement(): void {
        // Si ni navigation ni requête API n'est en cours, on finalise à 100%
        if (!this.isNavigating && !this.isHttpLoading && this.visible) {
            this.terminerChargement();
        }
    }

    private terminerChargement(): void {
        if (this.progressInterval) clearInterval(this.progressInterval);
        this.progress = 100; // Saute directement à 100%

        // Disparaît doucement après 250ms pour laisser l'œil apprécier la fin du chargement
        this.completeTimeout = setTimeout(() => {
            this.visible = false;
            this.progress = 0;
            this.completeTimeout = null;
        }, 250);
    }

    private clearTimers(): void {
        if (this.progressInterval) clearInterval(this.progressInterval);
        if (this.completeTimeout) clearTimeout(this.completeTimeout);
    }
}
