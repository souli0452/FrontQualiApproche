import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { MessageService, ConfirmationService } from 'primeng/api';
import { NgPrimeModule } from '../../../../prime-ng.module';
import { InputTextarea } from 'primeng/inputtextarea';
import { AppCrudGenericComponent } from '../../../components/app-crud-generic/app-crud-generic.component';
import { TableColumn } from '../../../models/generique.model';
import { WorkflowStepTemplate } from '../../../models/gestion-documentaire.model';
import { WorkflowStepTemplateService } from '../../../services/module-gestion-documentaire/workflow-step-template.service';
import { AppRoleService } from '../../role/role-service/role.service';
import { showToast, StatusEnum } from '../../../utils/global/global-utils';

@Component({
    selector: 'app-workflow-step-template',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, NgPrimeModule, InputTextarea, AppCrudGenericComponent],
    providers: [MessageService, ConfirmationService],
    templateUrl: './workflow-step-template.component.html'
})
export class WorkflowStepTemplateComponent implements OnInit, OnDestroy {
    loading = true;
    destroy$: Subject<boolean> = new Subject<boolean>();

    templates: WorkflowStepTemplate[] = [];
    rolesList: any[] = [];

    tableCols: TableColumn[] = [
        { field: 'nomEtape', header: "Nom de l'étape", type: 'string', filter: true },
        { field: 'responsableRoleLabel', header: 'Rôle responsable', type: 'string', filter: true },
        { field: 'description', header: 'Description', type: 'string', filter: false },

    ];

    customButtons = [
        { label: 'Modifier', icon: 'pi pi-pencil', action: 'edit' },
        { label: 'Supprimer', icon: 'pi pi-trash', action: 'delete' }
    ];

    showDialog = false;
    templateForm: FormGroup;
    isEditMode = false;
    editingId?: string;

    constructor(
        private fb: FormBuilder,
        private stepTemplateService: WorkflowStepTemplateService,
        private roleService: AppRoleService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService
    ) {
        this.templateForm = this.fb.group({
            nomEtape: [null, Validators.required],
            responsableRole: [null, Validators.required],
            description: [null]
        });
    }

    ngOnInit(): void {
        this.fetchTemplates();
        this.fetchRoles();
    }

    getRoleLabel(roleIdOrName: string | undefined | null): string {
        if (!roleIdOrName) return '';
        const role = this.rolesList.find(r => r.value === roleIdOrName || r.label === roleIdOrName);
        return role ? role.label : roleIdOrName;
    }

    fetchRoles() {
        this.roleService
            .getAllRoles(0, 1000000)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (res) => {
                    if (res && res.data && res.data.content) {
                        this.rolesList = res.data.content.map((r: any) => ({
                            label: r.name || r.code || r.libelle || r.id,
                            value: r.id
                        }));
                        this.templates = this.templates.map(t => ({
                            ...t,
                            responsableRoleLabel: this.getRoleLabel(t.responsableRole)
                        }));
                    }
                },
                error: () => {
                    console.warn('Impossible de charger la liste des rôles/permissions.');
                }
            });
    }

    fetchTemplates() {
        this.loading = true;
        this.stepTemplateService
            .getAll()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (res) => {
                    this.templates = (res || []).map((t) => ({
                        ...t,
                        responsableRoleLabel: this.getRoleLabel(t.responsableRole),
                        createdAtFormatted: t.createdAt ? new Date(t.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'
                    } as any));
                    this.loading = false;
                },
                error: (err) => {
                    this.loading = false;
                    showToast(StatusEnum.error, err.status, 'Erreur lors du chargement des étapes', this.messageService, err);
                }
            });
    }

    handleCustomAction(event: { action: string; user: any }) {
        const template = event.user;
        if (event.action === 'edit') {
            this.editTemplate(template);
        } else if (event.action === 'delete') {
            this.deleteTemplate(template);
        }
    }

    openNew() {
        this.isEditMode = false;
        this.editingId = undefined;
        this.templateForm.reset();
        this.showDialog = true;
    }

    editTemplate(template: WorkflowStepTemplate) {
        this.isEditMode = true;
        this.editingId = template.id;
        this.templateForm.patchValue({
            nomEtape: template.nomEtape,
            responsableRole: template.responsableRole,
            description: template.description
        });
        this.showDialog = true;
    }

    hideDialog() {
        this.showDialog = false;
    }

    saveTemplate() {
        if (this.templateForm.invalid) {
            this.messageService.add({ severity: 'warn', summary: 'Erreur', detail: 'Veuillez remplir tous les champs obligatoires' });
            return;
        }

        const payload: WorkflowStepTemplate = this.templateForm.value;
        this.loading = true;

        const request = this.isEditMode && this.editingId
            ? this.stepTemplateService.update(this.editingId, payload)
            : this.stepTemplateService.create(payload);

        request.pipe(takeUntil(this.destroy$)).subscribe({
            next: () => {
                this.messageService.add({ severity: 'success', summary: 'Succès', detail: this.isEditMode ? 'Étape mise à jour' : 'Étape créée' });
                this.hideDialog();
                this.fetchTemplates();
            },
            error: (err) => {
                this.loading = false;
                showToast(StatusEnum.error, err.status, "Erreur lors de l'enregistrement", this.messageService, err);
            }
        });
    }

    deleteTemplate(template: WorkflowStepTemplate) {
        this.confirmationService.confirm({
            message: 'Voulez-vous vraiment supprimer cette étape du catalogue ?',
            header: 'Confirmation',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                this.loading = true;
                this.stepTemplateService
                    .delete(template.id!)
                    .pipe(takeUntil(this.destroy$))
                    .subscribe({
                        next: () => {
                            this.messageService.add({ severity: 'success', summary: 'Succès', detail: 'Étape supprimée' });
                            this.fetchTemplates();
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
