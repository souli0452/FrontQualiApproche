import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { MessageService } from 'primeng/api';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { TooltipModule } from 'primeng/tooltip';
import { ToolbarModule } from 'primeng/toolbar';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';

import { WorkflowService } from '../../../services/workflow.service';
import { showToast, StatusEnum } from '../../../utils/global/global-utils';
import { WorkflowDto } from '../../../models/workflow.model';

@Component({
  selector: 'app-nc-workflow-definition',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    TableModule, ButtonModule, InputTextModule, IconFieldModule, InputIconModule,
    TooltipModule, ToolbarModule, ToastModule, TagModule
  ],
  providers: [MessageService],
  templateUrl: './nc-workflow-definition.component.html',
  styleUrl: './nc-workflow-definition.component.scss'
})
export class NcWorkflowDefinitionComponent implements OnInit, OnDestroy {
    loading: boolean = true;
    destroy$: Subject<boolean> = new Subject<boolean>();

    workflows: (WorkflowDto & { stepsCount?: number, createdAtFormatted?: string })[] = [];
    allWorkflows: (WorkflowDto & { stepsCount?: number, createdAtFormatted?: string })[] = [];
    totalRecords = 0;
    rows = 10;
    first = 0;
    searchQuery = '';

    constructor(
        private workflowService: WorkflowService,
        private messageService: MessageService,
        private router: Router
    ) {}

    ngOnInit(): void {
        this.fetchWorkflows(0, this.rows);
    }

    fetchWorkflows(page: number = 0, size: number = 10) {
        this.loading = true;
        this.searchQuery = '';
        this.workflowService
            .getAllWorkflows()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (res: any) => {
                    const content = Array.isArray(res) ? res : (res?.data?.content || []);
                    // Filtrer uniquement les workflows de type NON_CONFORMITE et PLAN_ACTION
                    this.workflows = content.filter((w: WorkflowDto) => w.resourceType === 'NON_CONFORMITE' || w.resourceType === 'PLAN_ACTION');
                    
                    this.allWorkflows = this.workflows.map((w: any) => ({
                        ...w,
                        stepsCount: w.steps?.length || 0,
                        createdAtFormatted: w.createdAt ? new Date(w.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'
                    }));
                    this.workflows = [...this.allWorkflows];
                    this.totalRecords = this.allWorkflows.length;
                    if (content.length === 0) {
                        this.workflows = [];
                        this.allWorkflows = [];
                        this.totalRecords = 0;
                    }
                    this.loading = false;
                },
                error: (err: any) => {
                    this.loading = false;
                    showToast(StatusEnum.error, err.status, 'Erreur lors du chargement des workflows', this.messageService, err);
                }
            });
    }

    onSearch(event: Event) {
        const query = (event.target as HTMLInputElement).value.toLowerCase();
        if (!query) {
            this.workflows = [...this.allWorkflows];
        } else {
            this.workflows = this.allWorkflows.filter(w =>
                (w.nom && w.nom.toLowerCase().includes(query)) ||
                (w.description && w.description.toLowerCase().includes(query))
            );
        }
    }

    loadWorkflows(event: any) {
        const page = (event.first || 0) / (event.rows || 10);
        const size = event.rows || 10;
        this.first = event.first || 0;
        this.rows = event.rows || 10;
        this.fetchWorkflows(page, size);
    }

    openNew() {
        this.router.navigate(['/configuration-workflow/non-conformite/new']);
    }

    editWorkflow(workflow: WorkflowDto) {
        this.router.navigate(['/configuration-workflow/non-conformite/edit', workflow.id]);
    }

    viewWorkflow(workflow: WorkflowDto) {
        this.router.navigate(['/configuration-workflow/non-conformite/detail', workflow.id]);
    }

    ngOnDestroy(): void {
        this.destroy$.next(true);
        this.destroy$.complete();
    }
}
