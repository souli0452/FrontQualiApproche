import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subject, takeUntil } from 'rxjs';

import { NgPrimeModule } from '../../../../prime-ng.module';
import { hasAnyPermission } from '../../../utils/auth/auth-utils';
import { WorkflowError, WorkflowService } from '../../../services/workflow.service';
import { WorkflowDetailComponent } from '../../../shared/workflow/workflow-detail.component';
import { WorkflowDto } from '../../../models/workflow.model';

/**
 * Consultation d'un circuit de validation, en pleine page.
 *
 * La fiche s'ouvrait dans un dialogue modal au-dessus de la liste : un circuit — étapes, actions,
 * diagramme état-transition — y tenait à l'étroit, et la consultation n'avait pas d'adresse. La
 * page en a une (`circuits/detail/:id`) : elle se recharge, se partage, et s'ouvre depuis un
 * courriel ou un signet.
 *
 * La fiche elle-même est le composant partagé `app-workflow-detail`, inchangé : il porte déjà son
 * en-tête, ses étapes et son diagramme.
 */
@Component({
  selector: 'app-circuit-detail-page',
  standalone: true,
  imports: [CommonModule, NgPrimeModule, WorkflowDetailComponent],
  providers: [MessageService],
  template: `
    <p-toast></p-toast>

    <div class="flex items-center justify-between mb-3">
        <p-button label="Retour à la liste" icon="pi pi-arrow-left" size="small" [text]="true"
                  (onClick)="retour()"></p-button>
        @if (peutEcrire && circuit) {
            <p-button label="Modifier" icon="pi pi-pencil" size="small"
                      (onClick)="modifier()"></p-button>
        }
    </div>

    @if (chargement) {
        <div class="flex justify-center p-8">
            <i class="pi pi-spin pi-spinner text-2xl text-surface-400"></i>
        </div>
    } @else if (circuit) {
        <app-workflow-detail [workflow]="circuit"></app-workflow-detail>
    }
  `
})
export class CircuitDetailPageComponent implements OnInit, OnDestroy {
  private readonly workflowService = inject(WorkflowService);
  private readonly messageService = inject(MessageService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly destroy$ = new Subject<void>();

  chargement = true;
  circuit?: WorkflowDto;
  peutEcrire = false;

  ngOnInit(): void {
    this.peutEcrire = hasAnyPermission(['workflow-write']);

    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.retour();
      return;
    }
    this.workflowService
      .getWorkflowById(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (circuit) => {
          this.circuit = circuit;
          this.chargement = false;
        },
        error: (erreur: WorkflowError) => {
          this.chargement = false;
          this.messageService.add({
            severity: 'error',
            summary: erreur.status === 404 ? 'Circuit introuvable' : 'Erreur',
            detail: erreur.message,
            life: 8000
          });
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  retour(): void {
    this.router.navigate(['/configurations/circuits']);
  }

  modifier(): void {
    this.router.navigate(['/configurations/circuits/edition', this.circuit!.id]);
  }
}
