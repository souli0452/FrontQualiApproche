import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgPrimeModule } from '../../../../../prime-ng.module';
import { DocumentQms, DocumentWorkflow } from '../../../../models/gestion-documentaire.model';

/**
 * Assignation d'un circuit de validation à un document, avec aperçu de ses étapes.
 *
 * <p>Le formulaire et l'aperçu sont gérés ici : sélectionner un circuit en affiche les étapes
 * dans l'ordre, sans que le parent ait à maintenir un état d'aperçu qui ne sert qu'à ce
 * dialogue. Seul l'identifiant retenu est remonté.</p>
 */
@Component({
    selector: 'app-qms-assign-workflow-dialog',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, NgPrimeModule],
    templateUrl: './qms-assign-workflow-dialog.component.html'
})
export class QmsAssignWorkflowDialogComponent {
    @Input() document?: DocumentQms;
    @Input() availableWorkflows: DocumentWorkflow[] = [];
    @Input() loading = false;

    @Input() statusLabel: (doc: DocumentQms) => string = () => '';
    @Input() statusSeverity: (doc: DocumentQms) => string = () => 'info';

    @Input()
    set visible(valeur: boolean) {
        if (valeur && !this._visible) {
            this.form.reset();
            this.apercu = undefined;
        }
        this._visible = valeur;
    }
    get visible(): boolean {
        return this._visible;
    }
    private _visible = false;

    @Output() visibleChange = new EventEmitter<boolean>();
    /** Circuit retenu : porte son identifiant. */
    @Output() confirm = new EventEmitter<string>();

    readonly form: FormGroup;
    /** Circuit sélectionné, étapes triées, pour l'aperçu. */
    apercu?: DocumentWorkflow;

    constructor(private fb: FormBuilder) {
        this.form = this.fb.group({
            workflowId: [null, Validators.required]
        });
    }

    onWorkflowSelected(workflowId: string): void {
        const circuit = this.availableWorkflows.find(w => w.id === workflowId);
        this.apercu = circuit
            ? { ...circuit, steps: [...(circuit.steps || [])].sort((a, b) => a.stepOrder - b.stepOrder) }
            : undefined;
    }

    fermer(): void {
        this.visible = false;
        this.visibleChange.emit(false);
    }

    valider(): void {
        if (this.form.invalid) {
            return;
        }
        this.confirm.emit(this.form.value.workflowId);
    }
}
