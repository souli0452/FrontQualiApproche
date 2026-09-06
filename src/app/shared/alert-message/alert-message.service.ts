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

    showSuccess(message: string, summary: string = 'Succès') {
        this.messageService.add({ severity: 'success', summary, detail: message });
    }

    showError(message: string, summary: string = 'Erreur') {
        this.messageService.add({ severity: 'error', summary, detail: message });
    }

    showWarning(message: string, summary: string = 'Attention') {
        this.messageService.add({ severity: 'warn', summary, detail: message });
    }

    showInfo(message: string, summary: string = 'Information') {
        this.messageService.add({ severity: 'info', summary, detail: message });
    }

    /**
     * Extrait automatiquement le message d'erreur d'une réponse API HttpErrorResponse
     */
    handleHttpError(error: any, fallbackMessage: string = 'Une erreur est survenue') {
        const detail = error?.error?.message || error?.message || fallbackMessage;
        this.showError(detail);
    }

    clear() {
        this.messageService.clear('alertMessage');
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
    const detail = message || error?.error?.message || (status >= 200 && status < 300 ? 'Opération réussie' : 'Erreur de connexion');
    messageService.add({
        severity: severity === StatusEnum.warning ? 'warn' : severity,
        summary: severity === StatusEnum.success ? 'Succès' : severity === StatusEnum.error ? 'Erreur' : 'Information',
        detail
    });
}
