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

    constructor(private featureService: FeaturesService) {
        this.featureService.loader.subscribe((res) => {
            this.loader = res;
        });
    }

    ngOnInit(): void {}
}
