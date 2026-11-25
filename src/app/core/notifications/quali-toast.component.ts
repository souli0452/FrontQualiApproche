import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Toast } from 'primeng/toast';

type ToastSeverity = 'warn' | 'success' | 'error' | 'info';

const SUMMARY_FALLBACKS: Record<ToastSeverity, string> = {
    warn: 'Avertissement',
    success: 'Opération réussie',
    error: 'Erreur',
    info: 'Information'
};

/**
 * Hôte global unique des notifications toast QualiSira au design « Capsule Verre Pur
 * & Aura Latérale » (bas droit).
 *
 * <p>Monté une seule fois dans {@link AppComponent}, il reçoit tous les appels émis via
 * le {@code MessageService} racine (directement, via {@code AlertService} ou {@code showToast})
 * tout en conservant nativement la file et la pause au survol de PrimeNG.</p>
 */
@Component({
    selector: 'app-quali-toast',
    standalone: true,
    imports: [CommonModule, Toast],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <p-toast
            position="bottom-right"
            [baseZIndex]="1100999"
            [life]="5000"
            styleClass="qs-glass-toast-host"
            [showTransformOptions]="'translate3d(24px, 18px, 0)'"
            [hideTransformOptions]="'translate3d(28px, 6px, 0)'"
            [showTransitionOptions]="'320ms cubic-bezier(0.22, 1, 0.36, 1)'"
            [hideTransitionOptions]="'220ms ease-in'"
        >
            <ng-template #headless let-message let-closeFn="closeFn">
                @let sev = severityOf(message?.severity);
                <div class="qs-glass-toast-card" [ngClass]="'qs-glass-toast-card--' + sev">
                    <div class="qs-glass-toast-body">
                        <div class="qs-glass-toast-icon" aria-hidden="true">
                            @if (message?.icon) {
                                <i [class]="'pi ' + message.icon + ' !text-[15px]'"></i>
                            } @else {
                                @switch (sev) {
                                    @case ('warn') {
                                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1">
                                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"/>
                                        </svg>
                                    }
                                    @case ('success') {
                                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                                            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>
                                        </svg>
                                    }
                                    @case ('error') {
                                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                                            <path stroke-linecap="round" stroke-linejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>
                                        </svg>
                                    }
                                    @default {
                                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                                            <path stroke-linecap="round" stroke-linejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"/>
                                        </svg>
                                    }
                                }
                            }
                        </div>

                        <div class="qs-glass-toast-content">
                            <div class="qs-glass-toast-header">
                                <span class="qs-glass-toast-summary">
                                    {{ message?.summary || defaultSummary(sev) }}
                                </span>

                                @if (message?.closable !== false) {
                                    <button
                                        type="button"
                                        class="qs-glass-toast-close"
                                        aria-label="Fermer"
                                        (click)="closeFn($event)"
                                        (keydown.enter)="closeFn($event)"
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                                            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12"/>
                                        </svg>
                                    </button>
                                }
                            </div>

                            @if (message?.detail) {
                                <p class="qs-glass-toast-detail">{{ message.detail }}</p>
                            }
                        </div>
                    </div>

                    @if (!message?.sticky) {
                        <div class="qs-glass-toast-progress" aria-hidden="true">
                            <div
                                class="qs-glass-toast-progress-bar"
                                [style.animation-duration]="(message?.life || 5000) + 'ms'"
                            ></div>
                        </div>
                    }
                </div>
            </ng-template>
        </p-toast>
    `
})
export class QualiToastComponent {
    protected severityOf(severity?: string): ToastSeverity {
        if (severity === 'warn' || severity === 'success' || severity === 'error' || severity === 'info') {
            return severity;
        }
        return 'info';
    }

    protected defaultSummary(severity: ToastSeverity): string {
        return SUMMARY_FALLBACKS[severity];
    }
}
