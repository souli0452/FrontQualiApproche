import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MessageService, ConfirmationService } from 'primeng/api';
import { WorkflowService } from '../../../services/module-gestion-documentaire/workflow.service';
import { AuthService } from '../../../services/auth-services/auth.service';
import { showToast, StatusEnum } from '../../../utils/global/global-utils';
import { DocumentWorkflow, WorkflowStep, QmsDocumentType } from '../../../models/gestion-documentaire.model';
import { NgPrimeModule } from '../../../../prime-ng.module';
import { InputTextarea } from 'primeng/inputtextarea';
import { AppRoleService, RoleService } from '../../role/role-service/role.service';
import { AppCrudGenericComponent } from '../../../components/app-crud-generic/app-crud-generic.component';
import { TableColumn } from '../../../models/generique.model';
import { QmsDocumentService } from '../../../services/module-gestion-documentaire/qms-document.service';

@Component({
    selector: 'app-workflow-config',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, FormsModule, NgPrimeModule, InputTextarea, AppCrudGenericComponent],

    providers: [MessageService, ConfirmationService],
    templateUrl: './workflow-config.component.html'
})
export class WorkflowConfigComponent implements OnInit, OnDestroy {
    loading: boolean = true;
    destroy$: Subject<boolean> = new Subject<boolean>();

    workflows: DocumentWorkflow[] = [];
    allWorkflows: DocumentWorkflow[] = [];
    rolesList: any[] = [];
    documentTypes: QmsDocumentType[] = [];
    totalRecords = 0;
    rows = 10;
    first = 0;
    searchQuery = '';

    tableCols: TableColumn[] = [
        { field: 'nom', header: 'Nom', type: 'string', filter: true },
        { field: 'documentType', header: 'Type de document', type: 'string', filter: true },
        { field: 'stepsCount', header: 'Nombre d\'étapes', type: 'string', filter: true },
        { field: 'createdAtFormatted', header: 'Date de création', type: 'string', filter: true }
    ];

    customButtons = [
        { label: 'Détails', icon: 'pi pi-eye', action: 'detail' },
        { label: 'Modifier', icon: 'pi pi-pencil', action: 'edit' },
        { label: 'Supprimer', icon: 'pi pi-trash', action: 'delete' }
    ];

    // Modale unifiée
    showDialog = false;
    workflowForm: FormGroup;
    isEditMode = false;
    editingId?: string;

    // Modale de Détail
    showDetailDialog = false;
    selectedWorkflow?: DocumentWorkflow;

