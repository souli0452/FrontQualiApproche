import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgPrimeModule } from '../../../prime-ng.module';

@Component({
  selector: 'app-form-modal',
  standalone: true,
  imports: [CommonModule, NgPrimeModule],
  templateUrl: './form-modal.html',
  styles: ``
})
export class FormModal {
  @Input() visible = false;
  @Input() title = '';
  @Input() description?: string;
  @Input() longDescription?: string;
  @Input() icon = 'pi pi-plus';
  @Input() iconBgClass = 'bg-blue-100 dark:bg-blue-900/30';
  @Input() iconColorClass = 'text-blue-600 dark:text-blue-400';
  
  @Input() width = '500px';
  @Input() isSubmitting = false;
  @Input() isSubmitDisabled = false;
  @Input() submitLabel = 'Créer';
  @Input() cancelLabel = 'Annuler';
  @Input() submitColorClass = 'bg-primary-600 hover:bg-primary-700 text-white';

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() onSubmit = new EventEmitter<void>();
  @Output() onCancel = new EventEmitter<void>();

  onHideDialog() {
    this.visible = false;
    this.visibleChange.emit(false);
  }

  handleCancel() {
    this.onHideDialog();
    this.onCancel.emit();
  }

  handleSubmit() {
    this.onSubmit.emit();
  }
}
