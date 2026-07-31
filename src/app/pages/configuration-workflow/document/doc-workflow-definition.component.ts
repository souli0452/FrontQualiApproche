import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import { MessageService, ConfirmationService } from 'primeng/api';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { TooltipModule } from 'primeng/tooltip';
import { ToolbarModule } from 'primeng/toolbar';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';

import { WorkflowService } from '../../../services/module-gestion-documentaire/workflow.service';
import { AuthService } from '../../../services/auth-services/auth.service';
import { AppRoleService } from '../../role/role-service/role.service';
import { WorkflowStepTemplateService } from '../../../services/module-gestion-documentaire/workflow-step-template.service';
import { QmsDocumentService } from '../../../services/module-gestion-documentaire/qms-document.service';

import { showToast, StatusEnum } from '../../../utils/global/global-utils';
import { DocumentWorkflow, WorkflowStep, WorkflowStepTemplate, WorkflowTransition, WorkflowDecision, QmsDocumentType } from '../../../models/gestion-documentaire.model';

function generateClientId(): string {
    return (crypto as any)?.randomUUID ? crypto.randomUUID() : `step-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

@Component({
  selector: 'app-doc-workflow-definition',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule, 
    TableModule, ButtonModule, InputTextModule, IconFieldModule, InputIconModule,
    TooltipModule, ToolbarModule, DialogModule, SelectModule, TextareaModule,
    ConfirmDialogModule, ToastModule, TagModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './doc-workflow-definition.component.html',
  styleUrl: './doc-workflow-definition.component.scss'
})
export class DocWorkflowDefinitionComponent implements OnInit, OnDestroy {
    loading: boolean = true;
    destroy$: Subject<boolean> = new Subject<boolean>();

    workflows: DocumentWorkflow[] = [];
    allWorkflows: DocumentWorkflow[] = [];
    rolesList: any[] = [];
    documentTypes: QmsDocumentType[] = [];
    stepTemplates: WorkflowStepTemplate[] = [];
    totalRecords = 0;
    rows = 10;
    first = 0;
    searchQuery = '';

    // Modale unifiée
    showDialog = false;
    workflowForm: FormGroup;
    isEditMode = false;
    editingId?: string;

    constructor(
        private fb: FormBuilder,
        private router: Router,
        private workflowService: WorkflowService,
        private qmsService: QmsDocumentService,
        private roleService: AppRoleService,
        private stepTemplateService: WorkflowStepTemplateService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService
    ) {
        this.workflowForm = this.fb.group({
            nom: [null, Validators.required],
            documentType: [null, Validators.required],
            description: [null],
            steps: this.fb.array([])
        });
    }

    ngOnInit(): void {
        this.fetchWorkflows(0, this.rows);
        this.fetchRoles();
        this.fetchDocumentTypes();
        this.fetchStepTemplates();
    }

    fetchStepTemplates() {
        this.stepTemplateService.getAll()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (res: any) => {
                    this.stepTemplates = res || [];
                },
                error: () => {
                    console.warn("Impossible de charger le catalogue d'étapes.");
                }
            });
    }

    onStepTemplateSelected(index: number, templateId: string): void {
        const template = this.stepTemplates.find(t => t.id === templateId);
        const group = this.stepsFormArray.at(index);
        if (!template || !group) return;
        group.get('nomEtape')?.setValue(template.nomEtape);
        group.get('responsableRole')?.setValue(template.responsableRole);
        this.targetOptionsCache.clear();
    }

    fetchDocumentTypes() {
        this.qmsService.typeDocumentQmsGetAll(0, 1000)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (res: any) => {
                    this.documentTypes = res.data?.content || [];
                },
                error: (err: any) => {
                    console.error('Erreur chargement types de document', err);
                }
            });
    }

    fetchRoles() {
        this.roleService
            .getAllRoles(0,1000000)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (res: any) => {
                    if (res && res.data && res.data.content) {
                        this.rolesList = res.data.content.map((r: any) => ({
                            label: r.name || r.code || r.libelle || r.id,
                            value: r.id
                        }));
                    }
                },
                error: () => {
                    console.warn('Impossible de charger la liste des rôles.');
                }
            });
    }

    getRoleLabel(roleIdOrName: string | undefined | null): string {
        if (!roleIdOrName) return '';
        const role = this.rolesList.find(r => r.value === roleIdOrName || r.label === roleIdOrName);
        return role ? role.label : roleIdOrName;
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
                    // Filtrer pour exclure les workflows de type NON_CONFORMITE et PLAN_ACTION (les autres étant documentaires)
                    this.workflows = content.filter((w: DocumentWorkflow) => w.resourceType !== 'NON_CONFORMITE' && w.resourceType !== 'PLAN_ACTION');
                    
                    this.allWorkflows = this.workflows.map((w: any) => ({
                        ...w,
                        stepsCount: w.steps?.length || 0,
                        createdAtFormatted: w.createdAt ? new Date(w.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'
                    }));
                    this.workflows = [...this.allWorkflows];
                    this.totalRecords = this.allWorkflows.length;
                    
                    if (this.workflows.length === 0) {
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

    viewWorkflowDetail(workflow: DocumentWorkflow) {
        if (workflow && workflow.id) {
            this.router.navigate(['/configuration-workflow/document/detail', workflow.id]);
        }
    }

    // --- Gestion du Formulaire ---
    get stepsFormArray() {
        return this.workflowForm.get('steps') as FormArray;
    }

    openNew() {
        this.targetOptionsCache.clear();
        this.isEditMode = false;
        this.editingId = undefined;
        this.workflowForm.reset();
        this.stepsFormArray.clear();
        this.addStep(); 
        this.showDialog = true;
    }

    editWorkflow(workflow: DocumentWorkflow) {
        this.targetOptionsCache.clear();
        this.isEditMode = true;
        this.editingId = workflow.id;
        this.workflowForm.patchValue({
            nom: workflow.nom,
            documentType: workflow.resourceType || workflow.documentType,
            description: workflow.description
        });

        this.stepsFormArray.clear();
        if (workflow.steps && workflow.steps.length > 0) {
            const sortedSteps = [...workflow.steps].sort((a, b) => a.stepOrder - b.stepOrder);
            const clientIdByStepOrder = new Map<number, string>();
            const stepClientIds = sortedSteps.map((step) => {
                const clientId = generateClientId();
                clientIdByStepOrder.set(step.stepOrder, clientId);
                return clientId;
            });

            sortedSteps.forEach((step, idx) => {
                const approve = step.transitions?.find((t: any) => t.decision === 'APPROUVE');
                const reject = step.transitions?.find((t: any) => t.decision === 'REJETE');

                const defaultApproveTarget = idx + 1 < stepClientIds.length ? stepClientIds[idx + 1] : null;
                const defaultRejectTarget = idx > 0 ? stepClientIds[idx - 1] : null;

                this.stepsFormArray.push(
                    this.fb.group({
                        clientId: [stepClientIds[idx]],
                        id: [step.id],
                        stepTemplateId: [step.stepTemplateId ?? null, Validators.required],
                        nomEtape: [{ value: step.nomEtape, disabled: true }],
                        responsableRole: [step.responsableRole],
                        description: [step.description],
                        approveTarget: [approve ? (approve.toStepOrder != null ? (clientIdByStepOrder.get(approve.toStepOrder) ?? null) : null) : defaultApproveTarget],
                        approveRole: [approve?.requiredRole ?? null],
                        approveLabel: [approve?.label ?? null],
                        rejectTarget: [reject ? (reject.toStepOrder != null ? (clientIdByStepOrder.get(reject.toStepOrder) ?? null) : null) : defaultRejectTarget],
                        rejectRole: [reject?.requiredRole ?? null],
                        rejectLabel: [reject?.label ?? null]
                    })
                );
            });
        } else {
            this.addStep();
        }
        this.showDialog = true;
    }

    addStep() {
        const lastStep = this.stepsFormArray.length > 0 ? this.stepsFormArray.at(this.stepsFormArray.length - 1) : null;
        const previousClientId = lastStep ? lastStep.get('clientId')?.value : null;

        this.stepsFormArray.push(
            this.fb.group({
                clientId: [generateClientId()],
                id: [null],
                stepTemplateId: [null, Validators.required],
                nomEtape: [{ value: null, disabled: true }],
                responsableRole: [null],
                description: [null],
                approveTarget: [null],
                approveRole: [null],
                approveLabel: [null],
                rejectTarget: [previousClientId],
                rejectRole: [null],
                rejectLabel: [null]
            })
        );
    }

    removeStep(index: number) {
        const removedClientId = this.stepsFormArray.at(index)?.get('clientId')?.value;
        this.stepsFormArray.removeAt(index);
        if (!removedClientId) return;

        this.stepsFormArray.controls.forEach((control) => {
            const approveTarget = control.get('approveTarget');
            const rejectTarget = control.get('rejectTarget');
            if (approveTarget && approveTarget.value === removedClientId) approveTarget.setValue(null);
            if (rejectTarget && rejectTarget.value === removedClientId) rejectTarget.setValue(null);
        });
    }

    private targetOptionsCache = new Map<string, { label: string; value: string }[]>();

    getStepTargetOptions(excludeIndex: number): { label: string; value: string }[] {
        const controls = this.stepsFormArray.controls;
        if (excludeIndex < 0 || excludeIndex >= controls.length) return [];

        const currentGroup = controls[excludeIndex];
        const currentTemplateId = currentGroup.get('stepTemplateId')?.value;

        const signature = controls
            .map((c, idx) => `${idx}:${c.get('clientId')?.value}:${c.get('stepTemplateId')?.value || ''}:${c.get('nomEtape')?.value || ''}`)
            .join('|') + `_ex:${excludeIndex}_tpl:${this.stepTemplates.length}`;

        if (this.targetOptionsCache.has(signature)) {
            return this.targetOptionsCache.get(signature)!;
        }

        const options: { label: string; value: string }[] = [];

        controls.forEach((control, idx) => {
            if (idx !== excludeIndex) {
                const nom = control.get('nomEtape')?.value || 'Étape sans nom';
                options.push({
                    label: `${idx + 1}. ${nom}`,
                    value: control.get('clientId')?.value
                });
            }
        });

        const existingTemplateIdsInCards = new Set<string>();
        controls.forEach(c => {
            const tId = c.get('stepTemplateId')?.value;
            if (tId) existingTemplateIdsInCards.add(tId);
        });

        this.stepTemplates.forEach(template => {
            if (template.id && template.id !== currentTemplateId && !existingTemplateIdsInCards.has(template.id)) {
                options.push({
                    label: `Catalogue : ${template.nomEtape}`,
                    value: `template:${template.id}`
                });
            }
        });

        if (this.targetOptionsCache.size > 100) {
            this.targetOptionsCache.clear();
        }

        this.targetOptionsCache.set(signature, options);
        return options;
    }

    onTargetSelected(index: number, type: 'approve' | 'reject', selectedValue: any): void {
        if (!selectedValue || typeof selectedValue !== 'string') return;

        if (selectedValue.startsWith('template:')) {
            const templateId = selectedValue.replace('template:', '');
            const template = this.stepTemplates.find(t => t.id === templateId);
            if (!template) return;

            let existingStepControl = this.stepsFormArray.controls.find(
                c => c.get('stepTemplateId')?.value === templateId
            );

            let targetClientId: string;

            if (existingStepControl) {
                targetClientId = existingStepControl.get('clientId')?.value;
            } else {
                targetClientId = this.addStepWithTemplate(template);
            }

            const currentGroup = this.stepsFormArray.at(index);
            if (currentGroup) {
                const targetControlName = type === 'approve' ? 'approveTarget' : 'rejectTarget';
                currentGroup.get(targetControlName)?.setValue(targetClientId);
            }

            this.targetOptionsCache.clear();
        }
    }

    addStepWithTemplate(template: WorkflowStepTemplate): string {
        const lastStep = this.stepsFormArray.length > 0 ? this.stepsFormArray.at(this.stepsFormArray.length - 1) : null;
        const previousClientId = lastStep ? lastStep.get('clientId')?.value : null;
        const newClientId = generateClientId();

        this.stepsFormArray.push(
            this.fb.group({
                clientId: [newClientId],
                id: [null],
                stepTemplateId: [template.id, Validators.required],
                nomEtape: [{ value: template.nomEtape, disabled: true }],
                responsableRole: [template.responsableRole],
                description: [template.description || null],
                approveTarget: [null],
                approveRole: [null],
                approveLabel: [null],
                rejectTarget: [previousClientId],
                rejectRole: [null],
                rejectLabel: [null]
            })
        );

        this.targetOptionsCache.clear();
        return newClientId;
    }

    hideDialog() {
        this.showDialog = false;
    }

    saveWorkflow() {
        if (this.workflowForm.invalid) {
            this.messageService.add({ severity: 'warn', summary: 'Erreur', detail: 'Veuillez remplir tous les champs obligatoires' });
            return;
        }

        const formValue = this.workflowForm.getRawValue();
        const steps: any[] = formValue.steps || [];

        if (steps.length === 0) {
            this.messageService.add({ severity: 'warn', summary: 'Erreur', detail: 'Le circuit doit contenir au moins une étape' });
            return;
        }

        const stepOrderByClientId = new Map<string, number>();
        steps.forEach((s, idx) => stepOrderByClientId.set(s.clientId, idx + 1));

        const buildTransition = (decision: WorkflowDecision, targetClientId: string | null, role: string | null, label: string | null): WorkflowTransition => ({
            decision,
            toStepOrder: targetClientId ? (stepOrderByClientId.get(targetClientId) ?? null) : null,
            requiredRole: role || null,
            label: label || null
        });

        const payload: DocumentWorkflow = {
            nom: formValue.nom,
            documentType: formValue.documentType,
            resourceType: formValue.documentType,
            description: formValue.description,
            steps: steps.map((s, idx) => ({
                id: s.id,
                stepTemplateId: s.stepTemplateId,
                nomEtape: s.nomEtape,
                responsableRole: s.responsableRole,
                description: s.description,
                stepOrder: idx + 1,
                transitions: [
                    buildTransition('APPROUVE', s.approveTarget, s.approveRole, s.approveLabel),
                    buildTransition('REJETE', s.rejectTarget, s.rejectRole, s.rejectLabel)
                ]
            }))
        };

        this.loading = true;
        if (this.isEditMode && this.editingId) {
            this.workflowService
                .updateWorkflow(this.editingId, payload)
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: () => {
                        this.messageService.add({ severity: 'success', summary: 'Succès', detail: 'Workflow mis à jour' });
                        this.hideDialog();
                        this.fetchWorkflows(this.first / this.rows, this.rows);
                    },
                    error: (err: any) => {
                        this.loading = false;
                        showToast(StatusEnum.error, err.status, 'Erreur lors de la mise à jour', this.messageService, err);
                    }
                });
        } else {
            this.workflowService
                .createWorkflow(payload)
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: () => {
                        this.messageService.add({ severity: 'success', summary: 'Succès', detail: 'Workflow créé' });
                        this.hideDialog();
                        this.fetchWorkflows(this.first / this.rows, this.rows);
                    },
                    error: (err: any) => {
                        this.loading = false;
                        showToast(StatusEnum.error, err.status, 'Erreur lors de la création', this.messageService, err);
                    }
                });
        }
    }

    deleteWorkflow(workflow: DocumentWorkflow) {
        this.confirmationService.confirm({
            message: 'Voulez-vous vraiment supprimer ce circuit de validation ?',
            header: 'Confirmation',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                this.loading = true;
                this.workflowService
                    .deleteWorkflow(workflow.id!)
                    .pipe(takeUntil(this.destroy$))
                    .subscribe({
                        next: () => {
                            this.messageService.add({ severity: 'success', summary: 'Succès', detail: 'Workflow supprimé' });
                            this.fetchWorkflows(this.first / this.rows, this.rows);
                        },
                        error: (err: any) => {
                            this.loading = false;
                            showToast(StatusEnum.error, err.status, 'Erreur lors de la suppression', this.messageService, err);
                        }
                    });
            }
        });
    }

    getDocTypeLabel(resourceType: string | undefined): string {
        if (!resourceType) return '';
        if (!this.documentTypes || this.documentTypes.length === 0) return resourceType;
        const dt = this.documentTypes.find(d => d.code === resourceType);
        return dt ? dt.libelle : resourceType;
    }

    ngOnDestroy(): void {
        this.destroy$.next(true);
        this.destroy$.unsubscribe();
    }
}
