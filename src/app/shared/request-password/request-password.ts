import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgPrimeModule } from '../../../prime-ng.module';

@Component({
    selector: 'app-request-password',
    templateUrl: './request-password.html',
    standalone: true,
    imports: [CommonModule, FormsModule, NgPrimeModule]
})
export class RequestPasswordComponent {
    @Input() visible: boolean = false;
    @Input() title: string = 'Confirmation de suppression définitive';
    @Input() message: string = 'Cette action est irréversible. Pour confirmer la suppression, veuillez copier ou saisir la valeur exacte ci-dessous :';
    @Input() expectedValue: string = '';
    @Input() targetLabel: string = 'le libellé';
    @Input() loading: boolean = false;

    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() confirm = new EventEmitter<void>();
    @Output() cancel = new EventEmitter<void>();

    enteredValue: string = '';
    copied: boolean = false;

    get isMatch(): boolean {
        return (this.enteredValue || '').trim() === (this.expectedValue || '').trim();
    }

    copyToClipboard(): void {
        if (!this.expectedValue) return;
        navigator.clipboard.writeText(this.expectedValue);
        this.copied = true;
        setTimeout(() => this.copied = false, 2000);
    }

    onConfirm(): void {
        if (!this.isMatch || this.loading) return;
        this.confirm.emit();
        this.reset();
    }

    onCancel(): void {
        this.reset();
        this.visible = false;
        this.visibleChange.emit(false);
        this.cancel.emit();
    }

    reset(): void {
        this.enteredValue = '';
        this.copied = false;
    }
}
