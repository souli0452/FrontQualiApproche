import { AfterViewInit, ChangeDetectorRef, Component, inject, Input, OnInit, PLATFORM_ID } from '@angular/core';
import { RippleModule } from 'primeng/ripple';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Product, ProductService } from '../../service/product.service';
import { UIChart } from 'primeng/chart';
import { ProcNonConformiteService } from '../../proc-non-conformite/proc-non-conformite.service';
import { data } from 'autoprefixer';
import { isUserInRoles } from '../../../utils';

@Component({
    standalone: true,
    selector: 'app-recent-sales-widget',
    imports: [CommonModule, TableModule, ButtonModule, RippleModule, UIChart],
    template: `<div *ngIf="!isUserInRoles(['SUPER_ADMIN'])" class="card !mb-8" style="height: 530px">
        <div class="font-semibold text-xl mb-4">Non-conformité</div>
        <p-chart type="doughnut"   [data]="data" [options]="options" class="w-full" />
    </div><div *ngIf="isUserInRoles(['SUPER_ADMIN'])" class="card !mb-8" style="height: 455px">
        <div class="font-semibold text-xl mb-4">Non-conformité</div>
        <p-chart type="doughnut"   [data]="data" [options]="options" class="w-full h-full"   />
    </div>`,
    providers: [ProductService]
})
export class RecentSalesWidget implements OnInit {
    products!: Product[];
   @Input() data: any;
    @Input() options: any;
    constructor( private productService: ProductService) {

    }

    ngOnInit() {
        this.productService.getProductsSmall().then((data) => (this.products = data));
    }


    protected readonly isUserInRoles = isUserInRoles;
}
