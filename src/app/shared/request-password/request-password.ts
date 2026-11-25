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

    // Nouveaux inputs rétrocompatibles (défauts identiques à l'existant pour les suppressions CRUD)
    @Input() confirmLabel: string = 'Supprimer';
    @Input() confirmIcon: string = 'pi pi-trash';
    @Input() badgeIcon: string = 'pi pi-trash';
    @Input() severity: 'danger' | 'info' | 'success' = 'danger';

    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() confirm = new EventEmitter<void>();
    @Output() cancel = new EventEmitter<void>();

    enteredValue: string = '';
    copied: boolean = false;

    get isMatch(): boolean {
        return (this.enteredValue || '').trim() === (this.expectedValue || '').trim();
    }

    get badgeClasses(): string {
        if (this.severity === 'info') {
            return 'bg-[#0084ca]/10 dark:bg-[#0084ca]/20 text-[#0084ca] dark:text-sky-400 ring-[#0084ca]/10';
        }
        if (this.severity === 'success') {
            return 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 ring-emerald-50/50 dark:ring-emerald-950/20';
        }
        return 'bg-rose-50 dark:bg-rose-950/40 text-rose-500 dark:text-rose-400 ring-rose-50/50 dark:ring-rose-950/20';
    }

    get confirmButtonClass(): string {
        if (this.severity === 'info') return 'p-button-info p-button-sm flex-1 justify-center rounded-[6px]';
        if (this.severity === 'success') return 'p-button-success p-button-sm flex-1 justify-center rounded-[6px]';
        return 'p-button-danger p-button-sm flex-1 justify-center rounded-[6px]';
    }

    get inputFocusClass(): string {
        if (this.severity === 'info') return 'focus:ring-[#0084ca]';
        if (this.severity === 'success') return 'focus:ring-emerald-500';
        return 'focus:ring-rose-500';
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