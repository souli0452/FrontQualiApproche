import {Component, Input} from '@angular/core';
import {UntypedFormGroup} from "@angular/forms";
import { NgPrimeModule } from '../../../prime-ng.module';

@Component({
  selector: 'app-form-input-template',
  templateUrl: './form-input-template.component.html',
  styleUrl: './form-input-template.component.scss',
  standalone: true,
  imports: [NgPrimeModule]
})
export class FormInputTemplateComponent {
    @Input() col: any;
    @Input() dropDownObject: any;
    @Input() multiSelectObject: any;
    @Input() form!: UntypedFormGroup;
    onFileSelected(event: any) {


    }
}
