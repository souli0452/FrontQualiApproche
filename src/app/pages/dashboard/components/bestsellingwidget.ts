import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { UIChart } from 'primeng/chart';
import { SelectModule } from 'primeng/select';
import { NgPrimeModule } from '../../../../prime-ng.module';

@Component({
    standalone: true,
    selector: 'app-best-selling-widget',
    imports: [CommonModule, ButtonModule, MenuModule, UIChart, SelectModule, NgPrimeModule],
    template: ` <div class="card">
        <h6>Non conformité total par an</h6>
        <div class="flex align-items-center justify-content-end gap-3">
            <div class="flex-auto">
            <h6 class="m-0 text-sm font-medium text-600"></h6></div>
            <div class="col">
            <h6 class="m-0 text-sm font-medium text-600">Année</h6>
            <p-select [options]="annees"
                        [(ngModel)]="anneeSelectionnee"
                        placeholder="Année"
                       (onChange)="change()"
                        [style]="{ width: '150px' }"
                        appendTo="body">
            </p-select></div>
        </div>
        <p-chart type="bar" [data]="data" [options]="options" class="h-[30rem]" />
    </div>`
})
export class BestSellingWidget {
    menu = null;
    @Input() data: any;
    @Input() options: any;
    @Output() changeYear = new EventEmitter<any>();
    annees: number[] = [];
    anneeSelectionnee!: number;
    items = [
        { label: 'Add New', icon: 'pi pi-fw pi-plus' },
        { label: 'Remove', icon: 'pi pi-fw pi-trash' }
    ];

    ngOnInit() {
        this.generateYearList();
    }
    change(){
        console.log(this.anneeSelectionnee);
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
}
