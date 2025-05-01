import {Component, Input} from '@angular/core';
import { NgPrimeModule } from '../../../prime-ng.module';
@Component({
    selector: 'detail-template-component',
    templateUrl: './detail-template.component.html',
    standalone: true,
    imports: [NgPrimeModule]
})
export class DetailTemplateComponent {
   @Input() cols: any[] = [];
    @Input() rowData?: any;
    @Input() title?: any;
    constructor() {
    }


}
