import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ChartModule } from 'primeng/chart';
import { debounceTime, Subscription } from 'rxjs';
import { LayoutService } from '../../../layout/service/layout.service';
import { SelectModule } from 'primeng/select';
import { NgPrimeModule } from '../../../../prime-ng.module';
import { isUserInRoles } from '../../../utils';

@Component({
    standalone: true,
    selector: 'app-revenue-stream-widget',
    imports: [ChartModule, SelectModule, NgPrimeModule],
    template: `<div class="card !mb-8">
        <div class="font-semibold text-xl mb-4"> <span *ngIf="isUserInRoles(['SUPER_ADMIN'])">Non conformité par processus</span>
            <span *ngIf="!isUserInRoles(['SUPER_ADMIN'])">Fréquence de traitement des plans d'action</span>
        </div>
        <div class="flex align-items-center justify-content-end gap-3">
            <div class="flex-auto">
                <h6 class="m-0 text-sm font-medium text-600"></h6>
            </div>
            <div class="col">
                <h6 class="m-0 text-sm font-medium text-600">Année</h6>
                <p-select [options]="annees" [(ngModel)]="anneeSelectionnee" placeholder="Année" (onChange)="change()" [style]="{ width: '150px' }" appendTo="body"> </p-select>
            </div>
        </div>
        <p-chart *ngIf="!isUserInRoles(['SUPER_ADMIN'])" type="line" [data]="chartDataTaux" [options]="chartOptionsTaux" class="h-[30rem]" />
        <p-chart  *ngIf="isUserInRoles(['SUPER_ADMIN'])" type="bar" [data]="chartData" [options]="chartOptions" class="w-full md:w-[30rem]" />
    </div>`
})
export class RevenueStreamWidget {
    @Input() chartData: any;

    @Input() chartOptions: any;
    @Input() chartDataTaux: any;

    @Input() chartOptionsTaux: any;
    @Output() changeYear = new EventEmitter<any>();
    annees: number[] = [];
    anneeSelectionnee!: number;
    subscription!: Subscription;

    constructor(public layoutService: LayoutService) {}

    ngOnInit() {
        this.generateYearList();
    }
    change(){
        this.changeYear.emit(this.anneeSelectionnee);
    }
    generateYearList() {
        const currentYear = new Date().getFullYear();
        // Génère une liste d'années (ex: 10 ans avant et après l'année courante)
        for (let year = currentYear - 30; year <= currentYear + 100; year++) {
            this.annees.push(year);
        }
        // Définit l'année courante comme sélectionnée par défaut
        this.anneeSelectionnee = currentYear;
    }
    ngOnDestroy() {
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
    }

    protected readonly isUserInRoles = isUserInRoles;
}
