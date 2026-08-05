import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { NgPrimeModule } from '../../../prime-ng.module';
import { WorkflowActionDto, WorkflowStepFieldDto } from '../../models/workflow.model';
import { ChoixDeChamp, ChoixDeChampService } from './choix-de-champ.service';

/** Décision confirmée : commentaire et valeurs saisies, prêtes pour l'appel au serveur. */
export interface DecisionConfirmee {
  comments: string;
  /** Valeurs indexées par identifiant de champ, comme les attend le serveur. */
  fields: Record<number, string>;
}

/**
 * Confirmation d'une décision de circuit : commentaire, et champs exigés par l'étape.
 *
 * <p>Le dialogue ne demandait qu'un commentaire. Or une étape peut exiger d'autres saisies, que le
 * serveur refuse de laisser passer : la décision partait, revenait en 400 « Champ(s)
 * obligatoire(s) non renseigné(s) : … », et l'utilisateur n'avait aucun moyen de les fournir depuis
 * cet écran. Les champs déclarés par l'étape courante sont donc construits ici.</p>
 *
 * <p>Le composant ne connaît ni document ni non-conformité : une référence lisible, une étape, des
 * champs, et une manière de déposer un fichier. C'est ce qui lui permet de servir n'importe quel
 * dossier suivi par le moteur.</p>
 */
@Component({
  selector: 'app-workflow-decision-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgPrimeModule],
  templateUrl: './workflow-decision-dialog.component.html'
})
export class WorkflowDecisionDialogComponent {
  /**
   * Référence lisible du dossier concerné, rappelée sous le titre : la décision engage son auteur,
   * qui doit voir sur quoi elle porte.
   */
  @Input() reference?: string;

  /** Étape courante du circuit, rappelée sous la référence. */
  @Input() etapeCourante?: string;

  @Input()
  set action(valeur: WorkflowActionDto | undefined) {
    this._action = valeur;
    // Les champs présentés dépendent de la décision : sans reconstruction, le formulaire
    // garderait ceux de l'action précédemment ouverte.
    this.reconstruireFormulaire();
  }
  get action(): WorkflowActionDto | undefined {
    return this._action;
  }
  private _action?: WorkflowActionDto;

  @Input() loading = false;

  /** Champs déclarés par l'étape courante du circuit. */
  @Input()
  set stepFields(champs: WorkflowStepFieldDto[] | undefined) {
    this._stepFields = champs ?? [];
    this.reconstruireFormulaire();
  }

  /**
   * Champs à présenter pour la décision en cours.
   *
   * <p>Une étape déclare parfois un champ propre à une seule issue — un justificatif de rejet, par
   * exemple. Présenté sans distinction, il demandait de motiver un refus à qui était en train
   * d'approuver.</p>
   */
  get stepFields(): WorkflowStepFieldDto[] {
    return this._stepFields.filter((champ) => this.concerneLaDecision(champ));
  }
  private _stepFields: WorkflowStepFieldDto[] = [];

  private concerneLaDecision(champ: WorkflowStepFieldDto): boolean {
    return !champ.decision || !this._action?.decision || champ.decision === this._action.decision;
  }

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

  /**
   * Dépose une pièce jointe et rend la référence qui la désigne.
   *
   * <p>Le moteur ne transporte que des chaînes : une étape qui exige un fichier reçoit donc la
   * référence du dépôt, pas le fichier lui-même. Le dépôt appartient au module appelant — c'est
   * lui qui sait où ranger la pièce et sous quelle forme la retrouver.</p>
   *
   * <p>Absent, un champ de type fichier est présenté désactivé plutôt que rendu en zone de texte :
   * demander à l'utilisateur de saisir un fichier à la main serait pire que de lui dire que l'écran
   * ne sait pas encore le faire.</p>
   */
  @Input() deposerFichier?: (fichier: File) => Observable<string>;

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() confirm = new EventEmitter<DecisionConfirmee>();

  form: FormGroup;

  /** Dépôt en cours, par nom de contrôle : le bouton de validation attend qu'ils soient finis. */
  depotsEnCours = new Set<string>();
  /** Nom du fichier déposé, par nom de contrôle, pour le rappeler à l'écran. */
  fichiersDeposes: Record<string, string> = {};
  /** Dépôt en échec, par nom de contrôle. */
  depotsEnEchec = new Set<string>();

