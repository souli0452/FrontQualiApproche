import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgPrimeModule } from '../../../../../prime-ng.module';
import { DocumentQms } from '../../../../models/gestion-documentaire.model';
import { WorkflowActionDto } from '../../../../models/workflow.model';

/**
 * Confirmation d'une décision de circuit : commentaire motivant l'action choisie.
 *
 * <p>Le formulaire est construit et validé ici, et seule la valeur saisie est remontée : le
 * parent n'a plus à détenir un {@code FormGroup} pour un dialogue qu'il ne fait qu'ouvrir. Il
 * est remis à zéro à chaque ouverture, pour qu'un commentaire précédent ne réapparaisse pas.</p>
 */
@Component({
    selector: 'app-qms-workflow-decision-dialog',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, NgPrimeModule],
    templateUrl: './qms-workflow-decision-dialog.component.html'
})
export class QmsWorkflowDecisionDialogComponent {
    @Input() document?: DocumentQms;
    @Input() action?: WorkflowActionDto;
    @Input() loading = false;

    @Input()
    set visible(valeur: boolean) {
        if (valeur && !this._visible) {
            this.form.reset({ comments: '' });
        }
        this._visible = valeur;
    }
    get visible(): boolean {
        return this._visible;
    }
    private _visible = false;

    @Output() visibleChange = new EventEmitter<boolean>();
    /** Décision confirmée : porte le commentaire saisi. */
    @Output() confirm = new EventEmitter<string>();

    readonly form: FormGroup;

    constructor(private fb: FormBuilder) {
        this.form = this.fb.group({
            comments: ['', Validators.required]
        });
    }

    fermer(): void {
        this.visible = false;
        this.visibleChange.emit(false);
    }

    valider(): void {
        if (this.form.invalid) {
            return;
        }
        this.confirm.emit(this.form.value.comments);
    }
}
