import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { WorkflowService } from '@/app/services/workflow.service';
import { EmailTemplateDto } from '@/app/models/workflow.model';
import { finalize } from 'rxjs';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { EditorModule } from 'primeng/editor'; // for HTML body if desired, or simple textarea

@Component({
    selector: 'app-email-template-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, ButtonModule, InputTextModule, TextareaModule, EditorModule],
    templateUrl: './email-template-form.component.html'
})
export class EmailTemplateFormComponent implements OnInit {
    private readonly service = inject(WorkflowService);
    private readonly dialogRef = inject(DynamicDialogRef);
    private readonly config = inject(DynamicDialogConfig);
    private readonly fb = inject(FormBuilder);

    readonly isSaving = signal(false);
    readonly isEditMode = signal(false);
    private templateId: string | null = null;
    
    form = this.fb.group({
        id: [null as string | null],
        code: ['', Validators.required],
        subject: ['', Validators.required],
        body: ['', Validators.required],
        description: ['']
    });

    ngOnInit(): void {
        const item = this.config.data as EmailTemplateDto;
        if (item && item.id) {
            this.templateId = item.id;
            this.isEditMode.set(true);
            this.form.patchValue(item);
            // Disable code field if editing to prevent breaking links, or allow it based on requirements
            // this.form.get('code')?.disable(); 
        }
    }

    onSave(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        this.isSaving.set(true);
        const payload = this.form.getRawValue() as EmailTemplateDto;

        const request$ = this.isEditMode() && this.templateId != null 
            ? this.service.updateEmailTemplate(this.templateId, payload) 
            : this.service.createEmailTemplate(payload);

        request$.pipe(finalize(() => this.isSaving.set(false))).subscribe({
            next: (data) => {
                this.dialogRef.close(data);
            },
            error: () => {
                // Handle error
            }
        });
    }

    onCancel(): void {
        this.dialogRef.close();
    }
}