    constructor(
        private fb: FormBuilder,
        private workflowService: WorkflowService,
        private qmsService: QmsDocumentService,
        private authService: AuthService,
        private roleService: AppRoleService,
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
                next: (res) => {

                    if (res) {
                        // Normalise la liste pour le dropdown
                        this.rolesList = res.data.content.map((r: any) => ({
                            label: r.name,
                            value: r.id
                        }));
                    }
                },
                error: () => {
                    console.warn('Impossible de charger la liste des rôles/permissions.');
                }
            });
    }

    fetchWorkflows(page: number = 0, size: number = 10) {
        this.loading = true;
        this.searchQuery = '';
        this.workflowService
            .getWorkflowsPage(page, size)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (res) => {
                    console.log('workflow-config.component: fetchWorkflows received res:', res);
                    if (res && res.data) {
                        const content = res.data.content || [];
                        this.allWorkflows = content.map((w) => ({
                            ...w,
                            stepsCount: `<span class="p-tag p-tag-info font-semibold">${w.steps?.length || 0} étape(s)</span>`,
                            createdAtFormatted: w.createdAt ? new Date(w.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'
                        }));
                        this.workflows = [...this.allWorkflows];
                        this.totalRecords = res.data.totalElements || 0;
                    } else {
                        this.workflows = [];
                        this.allWorkflows = [];
                        this.totalRecords = 0;
                    }
                    console.log('workflow-config.component: workflows assigned:', this.workflows);
                    this.loading = false;
                },
                error: (err) => {
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
        const page = event.first / event.rows;
        const size = event.rows;
        this.first = event.first;
        this.rows = event.rows;
        this.fetchWorkflows(page, size);
    }

    onPageChange(event: { page: number, size: number }) {
        this.first = event.page * event.size;
        this.rows = event.size;
        this.fetchWorkflows(event.page, event.size);
    }

    handleCustomAction(event: { action: string; user: any }) {
        const workflow = event.user;
        if (event.action === 'detail') {
            this.viewWorkflowDetail(workflow);
        } else if (event.action === 'edit') {
            this.editWorkflow(workflow);
        } else if (event.action === 'delete') {
            this.deleteWorkflow(workflow);
        }
    }

    viewWorkflowDetail(workflow: DocumentWorkflow) {
        this.selectedWorkflow = workflow;
        this.showDetailDialog = true;
    }

    getSortedSteps(steps: WorkflowStep[] | undefined): WorkflowStep[] {
        if (!steps) return [];
        return [...steps].sort((a, b) => a.stepOrder - b.stepOrder);
    }

    // --- Gestion du Formulaire ---

    get stepsFormArray() {
        return this.workflowForm.get('steps') as FormArray;
    }

    openNew() {
        this.isEditMode = false;
        this.editingId = undefined;
        this.workflowForm.reset();
        this.stepsFormArray.clear();
        this.addStep(); // On ajoute une étape par défaut
        this.showDialog = true;
    }

    editWorkflow(workflow: DocumentWorkflow) {
        this.isEditMode = true;
        this.editingId = workflow.id;
        this.workflowForm.patchValue({
            nom: workflow.nom,
            documentType: workflow.documentType,
            description: workflow.description
        });

        this.stepsFormArray.clear();
        if (workflow.steps && workflow.steps.length > 0) {
            const sortedSteps = [...workflow.steps].sort((a, b) => a.stepOrder - b.stepOrder);
            sortedSteps.forEach((step) => {
                this.stepsFormArray.push(
                    this.fb.group({
                        id: [step.id],
                        nomEtape: [step.nomEtape, Validators.required],
                        responsableRole: [step.responsableRole, Validators.required],
                        description: [step.description]
                    })
                );
            });
        } else {
            this.addStep();
        }
        this.showDialog = true;
    }

    addStep() {
        this.stepsFormArray.push(
            this.fb.group({
                id: [null],
                nomEtape: [null, Validators.required],
                responsableRole: [null, Validators.required],
                description: [null]
            })
        );
    }

    removeStep(index: number) {
        this.stepsFormArray.removeAt(index);
    }

    hideDialog() {
        this.showDialog = false;
    }

    saveWorkflow() {
        if (this.workflowForm.invalid) {
            this.messageService.add({ severity: 'warn', summary: 'Erreur', detail: 'Veuillez remplir tous les champs obligatoires' });
            return;
        }

        const formValue = this.workflowForm.value;
        const payload: DocumentWorkflow = {
            nom: formValue.nom,
            documentType: formValue.documentType,
            description: formValue.description,
            steps: formValue.steps.map((s: any, idx: number) => ({
                ...s,
                stepOrder: idx + 1
            }))
        };

        // Au moins une étape
        if (!payload.steps || payload.steps.length === 0) {
            this.messageService.add({ severity: 'warn', summary: 'Erreur', detail: 'Le circuit doit contenir au moins une étape' });
            return;
        }

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
                    error: (err) => {
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
                    error: (err) => {
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
                        error: (err) => {
                            this.loading = false;
                            showToast(StatusEnum.error, err.status, 'Erreur lors de la suppression', this.messageService, err);
                        }
                    });
            }
        });
    }

    ngOnDestroy(): void {
        this.destroy$.next(true);
        this.destroy$.unsubscribe();
    }
}
