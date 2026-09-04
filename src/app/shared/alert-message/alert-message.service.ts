import { Injectable } from '@angular/core';
import { MessageService } from 'primeng/api';

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
