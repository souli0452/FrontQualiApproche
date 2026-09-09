import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { NgPrimeModule } from '@prime-ng';
import { WorkflowActionDto, WorkflowStepFieldDto } from '../models';
import { SelectInputComponent } from '@shared';
import { ChoixDeChamp, ChoixDeChampService } from '../services/choix-de-champ.service';
import { MessageService } from 'primeng/api';

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
  imports: [CommonModule, ReactiveFormsModule, NgPrimeModule, SelectInputComponent],
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

  /** Structure rattachée au dossier (ex: structure destinataire à imputer). */
  @Input()
  set structureId(valeur: string | null | undefined) {
    if (this._structureId !== valeur) {
      this._structureId = valeur;
      delete this.choixParSource['@UTILISATEURS_MA_STRUCTURE'];
      this.chargerLesSources();
    }
  }
  get structureId(): string | null | undefined {
    return this._structureId;
  }
  private _structureId?: string | null;

  /** Champs déclarés par l'étape courante du circuit. */
  @Input()
  set stepFields(champs: WorkflowStepFieldDto[] | undefined) {
    this._stepFields = champs ?? [];
    this.reconstruireFormulaire();
  }

  /**
   * Champs à présenter pour l'action en cours.
   *
   * <p>Une étape déclare parfois un champ propre à une seule issue — un justificatif de rejet, par
   * exemple. Présenté sans distinction, il demandait de motiver un refus à qui était en train
   * d'approuver.</p>
   */
  get stepFields(): WorkflowStepFieldDto[] {
    return this._stepFields.filter((champ) => this.concerneLAction(champ));
  }
  private _stepFields: WorkflowStepFieldDto[] = [];

  /**
   * Portée la plus étroite d'abord : un champ qui nomme une action ne regarde qu'elle.
   *
   * <p>La seule portée par décision ne suffit plus dès qu'une étape offre plusieurs actions de même
   * nature : le motif que réclame « Demander un complément » serait demandé à qui valide
   * simplement, les deux approuvant.</p>
   */
  private concerneLAction(champ: WorkflowStepFieldDto): boolean {
    if (champ.actionCode) {
      return !this._action?.actionCode || champ.actionCode === this._action.actionCode;
    }
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
  @Input()
  set deposerFichier(valeur: ((fichier: File) => Observable<string>) | undefined) {
    this._deposerFichier = valeur;
    // Le formulaire dépend de sa présence : un champ « pièce jointe » n'est exigé que si l'écran
    // sait la déposer. L'entrée peut arriver après les champs de l'étape, d'où la reconstruction.
    this.reconstruireFormulaire();
  }
  get deposerFichier(): ((fichier: File) => Observable<string>) | undefined {
    return this._deposerFichier;
  }
  private _deposerFichier?: (fichier: File) => Observable<string>;

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() confirm = new EventEmitter<DecisionConfirmee>();

  form: FormGroup;

  /** Dépôt en cours, par nom de contrôle : le bouton de validation attend qu'ils soient finis. */
  depotsEnCours = new Set<string>();
  /** Nom du fichier déposé, par nom de contrôle, pour le rappeler à l'écran. */
  fichiersDeposes: Record<string, string> = {};
  /** Dépôt en échec, par nom de contrôle. */
  depotsEnEchec = new Set<string>();
  /** Messages d'erreurs précis de dépôt, par nom de contrôle. */
  erreursDeDepot: Record<string, string> = {};

  get depotEnCours(): boolean {
    return this.depotsEnCours.size > 0;
  }

  /**
   * Sous-titre explicite et contextuel pour la décision.
   */
  get sousTitre(): string {
    const etape = this.etapeCourante ? `Étape : ${this.etapeCourante}` : '';
    const ref = this.reference ? `Dossier ${this.reference}` : '';
    const contexte = [ref, etape].filter(Boolean).join(' • ');

    const libelle = (this.action?.libelle || '').toLowerCase();
    const decision = this.action?.decision;

    if (decision === 'APPROUVE' || libelle.includes('valid') || libelle.includes('approuv')) {
      return contexte
        ? `${contexte} — Valider et transmettre le dossier à l'étape suivante`
        : "Validation et transmission du dossier pour l'étape suivante du circuit";
    }
    if (decision === 'REJETE' || libelle.includes('rejet') || libelle.includes('refus')) {
      return contexte
        ? `${contexte} — Rejeter et retourner le dossier avec vos observations`
        : "Rejet et retour du dossier avec vos observations";
    }
    if (decision === 'CLOTURE' || libelle.includes('clôtur') || libelle.includes('clotur')) {
      return contexte
        ? `${contexte} — Clôturer définitivement le dossier`
        : "Clôture définitive du dossier";
    }
    return contexte
      ? `${contexte} — Enregistrement de votre décision`
      : "Confirmez votre décision pour actualiser le circuit de validation.";
  }

  constructor(
    private fb: FormBuilder,
    private choixService: ChoixDeChampService,
    private messageService: MessageService
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

    // Validation client de base
    const extension = fichier.name.split('.').pop()?.toLowerCase() || '';
    const extensionsAutorisees = ['doc', 'docx', 'xlsx', 'pdf', 'jpeg', 'jpg', 'png', 'txt'];
    const maxTailleMo = 10;

    if (!extensionsAutorisees.includes(extension)) {
      const msg = `Extension .${extension} non autorisée (autorisés : doc, docx, xlsx, pdf, jpeg, jpg, png, txt).`;
      this.erreursDeDepot[nomDeControle] = msg;
      this.depotsEnEchec.add(nomDeControle);
      this.messageService.add({ severity: 'error', summary: 'Type de fichier invalide', detail: msg });
      entree.value = '';
      return;
    }

    if (fichier.size > maxTailleMo * 1024 * 1024) {
      const msg = `Le fichier est trop volumineux (maximum ${maxTailleMo} Mo).`;
      this.erreursDeDepot[nomDeControle] = msg;
      this.depotsEnEchec.add(nomDeControle);
      this.messageService.add({ severity: 'error', summary: 'Fichier trop volumineux', detail: msg });
      entree.value = '';
      return;
    }

    this.depotsEnEchec.delete(nomDeControle);
    delete this.erreursDeDepot[nomDeControle];
    this.depotsEnCours.add(nomDeControle);
    this.form.get(nomDeControle)?.setValue('');

    this.deposerFichier(fichier).subscribe({
      next: (reference) => {
        this.depotsEnCours.delete(nomDeControle);
        this.fichiersDeposes[nomDeControle] = fichier.name;
        this.form.get(nomDeControle)?.setValue(reference);
      },
      error: (err) => {
        this.depotsEnCours.delete(nomDeControle);
        let rawMsg = err?.error?.message || err?.message || '';
        let cleanMsg = "Le dépôt a échoué. Veuillez réessayer.";
        
        if (rawMsg.toLowerCase().includes('size') || rawMsg.toLowerCase().includes('max') || rawMsg.toLowerCase().includes('large') || rawMsg.toLowerCase().includes('unknown url')) {
          cleanMsg = "Le fichier est trop volumineux pour le serveur. Veuillez choisir un fichier plus léger (ex: inférieur à 2 Mo).";
        } else if (rawMsg) {
          cleanMsg = rawMsg;
        }
        
        this.erreursDeDepot[nomDeControle] = cleanMsg;
        this.depotsEnEchec.add(nomDeControle);
        this.messageService.add({ severity: 'error', summary: 'Échec de l\'envoi', detail: cleanMsg });
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

      // Un champ que cet écran ne peut pas servir — une pièce jointe sans moyen de dépôt — n'est
      // pas exigé ici : il n'est pas affiché, et le rendre obligatoire bloquerait la décision sans
      // que rien ne le montre. Le serveur, lui, refusera avec son propre message si la pièce est
      // réellement requise, et l'écran du module permettra de la joindre.
      const servable = champ.type !== 'FILE' || !!this.deposerFichier;
      controles[this.nomDeControle(champ)] =
        ['', champ.required && servable ? Validators.required : []];
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
   *
   * <p><b>La même liste est toujours rendue à l'identique</b>, et pas seulement égale. Le gabarit
   * appelle cette méthode à chaque détection de changement : une liste reconstruite à chaque appel
   * faisait recréer les options du sélecteur, et le choix retenu disparaissait de l'affichage — la
   * valeur restait dans le formulaire, mais le champ paraissait vide. Les listes de source
   * échappaient au défaut, étant déjà mémorisées : d'où un champ à liste écrite à la main qui
   * n'affichait pas son choix, là où une liste d'utilisateurs fonctionnait.</p>
   */
  choixDuChamp(champ: WorkflowStepFieldDto): ChoixDeChamp[] {
    const options = champ.options ?? '';
    if (this.choixService.estUneSource(options)) {
      return this.choixParSource[options.trim().toUpperCase()] ?? [];
    }
    const enCache = this.choixLitteraux.get(options);
    if (enCache) {
      return enCache;
    }
    const estCircuit = champ.fieldName === 'circuitTraitement' || (champ.fieldLabel && champ.fieldLabel.toLowerCase().includes('circuit'));
    const choix = options
      .split(',')
      .map((valeur: string) => valeur.trim())
      .filter((valeur: string) => valeur.length > 0)
      .map((valeur: string) => {
        const maj = valeur.toUpperCase();
        if (estCircuit || maj === 'CORRECTIVE' || maj === 'ACTION CORRECTIVE' || maj === 'ACTION_CORRECTIVE') {
          if (maj === 'CORRECTIVE' || maj === 'ACTION CORRECTIVE' || maj === 'ACTION_CORRECTIVE') {
            return { label: 'Action corrective', value: 'ACTION_CORRECTIVE' };
          }
          if (maj === 'CORRECTION') {
            return { label: 'Correction', value: 'CORRECTION' };
          }
        }
        return { label: valeur, value: valeur };
      });
    this.choixLitteraux.set(options, choix);
    return choix;
  }

  /**
   * Listes écrites à la main, mémorisées par leur déclaration.
   *
   * <p>Deux champs qui proposent les mêmes valeurs partagent la même liste : elles ne dépendent que
   * du texte déclaré dans le circuit.</p>
   */
  private readonly choixLitteraux = new Map<string, ChoixDeChamp[]>();

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
      const cle = options.toUpperCase();
      if (!this.choixService.estUneSource(options) || this.choixParSource[cle]) {
        continue;
      }
      this.choixService.choix(options, this._structureId).subscribe((choix) => {
        this.choixParSource[cle] = choix;
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
        let valStr = `${valeur}`.trim();
        const maj = valStr.toUpperCase();
        const estCircuit = champ.fieldName === 'circuitTraitement' || (champ.fieldLabel && champ.fieldLabel.toLowerCase().includes('circuit'));
        if (estCircuit || maj === 'CORRECTIVE' || maj === 'ACTION CORRECTIVE') {
          if (maj === 'CORRECTIVE' || maj === 'ACTION CORRECTIVE' || maj === 'ACTION_CORRECTIVE') {
            valStr = 'ACTION_CORRECTIVE';
          } else if (maj === 'CORRECTION') {
            valStr = 'CORRECTION';
          }
        }
        champs[champ.id] = valStr;
      }
    }

    this.confirm.emit({ comments: valeurs.comments, fields: champs });
  }
}
