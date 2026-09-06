import {Component, Input} from '@angular/core';
import {UntypedFormGroup} from "@angular/forms";
import { NgPrimeModule } from '@prime-ng';

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

    onFileSelected(event: any) {}

    incrementKnob(field: string) {
        const ctrl = this.form.get(field);
        if (ctrl) {
            const current = ctrl.value || 0;
            if (current < 100) ctrl.setValue(current + 1);
        }
    }

    decrementKnob(field: string) {
        const ctrl = this.form.get(field);
        if (ctrl) {
            const current = ctrl.value || 0;
            if (current > 0) ctrl.setValue(current - 1);
        }
    }
}

