import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { MessageService } from 'primeng/api';

export enum StatusEnum {
    error = 'error',
    success = 'success',
    warning = 'warn'
}

export enum StatusEnumShow {
    error = 'error',
    success = 'success',
    warning = 'warn'
}

@Injectable({
    providedIn: 'root'
})
export class AlertService {

    constructor(private messageService: MessageService) { }

    showSuccess(message: string, summary: string = 'Succès', life: number = 4500) {
        this.messageService.add({ severity: 'success', summary, detail: message, life });
    }

    showError(message: string, summary: string = 'Erreur', life: number = 8000) {
        this.messageService.add({ severity: 'error', summary, detail: message, life });
    }

    showWarning(message: string, summary: string = 'Avertissement', life: number = 6000) {
        this.messageService.add({ severity: 'warn', summary, detail: message, life });
    }

    showInfo(message: string, summary: string = 'Information', life: number = 5000) {
        this.messageService.add({ severity: 'info', summary, detail: message, life });
    }

    /**
     * Extrait automatiquement le message d'erreur d'une réponse API HttpErrorResponse
     */
    handleHttpError(error: any, fallbackMessage: string = 'Une erreur est survenue') {
        const detail = error?.error?.message || error?.message || fallbackMessage;
        this.showError(detail);
    }

    clear() {
        this.messageService.clear();
    }
}

/**
 * Fonction de compatibilité globale pour les composants utilisant encore showToast
 */
export function showToast(
    severity: StatusEnum,
    status: number,
    message: any,
    messageService: MessageService,
    error?: HttpErrorResponse
) {
    const resolvedSeverity = severity === StatusEnum.warning ? 'warn' : severity;
    const summary = resolvedSeverity === 'success'
        ? 'Succès'
        : resolvedSeverity === 'error'
            ? 'Erreur'
            : 'Avertissement';
    const detail = message || error?.error?.message || (status >= 200 && status < 300 ? 'Opération réussie' : 'Erreur de connexion');
    const life = resolvedSeverity === 'error' ? 8000 : resolvedSeverity === 'warn' ? 6000 : 4500;

    messageService.add({
        severity: resolvedSeverity,
        summary,
        detail,
        life
    });
}
