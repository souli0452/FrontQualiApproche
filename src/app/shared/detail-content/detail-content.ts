import {Component, Input} from '@angular/core';
import { NgPrimeModule } from '../../../prime-ng.module';
import { CommonModule } from '@angular/common';


@Component({
    selector: 'detail-template-component',
    templateUrl: './detail-content.html',
    standalone: true,
    imports: [NgPrimeModule,CommonModule]
})
export class DetailTemplateComponent {
   @Input() cols: any[] = [];
    @Input() rowData?: any;
    @Input() title?: any;
    constructor() {
    }


    get displayCols(): any[] {
        if (!this.cols) return [];
        return this.cols.filter(col => col.visible !== false && col.field !== 'id');
    }

}
