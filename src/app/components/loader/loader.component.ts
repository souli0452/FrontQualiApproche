import { Component, OnInit } from '@angular/core';
import { BlockUI } from 'primeng/blockui';
import { ProgressSpinner } from 'primeng/progressspinner';
import { FeaturesService } from '../../services/feature-service';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-loader',
    templateUrl: './loader.component.html',
    imports: [BlockUI, ProgressSpinner,CommonModule],
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
