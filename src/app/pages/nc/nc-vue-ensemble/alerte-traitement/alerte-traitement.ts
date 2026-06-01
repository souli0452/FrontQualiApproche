import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SkeletonModule } from 'primeng/skeleton';
import { MessageModule } from 'primeng/message';

@Component({
    standalone: true,
    selector: 'app-alerte-traitement',
    imports: [CommonModule, SkeletonModule, MessageModule],
    templateUrl: './alerte-traitement.html'
})
export class AlerteTraitement {

    @Input() dashboardData: any;
    @Input() loading: boolean = false;

    @Input() countBrouillon: number = 0;
    @Input() countImputees: number = 0;
    @Input() countReception: number = 0;
    @Input() countValidationRQ: number = 0;
    @Input() countValidationPilote: number = 0;
    @Input() countCloture: number = 0;
    @Input() countAffectation: number = 0;
    @Input() countNonTraiter: number = 0;


    isAdmin: boolean = false;
    isChef: boolean = false;
    isAgent: boolean = false;

    // Compteurs pour l'affichage
    countPubliees: number = 0;
    countEnAttenteValidation: number = 0;

}