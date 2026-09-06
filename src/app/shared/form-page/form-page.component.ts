import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UntypedFormGroup } from '@angular/forms';
import { FormGroupColumn } from '../../models/generique.model';
import { FormInputTemplateComponent } from '../form-input-template/form-input-template.component';
import { NgPrimeModule } from '../../../prime-ng.module';

export interface QuickTip {
    icon?: string;
    text: string;
    colorClass?: string;
}

@Component({
    selector: 'app-form-page',
    standalone: true,
    imports: [CommonModule, NgPrimeModule, FormInputTemplateComponent],
    templateUrl: './form-page.component.html'
})
export class FormPageComponent {
    @Input() title: string = 'Formulaire';
    @Input() subtitle: string = 'Veuillez remplir les informations requises.';
    @Input() icon: string = 'pi-file-edit';
    
    @Input() formGroup!: UntypedFormGroup;
    @Input() formCols: FormGroupColumn[] = [];
    @Input() dropDownObject: any = {};
    @Input() multiselectObject: any = {};
    
    @Input() quickTips: QuickTip[] = [];
    @Input() quickTipsTitle: string = 'Conseils rapides';
    
    @Input() submitLabel: string = 'Enregistrer';
    @Input() cancelLabel: string = 'Annuler';
    @Input() isSubmitting: boolean = false;
    @Input() isSubmitDisabled: boolean = false;

    @Output() onSubmit = new EventEmitter<void>();
    @Output() onCancel = new EventEmitter<void>();

    handleCancel() {
        this.onCancel.emit();
    }

    handleSubmit() {
        if (this.formGroup && this.formGroup.invalid) {
            this.formGroup.markAllAsTouched();
            return;
        }

        if (!this.isSubmitting && !this.isSubmitDisabled) {
            this.onSubmit.emit();
        }
    }
}
