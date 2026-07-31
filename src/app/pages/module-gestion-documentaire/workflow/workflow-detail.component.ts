import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { MessageService } from 'primeng/api';
import { WorkflowService } from '../../../services/module-gestion-documentaire/workflow.service';
import { AppRoleService } from '../../role/role-service/role.service';
import { DocumentWorkflow, WorkflowStep, WorkflowDecision } from '../../../models/gestion-documentaire.model';
import { NgPrimeModule } from '../../../../prime-ng.module';
import { showToast, StatusEnum } from '../../../utils/global/global-utils';

@Component({
  selector: 'app-workflow-detail',
  standalone: true,
  imports: [CommonModule, NgPrimeModule],
  providers: [MessageService],
  templateUrl: './workflow-detail.component.html',
  styles: [`
    /* ── Step Cards ── */
    .step-card {
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .step-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
    }

    /* ── Flowchart Nodes (Style exact de la capture) ── */
    .flow-circle {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      background-color: #638453;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 1.1rem;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
      border: 2px solid #526f43;
    }

    .flow-rectangle {
      min-width: 220px;
      max-width: 280px;
      min-height: 80px;
      background-color: #638453;
      color: #ffffff;
      padding: 14px 18px;
      border-radius: 6px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
      border: 2px solid #526f43;
    }

    .flow-diamond-container {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 15px 0;
    }

    .flow-diamond {
      width: 120px;
      height: 120px;
      background-color: #638453;
      color: #ffffff;
      transform: rotate(45deg);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
      border: 2px solid #526f43;
      border-radius: 6px;
    }

    .flow-diamond-content {
      transform: rotate(-45deg);
      text-align: center;
      font-weight: 700;
      font-size: 0.9rem;
      width: 90px;
      line-height: 1.2;
    }

    .flow-rectangle-rounded {
      min-width: 180px;
      max-width: 240px;
      min-height: 75px;
      background-color: #638453;
      color: #ffffff;
      padding: 12px 16px;
      border-top-left-radius: 6px;
      border-bottom-left-radius: 6px;
      border-top-right-radius: 35px;
      border-bottom-right-radius: 35px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
      border: 2px solid #526f43;
    }

    /* Connecteurs et Flèches */
    .flow-arrow-v {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin: 4px 0;
    }

    .arrow-line-v {
      width: 2px;
      height: 35px;
      background-color: #4a5568;
    }

    .arrow-head-v {
      width: 0;
      height: 0;
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
      border-top: 9px solid #4a5568;
    }

    .arrow-line-h {
      height: 2px;
      width: 40px;
      background-color: #4a5568;
    }

    .arrow-head-h {
      width: 0;
      height: 0;
      border-top: 6px solid transparent;
      border-bottom: 6px solid transparent;
      border-left: 9px solid #4a5568;
    }
  `]
})
export class WorkflowDetailComponent implements OnInit, OnDestroy {
  loading = true;
  destroy$: Subject<boolean> = new Subject<boolean>();

  workflowId?: string;
  workflow?: DocumentWorkflow;
  rolesList: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private workflowService: WorkflowService,
    private roleService: AppRoleService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.fetchRoles();
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.workflowId = params['id'];
      if (this.workflowId) {
        this.loadWorkflowDetail(this.workflowId);
      } else {
        this.loading = false;
      }
    });
  }

  fetchRoles() {
    this.roleService
      .getAllRoles(0, 100000)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res && res.data && res.data.content) {
            this.rolesList = res.data.content.map((r: any) => ({
              label: r.name || r.code || r.libelle || r.id,
              value: r.id
            }));
          }
        },
        error: () => {
          console.warn('Impossible de charger les rôles.');
        }
      });
  }

  getRoleLabel(roleIdOrName: string | undefined | null): string {
    if (!roleIdOrName) return 'Non spécifié';
    const role = this.rolesList.find(r => r.value === roleIdOrName || r.label === roleIdOrName);
    return role ? role.label : roleIdOrName;
  }

  loadWorkflowDetail(id: string) {
    this.loading = true;
    this.workflowService.getWorkflowById(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res) {
            this.workflow = res;
          } else {
            this.fetchFallbackWorkflow(id);
            return;
          }
          this.loading = false;
        },
        error: () => {
          this.fetchFallbackWorkflow(id);
        }
      });
  }

  private fetchFallbackWorkflow(id: string) {
    this.workflowService.getAllWorkflows()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (list) => {
          this.workflow = list.find(w => w.id === id);
          this.loading = false;
        },
        error: (err) => {
          this.loading = false;
          showToast(StatusEnum.error, err.status, 'Erreur lors du chargement des détails', this.messageService, err);
        }
      });
  }

  getSortedSteps(): WorkflowStep[] {
    if (!this.workflow?.steps) return [];
    return [...this.workflow.steps].sort((a, b) => a.stepOrder - b.stepOrder);
  }

  getTransitionTargetLabel(step: WorkflowStep, decision: WorkflowDecision): string {
    const transition = step.transitions?.find(t => t.decision === decision);
    if (!transition || transition.toStepOrder == null) {
      return decision === 'APPROUVE' ? 'Fin de circuit (Validé)' : 'Retour au brouillon';
    }
    const target = this.workflow?.steps?.find(s => s.stepOrder === transition.toStepOrder);
    return target ? `Étape ${target.stepOrder} — ${target.nomEtape}` : `Étape ${transition.toStepOrder}`;
  }

  getTransitionLabelText(step: WorkflowStep, decision: WorkflowDecision): string {
    const transition = step.transitions?.find(t => t.decision === decision);
    if (transition?.label) return transition.label;
    return decision === 'APPROUVE' ? 'Approuver' : 'Rejeter';
  }

  hasRejectTransition(step: WorkflowStep): boolean {
    return !!step.transitions?.some(t => t.decision === 'REJETE');
  }

  isRejectGoingBack(step: WorkflowStep): boolean {
    const transition = step.transitions?.find(t => t.decision === 'REJETE');
    if (!transition || transition.toStepOrder == null) return true;
    return transition.toStepOrder < step.stepOrder;
  }

  getShortTargetLabel(step: WorkflowStep, decision: WorkflowDecision): string {
    const transition = step.transitions?.find(t => t.decision === decision);
    if (!transition || transition.toStepOrder == null) {
      return decision === 'APPROUVE' ? 'Validé ✓' : 'Brouillon';
    }
    const target = this.workflow?.steps?.find(s => s.stepOrder === transition.toStepOrder);
    return target ? target.nomEtape : `Étape ${transition.toStepOrder}`;
  }

  getStepByOrder(order: number | null | undefined): WorkflowStep | undefined {
    if (order == null) return undefined;
    return this.workflow?.steps?.find(s => s.stepOrder === order);
  }

  goBack() {
    this.router.navigate(['/parametrage-document/workflows']);
  }

  ngOnDestroy(): void {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }
}
