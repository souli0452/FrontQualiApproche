import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgPrimeModule } from '../../../../../prime-ng.module';
import { DocumentQms } from '../../../../models/gestion-documentaire.model';
import { WorkflowActionDto, WorkflowStepFieldDto } from '../../../../models/workflow.model';

/** Décision confirmée : commentaire et valeurs saisies, prêtes pour l'appel au serveur. */
export interface DecisionConfirmee {
  comments: string;
  /** Valeurs indexées par identifiant de champ, comme les attend le serveur. */
  fields: Record<number, string>;
}

/**
 * Confirmation d'une décision de circuit : commentaire, et champs exigés par l'étape.
 *
 * <p>Le dialogue ne demandait qu'un commentaire. Or une étape peut exiger d'autres saisies, que
 * le serveur refuse de laisser passer : la décision partait, revenait en 400 « Champ(s)
 * obligatoire(s) non renseigné(s) : … », et l'utilisateur n'avait aucun moyen de les fournir
 * depuis cet écran. Les champs déclarés par l'étape courante sont donc construits ici, à partir
 * de {@code currentStepFields}.</p>
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

  /** Champs déclarés par l'étape courante du circuit. */
  @Input()
  set stepFields(champs: WorkflowStepFieldDto[] | undefined) {
    this._stepFields = champs ?? [];
    this.reconstruireFormulaire();
  }
  get stepFields(): WorkflowStepFieldDto[] {
    return this._stepFields;
  }
  private _stepFields: WorkflowStepFieldDto[] = [];

  @Input()
  set visible(valeur: boolean) {
    if (valeur && !this._visible) {
      this.reconstruireFormulaire();
    }
    this._visible = valeur;
  }
  get visible(): boolean {
    return this._visible;
  }
  private _visible = false;

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() confirm = new EventEmitter<DecisionConfirmee>();

  form: FormGroup;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({ comments: ['', Validators.required] });
  }

  /**
   * Reconstruit le formulaire à l'ouverture et à chaque changement d'étape.
   *
   * <p>Reconstruit plutôt que remis à zéro : les champs varient d'une étape à l'autre, et
   * conserver ceux de la précédente ferait saisir des valeurs qui ne seraient pas envoyées.</p>
   */
  private reconstruireFormulaire(): void {
    const controles: Record<string, any> = { comments: ['', Validators.required] };
    for (const champ of this._stepFields) {
      if (champ.id == null) {
        continue;
      }
      controles[this.nomDeControle(champ)] = ['', champ.required ? Validators.required : []];
    }
    this.form = this.fb.group(controles);
  }

  /** Le contrôle porte l'identifiant du champ : c'est cette clé qu'attend le serveur. */
  nomDeControle(champ: WorkflowStepFieldDto): string {
    return `champ_${champ.id}`;
  }

  /** Valeurs proposées pour un champ de type liste. */
  choixDuChamp(champ: WorkflowStepFieldDto): string[] {
    return (champ.options ?? '')
      .split(',')
      .map((choix) => choix.trim())
      .filter((choix) => choix.length > 0);
  }

  estInvalide(nomControle: string): boolean {
    const controle = this.form.get(nomControle);
    return !!controle && controle.invalid && controle.touched;
  }

  fermer(): void {
    this.visible = false;
    this.visibleChange.emit(false);
  }

  valider(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const valeurs = this.form.value;
    const champs: Record<number, string> = {};
    for (const champ of this._stepFields) {
      if (champ.id == null) {
        continue;
      }
      const valeur = valeurs[this.nomDeControle(champ)];
      if (valeur !== null && valeur !== undefined && `${valeur}`.length > 0) {
        champs[champ.id] = `${valeur}`;
      }
    }

    this.confirm.emit({ comments: valeurs.comments, fields: champs });
  }
}
