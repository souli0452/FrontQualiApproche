import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subject, takeUntil } from 'rxjs';
import { WorkflowService } from '../../../../services/workflow.service';
import { AppRoleService } from '../../../role/role-service/role.service';
import { WorkflowDto, EmailTemplateDto } from '../../../../models/workflow.model';
import { showToast, StatusEnum } from '../../../../utils/global/global-utils';
import { NgPrimeModule } from '../../../../../prime-ng.module';

function generateClientId(): string {
    return Math.random().toString(36).substring(2, 9);
}

@Component({
  selector: 'app-nc-workflow-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgPrimeModule],
  providers: [MessageService],
  templateUrl: './nc-workflow-form.component.html',
})
export class NcWorkflowFormComponent implements OnInit, OnDestroy {
    workflowForm!: FormGroup;
    isEditMode = false;
    loading = false;
    editingId?: string;
    rolesList: any[] = [];
    emailTemplates: EmailTemplateDto[] = [];
    destroy$: Subject<boolean> = new Subject<boolean>();
    private targetOptionsCache = new Map<number, any[]>();

    constructor(
        private fb: FormBuilder,
        private workflowService: WorkflowService,
        private roleService: AppRoleService,
        private messageService: MessageService,
        private route: ActivatedRoute,
        private router: Router
    ) {
        this.initForm();
    }

