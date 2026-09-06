import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Subject, takeUntil } from 'rxjs';

import { NgPrimeModule } from '@prime-ng';
import { AppCrudGenericComponent } from '@shared';
import { TableColumn } from '../../../../models/generique.model';
import { hasAnyPermission } from '@core/auth';
import { WorkflowError, WorkflowService } from '@features/workflow';
import { WorkflowConfigurationGuideComponent } from '../editor/workflow-configuration-guide.component';
import { WorkflowDto } from '../../../../models/workflow.model';
import { BasePaginationComponent } from '../../../../shared/pagination/pagination';
import { AlertService } from '../../../../shared/alert-message/alert-message.service';

/**
 * Ligne du tableau : le circuit, augmenté de ce que la colonne affiche telle quelle.
 *
 * Le tableau générique lit la valeur brute du champ désigné par la colonne — il n'appelle aucune
 * méthode du composant. Le libellé du type de ressource et le nombre d'étapes sont donc calculés
 * ici, au moment du filtrage.
 */
type LigneCircuit = WorkflowDto & { typeLibelle: string; nbEtapes: number };

/**
 * Liste des circuits de validation, tous types de ressource confondus.
 *
 * La consultation et la saisie d'un circuit s'ouvraient ici même, dans deux dialogues modaux.
 * Un circuit est pourtant l'objet le plus profond de l'application — étapes, actions, champs de
 * saisie — et le faire tenir dans une fenêtre revenait à faire défiler un formulaire de quatre
 * cents lignes derrière un cadre : ce sont désormais des pages, avec une adresse qu'on peut
 * recharger et partager (`circuits/detail/:id`, `circuits/edition/:id`).
 */
@Component({
  selector: 'app-circuits-liste',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, NgPrimeModule, AppCrudGenericComponent,
    WorkflowConfigurationGuideComponent],
  providers: [MessageService, ConfirmationService],
  templateUrl: './circuits-liste.component.html'
})
export class CircuitsListeComponent extends BasePaginationComponent implements OnInit, OnDestroy {
  private readonly workflowService = inject(WorkflowService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly alertService = inject(AlertService);

  private readonly destroy$ = new Subject<void>();

  // chargement = true;

  // currentPage = 0;
  // pageSize = 8;
  // totalElements = 0;
  private tousLesCircuitsFiltres: LigneCircuit[] = [];

  circuits: LigneCircuit[] = [];
  private tousLesCircuits: WorkflowDto[] = [];

  typeFiltre: string | null = null;

  readonly titrePage = 'Circuits de validation';

  /**
   * Filtre servi par la barre du tableau générique. La recherche libre y est déjà, portée par le
   * composant : n'y reste que ce qu'il ne sait pas faire seul, le filtre par type de ressource.
   */
  readonly filtres = [
    {
      field: 'resourceType',
      label: 'Type de ressource',
      placeHolder: 'Tous les types',
      list: [
        { label: 'Documents', value: 'DOCUMENT' },
        { label: 'Non-conformités', value: 'NON_CONFORMITE' },
        { label: "Plans d'action", value: 'PLAN_ACTION' },
        { label: 'Demandes sur documents', value: 'DEMANDE_DOCUMENT' }
      ],
      value: null as string | null
    }
  ];

  readonly colonnes: TableColumn[] = [
    { field: 'nom', header: 'Circuit', type: 'string', filter: true },
    { field: 'description', header: 'Description', type: 'string', filter: true },
    { field: 'typeLibelle', header: 'Type de ressource', type: 'string', filter: true, width: '12rem' },
    { field: 'nbEtapes', header: 'Étapes', type: 'number', filter: false, width: '7rem' },
    {
      field: 'actif',
      header: 'Statut',
      type: 'boolean',
      filter: false,
      labelTrue: 'Actif',
      labelFalse: 'Inactif',
      width: '8rem'
    }
  ];

  /**
   * Le tableau générique réclame un formulaire : celui de son dialogue intégré, dont cet écran ne
   * se sert pas — la saisie d'un circuit a sa propre page. On lui confie donc un groupe vide.
   */
  readonly formulaireTableau = this.fb.group({});

  /**
   * Actions du menu de ligne. Modifier et supprimer sont retirés faute de `workflow-write`.
   */
  actionsLigne: { label: string; icon: string; action: string }[] = [];

  peutEcrire = false;

  /**
   * Types de ressource pour lesquels plusieurs circuits sont ouvrables à la fois.
   *
   * Ce n'est plus une anomalie : un type de document peut désigner son propre circuit, et celui-ci
   * doit être actif pour servir. Reste une chose à dire, et le bandeau la dit : lequel s'applique
   * aux dossiers qui ne désignent aucun circuit — le plus ancien des circuits actifs de la famille.
   */
  typesEnConflit: string[] = [];

  guideOuvert = false;

  private readonly typesRessource = [
    { label: 'Documents', value: 'DOCUMENT' },
    { label: 'Non-conformités', value: 'NON_CONFORMITE' },
    { label: "Plans d'action", value: 'PLAN_ACTION' }
  ];

  /**
   * Nom du circuit que la page d'édition vient d'enregistrer, transmis par l'état de navigation.
   *
   * Le message de succès s'affichait dans le dialogue, au-dessus de la liste ; la page d'édition,
   * elle, est détruite dès qu'elle revient ici — son toast mourrait avec elle. C'est donc la liste
   * qui l'annonce, au retour.
   */
  private readonly circuitEnregistre: string | undefined =
    (this.router.getCurrentNavigation()?.extras?.state as { circuitEnregistre?: string } | undefined)
      ?.circuitEnregistre;

  ngOnInit(): void {
    this.peutEcrire = hasAnyPermission(['workflow-write']);
    this.actionsLigne = [
      { label: 'Consulter', icon: 'pi pi-eye', action: 'consulter' },
      ...(this.peutEcrire
        ? [
            { label: 'Modifier', icon: 'pi pi-pencil', action: 'modifier' },
            // { label: 'Supprimer', icon: 'pi pi-trash', action: 'supprimer' }
          ]
        : [])
    ];

    if (this.circuitEnregistre) {
      this.messageService.add({
        severity: 'success',
        summary: 'Circuit enregistré',
        detail: `« ${this.circuitEnregistre} » a été enregistré.`
      });
    }

    this.chargerCircuits();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  fetchObject(): void {
    this.chargerCircuits();
}

  chargerCircuits(): void {
    this.loading = true;
    this.workflowService
      .getAllWorkflows()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (circuits) => {
          this.tousLesCircuits = circuits;
          this.appliquerFiltres();
          this.loading = false;
        },
        error: (erreur: WorkflowError) => {
          this.loading = false;
          this.signalerErreur(erreur);
        }
      });
  }

