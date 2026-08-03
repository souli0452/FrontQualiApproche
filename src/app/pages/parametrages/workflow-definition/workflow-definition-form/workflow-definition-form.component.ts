import { Component, inject, OnInit, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { WorkflowService } from '@/app/services/workflow.service';
import { WorkflowDto, WorkflowStepDto, WorkflowStepFieldDto, WorkflowTransitionDto, EmailTemplateDto } from '@/app/models/workflow.model';
import { finalize } from 'rxjs';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { DropdownModule } from 'primeng/dropdown';
import { AccordionModule } from 'primeng/accordion';
import { TableModule } from 'primeng/table';
import { CheckboxModule } from 'primeng/checkbox';
import { TagModule } from 'primeng/tag';
import { InputNumberModule } from 'primeng/inputnumber';

@Component({
    selector: 'app-workflow-definition-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, ButtonModule, InputTextModule, TextareaModule, DropdownModule, AccordionModule, TableModule, CheckboxModule, TagModule, InputNumberModule],
    templateUrl: './workflow-definition-form.component.html',
    styleUrl: './workflow-definition-form.component.scss'
})
export class WorkflowDefinitionFormComponent implements OnInit {
    private readonly service = inject(WorkflowService);
    private readonly dialogRef = inject(DynamicDialogRef);
    private readonly config = inject(DynamicDialogConfig);
    private readonly fb = inject(FormBuilder);

    readonly isSaving = signal(false);
    readonly isEditMode = signal(false);
    private workflowId: string | null = null;
    
    emailTemplateOptions = signal<{label: string, value: string}[]>([]);

    resourceTypes = [
        { label: 'Non Conformité', value: 'NON_CONFORMITE' },
        { label: 'Plan d\'Action', value: 'PLAN_ACTION' }
    ];

    fieldTypes = [
        { label: 'Texte', value: 'TEXT' },
        { label: 'Nombre', value: 'NUMBER' },
        { label: 'Date', value: 'DATE' },
        { label: 'Booléen', value: 'BOOLEAN' },
        { label: 'Liste', value: 'SELECT' }
    ];

    decisions = [
        { label: 'Approuvé', value: 'APPROUVE' },
        { label: 'Rejeté', value: 'REJETE' },
        { label: 'À Corriger', value: 'A_CORRIGER' },
        { label: 'Clôturé', value: 'CLOTURE' }
    ];

    form = this.fb.group({
        id: [null as string | null],
        nom: ['', Validators.required],
        description: [''],
        resourceType: ['', Validators.required],
        steps: this.fb.array([])
    });

    ngOnInit(): void {
        this.loadEmailTemplates();
        const item = this.config.data as WorkflowDto;

        if (item && item.id) {
            this.workflowId = item.id;
            this.isEditMode.set(true);
            this.patchForm(item);
        } else {
            // Default step for new workflow
            this.addStep();
        }
    }

    loadEmailTemplates(): void {
        this.service.getAllEmailTemplates().subscribe({
            next: (res) => {
                const templates: EmailTemplateDto[] = (res as any).data?.content || (res as any).data || res || [];
                const options = templates.map(t => ({
                    label: `${t.code} - ${t.subject}`,
                    value: t.code
                }));
                // Prepend an empty option
                options.unshift({ label: 'Aucun modèle (Pas d\'email)', value: '' });
                this.emailTemplateOptions.set(options);
            }
        });
    }

    get steps(): FormArray {
        return this.form.get('steps') as FormArray;
    }

    stepFields(stepIndex: number): FormArray {
        return this.steps.at(stepIndex).get('fields') as FormArray;
    }

    stepTransitions(stepIndex: number): FormArray {
        return this.steps.at(stepIndex).get('transitions') as FormArray;
    }

    stepOptions() {
        return this.steps.controls.map(c => {
            return { label: c.get('nomEtape')?.value || 'Nouvelle Étape', value: c.get('nomEtape')?.value };
        }).filter(c => c.value);
    }

    addStep() {
        const stepForm = this.fb.group({
            id: [null as string | null],
            nomEtape: ['', Validators.required],
            stepOrder: [this.steps.length + 1, Validators.required],
            responsableRole: [''],
            description: [''],
            emailTemplateCode: [''],
            fields: this.fb.array([]),
            transitions: this.fb.array([])
        });
        this.steps.push(stepForm);
    }

    removeStep(index: number) {
        this.steps.removeAt(index);
    }

    addField(stepIndex: number) {
        const fieldForm = this.fb.group({
            id: [null as string | null],
            fieldName: ['', Validators.required],
            fieldLabel: ['', Validators.required],
            type: ['TEXT', Validators.required],
            required: [false],
            options: ['']
        });
        this.stepFields(stepIndex).push(fieldForm);
    }

    removeField(stepIndex: number, fieldIndex: number) {
        this.stepFields(stepIndex).removeAt(fieldIndex);
    }

    addTransition(stepIndex: number) {
        const transForm = this.fb.group({
            id: [null as string | null],
            label: ['', Validators.required],
            decision: ['APPROUVE', Validators.required],
            requiredRole: [''],
            toStepId: [null as string | null],
            toStepName: [null as string | null]
        });
        this.stepTransitions(stepIndex).push(transForm);
    }

    removeTransition(stepIndex: number, transIndex: number) {
        this.stepTransitions(stepIndex).removeAt(transIndex);
    }

    private patchForm(item: WorkflowDto) {
        this.form.patchValue({
            id: item.id,
            nom: item.nom,
            description: item.description,
            resourceType: item.resourceType
        });

        if (item.steps) {
            item.steps.sort((a, b) => a.stepOrder - b.stepOrder).forEach(step => {
                const stepForm = this.fb.group({
                    id: [step.id],
                    nomEtape: [step.nomEtape, Validators.required],
                    stepOrder: [step.stepOrder, Validators.required],
                    responsableRole: [step.responsableRole],
                    description: [step.description],
                    emailTemplateCode: [step.emailTemplateCode],
                    fields: this.fb.array([]),
                    transitions: this.fb.array([])
                });

                if (step.fields) {
                    step.fields.forEach(field => {
                        (stepForm.get('fields') as FormArray).push(this.fb.group({
                            id: [field.id],
                            fieldName: [field.fieldName, Validators.required],
                            fieldLabel: [field.fieldLabel, Validators.required],
                            type: [field.type, Validators.required],
                            required: [field.required],
                            options: [field.options]
                        }));
                    });
                }

                if (step.transitions) {
                    step.transitions.forEach(trans => {
                        (stepForm.get('transitions') as FormArray).push(this.fb.group({
                            id: [trans.id],
                            label: [trans.label, Validators.required],
                            decision: [trans.decision, Validators.required],
                            requiredRole: [trans.requiredRole],
                            toStepId: [trans.toStepId],
                            toStepName: [trans.toStepName]
                        }));
                    });
                }

                this.steps.push(stepForm);
            });
        }
    }

    onSave(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        this.isSaving.set(true);
        const payload = this.form.value as WorkflowDto;
        
        // Ensure toStepName is set correctly to allow backend mapping
        payload.steps?.forEach(step => {
            step.transitions?.forEach(t => {
                if (!t.toStepId && !t.toStepName) {
                    // if it's bound by the dropdown
                }
            });
        });

        const request$ = this.isEditMode() && this.workflowId != null 
            ? this.service.updateWorkflow(this.workflowId, payload) 
            : this.service.createWorkflow(payload);

        request$.pipe(finalize(() => this.isSaving.set(false))).subscribe({
            next: (data) => {
                this.dialogRef.close(data);
            },
            error: () => {
                // error handling handled by interceptor or component
            }
        });
    }

    onCancel(): void {
        this.dialogRef.close();
    }
}