    ngOnInit(): void {
        this.fetchRoles();
        this.fetchEmailTemplates();
        
        this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
            const id = params['id'];
            if (id) {
                this.isEditMode = true;
                this.editingId = id;
                this.loadWorkflow(id);
            } else {
                this.isEditMode = false;
                this.addStep(); // Default step for creation
            }
        });
    }

    initForm() {
        this.workflowForm = this.fb.group({
            nom: ['', Validators.required],
            description: [''],
            steps: this.fb.array([])
        });
    }

    get stepsFormArray(): FormArray {
        return this.workflowForm.get('steps') as FormArray;
    }

    fetchRoles() {
        this.roleService.getAllRoles(0, 1000).pipe(takeUntil(this.destroy$)).subscribe({
            next: (res: any) => {
                if (res?.data?.content) {
                    this.rolesList = res.data.content.map((r: any) => ({
                        label: r.name || r.code || r.id,
                        value: r.id
                    }));
                }
            }
        });
    }

    fetchEmailTemplates() {
        this.workflowService.getAllEmailTemplates().pipe(takeUntil(this.destroy$)).subscribe({
            next: (res: any) => {
                const templates = Array.isArray(res) ? res : (res?.data?.content || []);
                this.emailTemplates = templates;
            },
            error: (err) => console.error('Erreur lors du chargement des templates d\'emails', err)
        });
    }

    loadWorkflow(id: string) {
        this.loading = true;
        // The endpoint is actually /workflows/all for list, but let's fetch all and find it since there is no getById yet
        this.workflowService.getAllWorkflows().pipe(takeUntil(this.destroy$)).subscribe({
            next: (res: any) => {
                const content = Array.isArray(res) ? res : (res?.data?.content || []);
                const workflow = content.find((w: WorkflowDto) => w.id?.toString() === id?.toString());
                if (workflow) {
                    this.patchWorkflowForm(workflow);
                } else {
                    showToast(StatusEnum.error, 404, 'Workflow introuvable', this.messageService);
                    this.goBack();
                }
                this.loading = false;
            },
            error: (err: any) => {
                this.loading = false;
                showToast(StatusEnum.error, err.status, 'Impossible de charger les données du workflow', this.messageService, err);
                this.goBack();
            }
        });
    }

    patchWorkflowForm(workflow: WorkflowDto) {
        this.targetOptionsCache.clear();
        this.workflowForm.patchValue({
            nom: workflow.nom,
            description: workflow.description
        });

        this.stepsFormArray.clear();
        if (workflow.steps && workflow.steps.length > 0) {
            const sortedSteps = [...workflow.steps].sort((a, b) => a.stepOrder - b.stepOrder);
            // Les cibles de transition sont désignées par code d'étape : c'est la seule clé
            // stable. L'ancien rapprochement utilisait `toStepId` comme s'il s'agissait d'un rang
            // d'étape, deux notions différentes, et perdait donc la cible dès qu'elles divergeaient.
            const clientIdByCode = new Map<string, string>();
            const stepClientIds = sortedSteps.map((step: any) => {
                const clientId = generateClientId();
                if (step.code) { clientIdByCode.set(step.code, clientId); }
                return clientId;
            });

            sortedSteps.forEach((step, idx) => {
                const approve = step.transitions?.find((t: any) => t.decision === 'APPROUVE');
                const reject = step.transitions?.find((t: any) => t.decision === 'REJETE');

                const defaultApproveTarget = idx + 1 < stepClientIds.length ? stepClientIds[idx + 1] : null;
                const defaultRejectTarget = idx > 0 ? stepClientIds[idx - 1] : null;

                const stepGroup = this.fb.group({
                    clientId: [stepClientIds[idx]],
                    id: [step.id],
                    // Code fonctionnel de l'étape : immuable une fois l'étape créée, il est donc
                    // affiché en lecture seule. C'est lui qui identifie la cible des transitions.
                    code: [{ value: step.code, disabled: true }],
                    nomEtape: [step.nomEtape, Validators.required],
                    responsableRole: [step.responsableRole],
                    description: [step.description],
                    emailTemplateCode: [step.emailTemplateCode],
                    approveTarget: [approve ? (approve.toStepCode ? (clientIdByCode.get(approve.toStepCode) ?? null) : null) : defaultApproveTarget],
                    approveRole: [approve?.requiredRole ?? null],
                    approveLabel: [approve?.label ?? null],
                    rejectTarget: [reject ? (reject.toStepCode ? (clientIdByCode.get(reject.toStepCode) ?? null) : null) : defaultRejectTarget],
                    rejectRole: [reject?.requiredRole ?? null],
                    rejectLabel: [reject?.label ?? null],
                    fields: this.fb.array([])
                });

                if (step.fields && step.fields.length > 0) {
                    const fieldsArray = stepGroup.get('fields') as FormArray;
                    step.fields.forEach((field: any) => {
                        fieldsArray.push(this.fb.group({
                            id: [field.id],
                            fieldName: [field.fieldName, Validators.required],
                            fieldLabel: [field.fieldLabel, Validators.required],
                            type: [field.type || 'TEXT', Validators.required],
                            required: [field.required || false],
                            options: [field.options]
                        }));
                    });
                }
                
                this.stepsFormArray.push(stepGroup);
            });
        } else {
            this.addStep();
        }
    }

    addStep() {
        const lastStep = this.stepsFormArray.length > 0 ? this.stepsFormArray.at(this.stepsFormArray.length - 1) : null;
        const previousClientId = lastStep ? lastStep.get('clientId')?.value : null;

        const clientId = generateClientId();
        const stepGroup = this.fb.group({
            clientId: [clientId],
            id: [null],
            // Renseigné à la création uniquement ; laissé vide, le serveur le dérive du nom.
            code: ['', Validators.required],
            nomEtape: ['', Validators.required],
            responsableRole: [null],
            description: [''],
            emailTemplateCode: [null],
            approveTarget: [null],
            approveRole: [null],
            approveLabel: [''],
            rejectTarget: [previousClientId],
            rejectRole: [null],
            rejectLabel: [''],
            fields: this.fb.array([])
        });

        if (lastStep && !lastStep.get('approveTarget')?.value) {
            lastStep.get('approveTarget')?.setValue(clientId);
        }

        this.stepsFormArray.push(stepGroup);
        this.targetOptionsCache.clear();
    }

    removeStep(index: number) {
        this.stepsFormArray.removeAt(index);
        this.targetOptionsCache.clear();
    }

    getStepFields(stepIndex: number): FormArray {
        return this.stepsFormArray.at(stepIndex).get('fields') as FormArray;
    }

    addField(stepIndex: number) {
        const fields = this.getStepFields(stepIndex);
        fields.push(this.fb.group({
            id: [null],
            fieldName: ['', Validators.required],
            fieldLabel: ['', Validators.required],
            type: ['TEXT', Validators.required],
            required: [false],
            options: ['']
        }));
    }

    removeField(stepIndex: number, fieldIndex: number) {
        const fields = this.getStepFields(stepIndex);
        fields.removeAt(fieldIndex);
    }

    getStepTargetOptions(currentIndex: number): any[] {
        if (this.targetOptionsCache.has(currentIndex)) {
            return this.targetOptionsCache.get(currentIndex)!;
        }

        const options = [];
        for (let i = 0; i < this.stepsFormArray.length; i++) {
            if (i !== currentIndex) {
                const step = this.stepsFormArray.at(i);
                options.push({
                    label: `Étape ${i + 1} : ${step.get('nomEtape')?.value || 'Nouvelle étape'}`,
                    value: step.get('clientId')?.value
                });
            }
        }
        
        this.targetOptionsCache.set(currentIndex, options);
        return options;
    }

    saveWorkflow() {
        if (this.workflowForm.invalid || this.stepsFormArray.length === 0) return;

        this.loading = true;
        const formValue = this.workflowForm.value;
        const stepsControls = this.stepsFormArray.controls;

        const orderByClientId = new Map<string, number>();
        stepsControls.forEach((ctrl, idx) => {
            orderByClientId.set(ctrl.get('clientId')?.value, idx + 1);
        });

        // Le code est lu sur le contrôle et non sur `.value` : à l'édition il est désactivé
        // (immuable) et serait donc absent de la valeur du formulaire.
        const codeDeControle = (ctrl: any): string | null => ctrl?.get('code')?.value || null;

        const getStepCodeByClientId = (clientId: string) => {
            const ctrl = stepsControls.find(c => c.get('clientId')?.value === clientId);
            return codeDeControle(ctrl);
        };

        const steps = stepsControls.map((ctrl, idx) => {
            const val = ctrl.value;
            const transitions = [];

            if (val.approveTarget) {
                transitions.push({
                    decision: 'APPROUVE',
                    toStepCode: getStepCodeByClientId(val.approveTarget),
                    requiredRole: val.approveRole,
                    label: val.approveLabel
                });
            } else if (idx + 1 < stepsControls.length) {
                transitions.push({
                    decision: 'APPROUVE',
                    toStepCode: codeDeControle(stepsControls[idx + 1]),
                    requiredRole: val.approveRole,
                    label: val.approveLabel
                });
            } else {
                transitions.push({
                    decision: 'APPROUVE',
                    toStepCode: null,
                    requiredRole: val.approveRole,
                    label: val.approveLabel
                });
            }

            if (val.rejectTarget) {
                transitions.push({
                    decision: 'REJETE',
                    toStepCode: getStepCodeByClientId(val.rejectTarget),
                    requiredRole: val.rejectRole,
                    label: val.rejectLabel
                });
            } else if (idx > 0) {
                transitions.push({
                    decision: 'REJETE',
                    toStepCode: codeDeControle(stepsControls[idx - 1]),
                    requiredRole: val.rejectRole,
                    label: val.rejectLabel
                });
            }

            return {
                id: val.id,
                code: codeDeControle(stepsControls[idx]),
                nomEtape: val.nomEtape,
                stepOrder: idx + 1,
                responsableRole: val.responsableRole,
                description: val.description,
                emailTemplateCode: val.emailTemplateCode,
                transitions: transitions,
                fields: val.fields
            };
        });

        const payload = {
            id: this.editingId,
            nom: formValue.nom,
            description: formValue.description,
            resourceType: 'NON_CONFORMITE', // Par défaut
            steps: steps
        };

        const saveObs = this.isEditMode
            ? this.workflowService.updateWorkflow(this.editingId!, payload)
            : this.workflowService.createWorkflow(payload);

        saveObs.pipe(takeUntil(this.destroy$)).subscribe({
            next: () => {
                this.loading = false;
                showToast(StatusEnum.success, 200, `Workflow ${this.isEditMode ? 'modifié' : 'créé'} avec succès`, this.messageService);
                this.goBack();
            },
            error: (err: any) => {
                this.loading = false;
                showToast(StatusEnum.error, err.status, err?.error?.message || 'Erreur lors de la sauvegarde du workflow', this.messageService, err);
            }
        });
    }

    goBack() {
        this.router.navigate(['/configuration-workflow/non-conformite']);
    }

    ngOnDestroy(): void {
        this.destroy$.next(true);
        this.destroy$.unsubscribe();
    }
}
