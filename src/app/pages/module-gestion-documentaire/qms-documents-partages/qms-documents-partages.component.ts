import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { NgPrimeModule } from '../../../../prime-ng.module';
import { QmsDocumentService } from '../../../services/module-gestion-documentaire/qms-document.service';
import { SharedDocumentDto } from '../../../models/gestion-documentaire.model';
import { showToast, StatusEnum } from '../../../utils/global/global-utils';
import { MessageService } from 'primeng/api';

@Component({
    selector: 'app-qms-documents-partages',
    standalone: true,
    imports: [CommonModule, NgPrimeModule],
    providers: [MessageService],
    templateUrl: './qms-documents-partages.component.html',
    styleUrl: './qms-documents-partages.component.scss'
})
export class QmsDocumentsPartagesComponent implements OnInit, OnDestroy {
    loading = true;
    sharedDocuments: SharedDocumentDto[] = [];

    private destroy$ = new Subject<void>();

    constructor(
        private qmsService: QmsDocumentService,
        private messageService: MessageService
    ) {}

    ngOnInit(): void {
        this.loadSharedDocuments();
    }

    loadSharedDocuments(): void {
        this.loading = true;
        this.qmsService.getMySharedDocuments()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (docs) => {
                    this.sharedDocuments = docs || [];
                    this.loading = false;
                },
                error: (err: any) => {
                    this.loading = false;
                    showToast(StatusEnum.error, err.status, 'Erreur de chargement des documents partagés', this.messageService, err);
                }
            });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }
}
