import { Component, OnDestroy, OnInit } from '@angular/core';
import { BlockUI } from 'primeng/blockui';
import { FeaturesService } from '../../services';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-loader',
    templateUrl: './loader.component.html',
    imports: [BlockUI, CommonModule],
    styleUrl: './loader.component.scss'
})
export class LoaderComponent implements OnInit, OnDestroy {
    loader: boolean = false;
    progress: number = 0;
    private progressInterval: any;
    private completeTimeout: any;
    private subscription: Subscription;

    constructor(private featureService: FeaturesService) {
        this.subscription = this.featureService.loader.subscribe((res) => {
            if (res) {
                if (this.completeTimeout) {
                    clearTimeout(this.completeTimeout);
                    this.completeTimeout = null;
                }
                this.loader = true;
                this.startProgress();
            } else if (this.loader) {
                this.completeProgress();
            }
        });
    }

    ngOnInit(): void {}

    ngOnDestroy(): void {
        if (this.progressInterval) clearInterval(this.progressInterval);
        if (this.completeTimeout) clearTimeout(this.completeTimeout);
        this.subscription?.unsubscribe();
    }

    startProgress() {
        if (this.progressInterval) clearInterval(this.progressInterval);
        this.progress = 0;
        let direction = 1; // 1 pour monter, -1 pour descendre
        
        this.progressInterval = setInterval(() => {
            if (direction === 1) {
                // La vague monte
                this.progress += 1; // +1% par tick
                if (this.progress >= 100) {
                    this.progress = 100;
                    direction = -1; // Change de sens
                }
            } else {
                // La vague redescend (se vide)
                this.progress -= 1; // -1% par tick
                if (this.progress <= 0) {
                    this.progress = 0;
                    direction = 1; // Repart à la hausse
                }
            }
        }, 40); // Environ 4 secondes pour faire 0 -> 100%
    }

    completeProgress() {
        if (this.progressInterval) clearInterval(this.progressInterval);
        this.progress = 100; // Saute directement à 100%
        
        // Attend une demi-seconde pour que l'utilisateur voie le "100%" avant de disparaître
        this.completeTimeout = setTimeout(() => {
            if (this.progressInterval) clearInterval(this.progressInterval);
            this.loader = false;
            this.progress = 0;
            this.completeTimeout = null;
        }, 400);
    }
}
