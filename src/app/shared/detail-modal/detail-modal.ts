import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgPrimeModule } from '../../../prime-ng.module';

@Component({
  selector: 'app-detail-modal',
  standalone: true,
  imports: [CommonModule, NgPrimeModule],
  templateUrl: './detail-modal.html',
  styles: ``
})
export class DetailModal {
  @Input() visible = false;
  @Input() width = '50rem';
  @Input() title = '';
  @Input() subtitle = '';
  @Input() longDescription = '';
  @Input() itemDescription?: string;
  @Input() imagePath = 'assets/logo-quali-sira.svg';
  
  @Input() icon = 'pi pi-eye';
  @Input() iconBgClass = 'bg-blue-100 dark:bg-blue-900/30';
  @Input() iconColorClass = 'text-blue-500';

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() onClose = new EventEmitter<void>();

  onHideDialog() {
    this.visible = false;
    this.visibleChange.emit(false);
  }

  handleClose() {
    this.onHideDialog();
    this.onClose.emit();
  }
}
