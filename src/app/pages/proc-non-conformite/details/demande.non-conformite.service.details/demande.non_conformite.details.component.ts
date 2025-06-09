import { Component, Input } from '@angular/core';
import { FeaturesService } from '../../../../services/feature-service';
import { DatePipe } from '@angular/common';
import { Tag } from 'primeng/tag';
import { StatusEnum } from '../../../../enums';
import { NgPrimeModule } from '../../../../../prime-ng.module';

@Component({
    selector: 'demande-non_conformite-details',
    templateUrl: './demande.non_conformite.details.component.html',
    imports: [NgPrimeModule],
    styleUrl: './demande.non_conformite.details.component.scss'
})
export class DemandeNon_conformiteDetailsComponent {
    @Input() demande: any = {};
    constructor(private featureService: FeaturesService) {}

    ngOnInit() {}


    downloadFile(fileId: string) {
        // Implémentez la logique de téléchargement
    }
}
