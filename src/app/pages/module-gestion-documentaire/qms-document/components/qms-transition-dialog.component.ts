import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgPrimeModule } from '../../../../../prime-ng.module';
import { DocumentQms } from '../../../../models/gestion-documentaire.model';

/** Décision de transition soumise par l'utilisateur. */
export interface TransitionDecision {
    nextStatus: string;
    reason: string;
}

/**
 * Changement de statut d'un document hors circuit de validation : nouveau statut et motif.
 *
 * <p>Le formulaire vit ici et seule la décision est remontée. Les statuts proposés sont fournis
 * par le parent, qui seul connaît les transitions ouvertes pour ce document.</p>
 */
@Component({
    selector: 'app-qms-transition-dialog',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, NgPrimeModule],
    templateUrl: './qms-transition-dialog.component.html'
})
export class QmsTransitionDialogComponent {
    @Input() document?: DocumentQms;
    @Input() transitionOptions: any[] = [];
    @Input() loading = false;

    @Input() statusLabel: (doc: DocumentQms) => string = () => '';
    @Input() statusSeverity: (doc: DocumentQms) => string = () => 'info';

    @Input()
    set visible(valeur: boolean) {
        if (valeur && !this._visible) {
            this.form.reset();
        }
        this._visible = valeur;
    }
    get visible(): boolean {
        return this._visible;
    }
    private _visible = false;

    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() confirm = new EventEmitter<TransitionDecision>();

    readonly form: FormGroup;

    constructor(private fb: FormBuilder) {
        this.form = this.fb.group({
            nextStatus: [null, Validators.required],
            reason: [null, Validators.required]
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
        this.confirm.emit(this.form.value as TransitionDecision);
    }
}