  supprimerCircuit(circuit: WorkflowDto): void {
    this.workflowService
        .deleteWorkflow(circuit.id!)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
            next: () => {
                this.alertService.showSuccess("Supprimé", `Le circuit "${circuit.nom}" a été supprimé.`);
                this.fetchObject();
            },
            error: (erreur: WorkflowError) => this.signalerErreur(erreur)
        });
}


  appliquerFiltres(): void {
    this.tousLesCircuitsFiltres = this.tousLesCircuits
      .filter((circuit) => !this.typeFiltre || circuit.resourceType === this.typeFiltre)
      .map((circuit) => ({
        ...circuit,
        typeLibelle: this.libelleType(circuit.resourceType),
        nbEtapes: circuit.steps?.length ?? 0
      }));

    this.totalElements = this.tousLesCircuitsFiltres.length;
    this.mettreAJourPage();

    this.typesEnConflit = this.typesRessource
      .filter(
        (type) =>
          this.tousLesCircuits.filter((circuit) => circuit.actif && circuit.resourceType === type.value)
            .length > 1
      )
      .map((type) => type.label);
  }

  mettreAJourPage(): void {
    const debut = this.currentPage * this.pageSize;
    this.circuits = this.tousLesCircuitsFiltres.slice(debut, debut + this.pageSize);
  }


  /** Reçoit l'entrée de filtre du tableau générique, qui y a posé la valeur choisie. */
  filtrerParType(filtre: any): void {
    this.typeFiltre = (typeof filtre === 'string' || filtre === null) ? filtre : (filtre?.value ?? null);
    this.appliquerFiltres();
  }

  libelleType(type?: string): string {
    return this.typesRessource.find((option) => option.value === type)?.label ?? (type ?? '—');
  }

  /**
   * Aiguillage du menu d'actions du tableau générique, qui n'émet qu'un couple action/ligne.
   *
   * La suppression conserve sa propre confirmation (`supprimer`), qui énonce ce qui est en jeu —
   * les dossiers en cours sur ce circuit — là où celle du tableau générique est générique.
   */
  executerAction(evenement: { action: string; user: any }): void {
    const circuit = evenement.user as WorkflowDto;
    switch (evenement.action) {
      case 'consulter':
        this.router.navigate(['/configurations/circuits/detail', circuit.id]);
        break;
      case 'modifier':
        this.router.navigate(['/configurations/circuits/edition', circuit.id]);
        break;
      case 'supprimer':
        this.supprimer(circuit);
        break;
    }
  }

  /** La création est une page, comme l'édition : `nouveau` y tient lieu d'identifiant. */
  creerCircuit(): void {
    this.router.navigate(['/configurations/circuits/edition', 'nouveau'],
      this.typeFiltre ? { queryParams: { type: this.typeFiltre } } : {});
  }

  supprimer(circuit: WorkflowDto): void {
    this.confirmationService.confirm({
      header: 'Supprimer ce circuit ?',
      message:
        `« ${circuit.nom} » sera définitivement supprimé. ` +
        'La suppression est refusée si des dossiers y sont encore en cours.',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Supprimer',
      rejectLabel: 'Annuler',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.workflowService
          .deleteWorkflow(circuit.id!)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.messageService.add({
                severity: 'success',
                summary: 'Circuit supprimé',
                detail: `« ${circuit.nom} » a été supprimé.`
              });
              this.chargerCircuits();
            },
            error: (erreur: WorkflowError) => this.signalerErreur(erreur)
          });
      }
    });
  }

  /**
   * Affiche le message du serveur plutôt qu'un libellé générique : workflow-service répond en 4xx
   * explicites et rédige des messages destinés à l'utilisateur.
   */
  private signalerErreur(erreur: WorkflowError): void {
    this.messageService.add({
      severity: erreur.estInterdit ? 'warn' : 'error',
      summary: this.titreErreur(erreur),
      detail: erreur.message,
      life: 8000
    });
    if (erreur.estPerime) {
      this.chargerCircuits();
    }
  }

  private titreErreur(erreur: WorkflowError): string {
    if (erreur.estInterdit) return 'Action non autorisée';
    if (erreur.estPerime) return 'Modification impossible en l’état';
    if (erreur.status === 404) return 'Circuit introuvable';
    if (erreur.status === 400) return 'Saisie à corriger';
    return 'Erreur';
  }
}