  get depotEnCours(): boolean {
    return this.depotsEnCours.size > 0;
  }

  constructor(
    private fb: FormBuilder,
    private choixService: ChoixDeChampService
  ) {
    this.form = this.fb.group({ comments: ['', Validators.required] });
  }

  /**
   * Dépose le fichier choisi et retient sa référence comme valeur du champ.
   *
   * <p>La référence seule est envoyée au moteur. Tant que le dépôt n'a pas abouti, le champ reste
   * vide : une étape qui exige la pièce refusera la décision, ce qui vaut mieux que de laisser
   * croire qu'elle est jointe.</p>
   */
  choisirFichier(evenement: Event, nomDeControle: string): void {
    const entree = evenement.target as HTMLInputElement;
    const fichier = entree.files?.[0];
    if (!fichier || !this.deposerFichier) {
      return;
    }
    this.depotsEnEchec.delete(nomDeControle);
    this.depotsEnCours.add(nomDeControle);
    this.form.get(nomDeControle)?.setValue('');
    this.deposerFichier(fichier).subscribe({
      next: (reference) => {
        this.depotsEnCours.delete(nomDeControle);
        this.fichiersDeposes[nomDeControle] = fichier.name;
        this.form.get(nomDeControle)?.setValue(reference);
      },
      error: () => {
        this.depotsEnCours.delete(nomDeControle);
        this.depotsEnEchec.add(nomDeControle);
        entree.value = '';
      }
    });
  }

  /**
   * Reconstruit le formulaire à l'ouverture, et à chaque changement d'étape ou de décision.
   *
   * <p>Reconstruit plutôt que remis à zéro : les champs varient d'une décision à l'autre, et
   * conserver ceux de la précédente ferait saisir des valeurs qui ne seraient pas envoyées.</p>
   */
  private reconstruireFormulaire(): void {
    const controles: Record<string, any> = { comments: ['', Validators.required] };
    for (const champ of this.stepFields) {
      if (champ.id == null) {
        continue;
      }
      controles[this.nomDeControle(champ)] = ['', champ.required ? Validators.required : []];
    }
    this.form = this.fb.group(controles);
    this.chargerLesSources();
    this.depotsEnCours.clear();
    this.depotsEnEchec.clear();
    this.fichiersDeposes = {};
  }

  /** Le contrôle porte l'identifiant du champ : c'est cette clé qu'attend le serveur. */
  nomDeControle(champ: WorkflowStepFieldDto): string {
    return `champ_${champ.id}`;
  }

  /**
   * Valeurs proposées pour un champ de type liste.
   *
   * <p>Soit la liste littérale déclarée par le circuit, soit celles d'une source — structures,
   * utilisateurs — qui vit ailleurs et change sans qu'on remanie le circuit. La valeur retenue est
   * alors l'identifiant : c'est lui que le moteur transporte.</p>
   */
  choixDuChamp(champ: WorkflowStepFieldDto): ChoixDeChamp[] {
    const options = champ.options ?? '';
    if (this.choixService.estUneSource(options)) {
      return this.choixParSource[options.trim().toUpperCase()] ?? [];
    }
    return options
      .split(',')
      .map((choix) => choix.trim())
      .filter((choix) => choix.length > 0)
      .map((choix) => ({ label: choix, value: choix }));
  }

  /**
   * Valeurs chargées, par source.
   *
   * <p>Conservées dans le composant plutôt que résolues à chaque cycle de rendu : le gabarit
   * appelle {@code choixDuChamp} à chaque détection de changement, et un appel réseau y aurait été
   * relancé sans fin.</p>
   */
  private choixParSource: Record<string, ChoixDeChamp[]> = {};

  private chargerLesSources(): void {
    for (const champ of this._stepFields) {
      const options = (champ.options ?? '').trim();
      if (!this.choixService.estUneSource(options) || this.choixParSource[options.toUpperCase()]) {
        continue;
      }
      this.choixService.choix(options).subscribe((choix) => {
        this.choixParSource[options.toUpperCase()] = choix;
      });
    }
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
    for (const champ of this.stepFields) {
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
