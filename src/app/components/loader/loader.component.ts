import { Component, OnInit } from '@angular/core';
import { BlockUI } from 'primeng/blockui';
// Supprimer l'import de ProgressSpinner ici
import { FeaturesService } from '../../services/feature-service';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-loader',
    templateUrl: './loader.component.html',
    imports: [BlockUI, CommonModule],
    styleUrl: './loader.component.scss'
})
export class LoaderComponent implements OnInit {
    loader: boolean = true;
    progress: number = 0;
    private progressInterval: any;

    constructor(private featureService: FeaturesService) {
        this.featureService.loader.subscribe((res) => {
            if (res) {
                // Démarre le chargement
                this.loader = true;
                this.startProgress();
            } else {
                // Termine le chargement
                this.completeProgress();
            }
        });
    }

    ngOnInit(): void {
        // En conditions réelles, on vérifie juste si un chargement est déjà en cours à l'initialisation
        if (this.loader) {
            this.startProgress();
        }
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
        setTimeout(() => {
            this.loader = false;
            this.progress = 0;
        }, 400);
    }
}
