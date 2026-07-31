import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import { MessageService, ConfirmationService } from 'primeng/api';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ToolbarModule } from 'primeng/toolbar';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { TooltipModule } from 'primeng/tooltip';

import { WorkflowService } from '../../../services/workflow.service';
import { EmailTemplateDto } from '../../../models/workflow.model';
import { showToast, StatusEnum } from '../../../utils/global/global-utils';

@Component({
  selector: 'app-email-template',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule,
    TableModule, ButtonModule, InputTextModule, TextareaModule,
    ToolbarModule, DialogModule, ConfirmDialogModule, ToastModule,
    IconFieldModule, InputIconModule, TooltipModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './email-template.component.html',
  styleUrl: './email-template.component.scss'
})
export class EmailTemplateWorkflowComponent implements OnInit, OnDestroy {
    loading = false;
    destroy$ = new Subject<boolean>();

    templates: EmailTemplateDto[] = [];
    allTemplates: EmailTemplateDto[] = [];
    searchQuery = '';

    showDialog = false;
    templateForm: FormGroup;
    isEditMode = false;
    editingId?: string;

    constructor(
        private fb: FormBuilder,
        private workflowService: WorkflowService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService
    ) {
        this.templateForm = this.fb.group({
            code: [null, Validators.required],
            subject: [null, Validators.required],
            description: [null],
            body: [null, Validators.required]
        });
    }

    ngOnInit(): void {
        this.fetchTemplates();
    }

    fetchTemplates() {
        this.loading = true;
        this.workflowService.getAllEmailTemplates()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (res: any) => {
                    this.allTemplates = res || [];
                    this.templates = [...this.allTemplates];
                    this.loading = false;
                },
                error: (err: any) => {
                    this.loading = false;
                    showToast(StatusEnum.error, err.status, 'Erreur de chargement', this.messageService, err);
                }
            });
    }

    onSearch(event: Event) {
        const query = (event.target as HTMLInputElement).value.toLowerCase();
        if (!query) {
            this.templates = [...this.allTemplates];
        } else {
            this.templates = this.allTemplates.filter(t =>
                (t.code && t.code.toLowerCase().includes(query)) ||
                (t.subject && t.subject.toLowerCase().includes(query)) ||
                (t.description && t.description.toLowerCase().includes(query))
            );
        }
    }

    openNew() {
        this.isEditMode = false;
        this.editingId = undefined;
        this.templateForm.reset();
        this.showDialog = true;
    }

    editTemplate(template: EmailTemplateDto) {
        this.isEditMode = true;
        this.editingId = template.id;
        this.templateForm.patchValue({
            code: template.code,
            subject: template.subject,
            description: template.description,
            body: template.body
        });
        this.showDialog = true;
    }

    hideDialog() {
        this.showDialog = false;
    }

    saveTemplate() {
        if (this.templateForm.invalid) {
            this.messageService.add({ severity: 'warn', summary: 'Erreur', detail: 'Veuillez remplir les champs obligatoires' });
            return;
        }

        const payload: EmailTemplateDto = this.templateForm.value;
        this.loading = true;

        if (this.isEditMode && this.editingId) {
            this.workflowService.updateEmailTemplate(this.editingId, payload)
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: () => {
                        this.messageService.add({ severity: 'success', summary: 'Succès', detail: 'Template mis à jour' });
                        this.hideDialog();
                        this.fetchTemplates();
                    },
                    error: (err: any) => {
                        this.loading = false;
                        showToast(StatusEnum.error, err.status, 'Erreur de mise à jour', this.messageService, err);
                    }
                });
        } else {
            this.workflowService.createEmailTemplate(payload)
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: () => {
                        this.messageService.add({ severity: 'success', summary: 'Succès', detail: 'Template créé' });
                        this.hideDialog();
                        this.fetchTemplates();
                    },
                    error: (err: any) => {
                        this.loading = false;
                        showToast(StatusEnum.error, err.status, 'Erreur de création', this.messageService, err);
                    }
                });
        }
    }

    deleteTemplate(template: EmailTemplateDto) {
        if (!template.id) return;
        this.confirmationService.confirm({
            message: `Voulez-vous vraiment supprimer le template "${template.code}" ?`,
            header: 'Confirmation',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                this.loading = true;
                this.workflowService.deleteEmailTemplate(template.id!)
                    .pipe(takeUntil(this.destroy$))
                    .subscribe({
                        next: () => {
                            this.messageService.add({ severity: 'success', summary: 'Succès', detail: 'Template supprimé' });
                            this.fetchTemplates();
                        },
                        error: (err: any) => {
                            this.loading = false;
                            showToast(StatusEnum.error, err.status, 'Erreur de suppression', this.messageService, err);
                        }
                    });
            }
        });
    }

    ngOnDestroy() {
        this.destroy$.next(true);
        this.destroy$.unsubscribe();
    }
}
