import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DialogService } from 'primeng/dynamicdialog';
import { WorkflowService } from '@/app/services/workflow.service';
import { WorkflowDto, EmailTemplateDto } from '@/app/models/workflow.model';
import { WorkflowDefinitionFormComponent } from './workflow-definition-form/workflow-definition-form.component';
import { EmailTemplateFormComponent } from './email-template-form/email-template-form.component';
import { ConfirmationService, MessageService } from 'primeng/api';
import { showToast, StatusEnum } from '@/app/utils/global/global-utils';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CommonModule } from '@angular/common';
import { TabViewModule } from 'primeng/tabview';

@Component({
    selector: 'app-workflow-definition',
    standalone: true,
    imports: [CommonModule, TableModule, ButtonModule, InputTextModule, TabViewModule],
    providers: [DialogService, ConfirmationService, MessageService],
    templateUrl: './workflow-definition.component.html',
    styleUrl: './workflow-definition.component.scss'
})
export class WorkflowDefinitionComponent implements OnInit {
    private readonly service = inject(WorkflowService);
    private readonly router = inject(Router);
    private readonly dialogService = inject(DialogService);
    private readonly confirmationService = inject(ConfirmationService);
    private readonly messageService = inject(MessageService);

    workflows = signal<WorkflowDto[]>([]);
    emailTemplates = signal<EmailTemplateDto[]>([]);
    loadingWorkflows = signal(true);
    loadingTemplates = signal(true);

    ngOnInit(): void {
        this.loadWorkflows();
        this.loadEmailTemplates();
    }

    // --- Workflows ---

    loadWorkflows(): void {
        this.loadingWorkflows.set(true);
        this.service.getAllWorkflows().subscribe({
            next: (res) => {
                this.workflows.set(res.data?.content || res.data || []);
                this.loadingWorkflows.set(false);
            },
            error: () => {
                this.loadingWorkflows.set(false);
            }
        });
    }

    openCreateDialog(): void {
        const ref = this.dialogService.open(WorkflowDefinitionFormComponent, {
            header: 'Nouveau Workflow',
            width: '80%',
            data: {}
        });

        ref.onClose.subscribe((result) => {
            if (result) {
                this.loadWorkflows();
                showToast(StatusEnum.success, 200, "Workflow créé avec succès", this.messageService);
            }
        });
    }

    openEditDialog(workflow: WorkflowDto): void {
        const ref = this.dialogService.open(WorkflowDefinitionFormComponent, {
            header: 'Modifier Workflow',
            width: '80%',
            data: workflow
        });

        ref.onClose.subscribe((result) => {
            if (result) {
                this.loadWorkflows();
                showToast(StatusEnum.success, 200, "Workflow modifié avec succès", this.messageService);
            }
        });
    }

    viewDetails(workflow: WorkflowDto): void {
        this.router.navigate(['/parametrages/workflows', workflow.id]);
    }

    deleteWorkflow(workflow: WorkflowDto, event: Event): void {
        this.confirmationService.confirm({
            target: event.target as EventTarget,
            message: `Êtes-vous sûr de vouloir supprimer le workflow ${workflow.nom} ?`,
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                this.service.deleteWorkflow(workflow.id!).subscribe({
                    next: () => {
                        this.loadWorkflows();
                        showToast(StatusEnum.success, 200, "Workflow supprimé avec succès", this.messageService);
                    },
                    error: (err) => {
                        showToast(StatusEnum.error, err.status, null, this.messageService, err);
                    }
                });
            }
        });
    }

    // --- Email Templates ---

    loadEmailTemplates(): void {
        this.loadingTemplates.set(true);
        this.service.getAllEmailTemplates().subscribe({
            next: (res) => {
                // Adjust this depending on backend response structure (whether wrapped in data/content)
                this.emailTemplates.set((res as any).data?.content || (res as any).data || res || []);
                this.loadingTemplates.set(false);
            },
            error: () => {
                this.loadingTemplates.set(false);
            }
        });
    }

    openCreateTemplateDialog(): void {
        const ref = this.dialogService.open(EmailTemplateFormComponent, {
            header: 'Nouveau Modèle d\'Email',
            width: '600px',
            data: {}
        });

        ref.onClose.subscribe((result) => {
            if (result) {
                this.loadEmailTemplates();
                showToast(StatusEnum.success, 200, "Modèle d'email créé avec succès", this.messageService);
            }
        });
    }

    openEditTemplateDialog(template: EmailTemplateDto): void {
        const ref = this.dialogService.open(EmailTemplateFormComponent, {
            header: 'Modifier Modèle d\'Email',
            width: '600px',
            data: template
        });

        ref.onClose.subscribe((result) => {
            if (result) {
                this.loadEmailTemplates();
                showToast(StatusEnum.success, 200, "Modèle d'email modifié avec succès", this.messageService);
            }
        });
    }

    deleteTemplate(template: EmailTemplateDto, event: Event): void {
        this.confirmationService.confirm({
            target: event.target as EventTarget,
            message: `Êtes-vous sûr de vouloir supprimer le modèle ${template.code} ?`,
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                this.service.deleteEmailTemplate(template.id!).subscribe({
                    next: () => {
                        this.loadEmailTemplates();
                        showToast(StatusEnum.success, 200, "Modèle d'email supprimé avec succès", this.messageService);
                    },
                    error: (err) => {
                        showToast(StatusEnum.error, err.status, null, this.messageService, err);
                    }
                });
            }
        });
    }
}


