import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { Observable } from 'rxjs';
import { WorkflowService } from '../../services/workflow.service';
import { WorkflowActionDto, WorkflowStateDto } from '../../models/workflow.model';
import { DecisionConfirmee, WorkflowDecisionDialogComponent } from './workflow-decision-dialog.component';

/**
 * Barre d'actions du circuit de validation, pour n'importe quel dossier suivi par le moteur.
 *
 * <p>Elle rend les décisions que le serveur déclare ouvertes à l'appelant — et elles seules :
 * les actions ne sont pas déduites d'un statut, elles sont demandées. Chacune porte le libellé,
 * l'icône et la couleur configurés sur la transition ; à défaut, celles que porte sa décision.</p>
 *
 * <p>Le dialogue de confirmation recueille le commentaire et les champs exigés par l'étape, puis
 * la transition part au moteur. Rien n'est écrit dans le dossier depuis ici : c'est le moteur qui
 * décide, et le service métier qui en tire l'état — un écran qui bascule un statut lui-même finit
 * toujours par diverger du circuit.</p>
 *
 * @example
 * <app-workflow-actions [resourceId]="nc.id" [reference]="nc.numeroNc" [state]="nc.workflowState"
 *                       (executed)="recharger()" />
 */
@Component({
    selector: 'app-workflow-actions',
    standalone: true,
    imports: [CommonModule, ButtonModule, WorkflowDecisionDialogComponent],
    template: `
        @if (actions.length) {
            <div class="flex flex-wrap items-center gap-2">
                @if (state?.currentStateName) {
                    <span class="text-xs text-slate-500 mr-1">
                        Étape : <span class="font-semibold text-slate-700">{{ state?.currentStateName }}</span>
                    </span>
                }
                @for (action of actions; track action.code) {
                    <p-button
                        [label]="action.libelle"
                        [icon]="action.icon || 'pi pi-directions'"
                        [severity]="severiteDe(action)"
                        size="small"
                        [disabled]="loading"
                        (onClick)="ouvrir(action)"></p-button>
                }
            </div>
        }

        <app-workflow-decision-dialog
            [reference]="reference"
            [etapeCourante]="state?.currentStateName ?? undefined"
            [action]="actionRetenue"
            [stepFields]="state?.currentStepFields"
            [deposerFichier]="deposerFichier"
            [loading]="loading"
            [visible]="dialogueOuvert"
            (visibleChange)="dialogueOuvert = $event"
            (confirm)="executer($event)"></app-workflow-decision-dialog>
    `
})
export class WorkflowActionsComponent {
    /** Dossier concerné : c'est sur lui que porte la transition. */
    @Input() resourceId?: string;
    /** Référence lisible du dossier, rappelée dans le dialogue de confirmation. */
    @Input() reference?: string;
    /** État rendu par le serveur : étape courante, actions ouvertes, champs à saisir. */
    @Input() state?: WorkflowStateDto | null;
    /**
     * Dépôt d'une pièce jointe exigée par une étape, rendant la référence qui la désigne.
     *
     * <p>Transmis au dialogue de décision. Le dépôt appartient au module appelant : le moteur ne
     * transporte que des chaînes, et seul l'appelant sait où ranger la pièce.</p>
     */
    @Input() deposerFichier?: (fichier: File) => Observable<string>;

    /** Émis après une décision acceptée : à l'appelant de relire son dossier. */
    @Output() executed = new EventEmitter<void>();

    loading = false;
    dialogueOuvert = false;
    actionRetenue?: WorkflowActionDto;

    constructor(
        private readonly workflowService: WorkflowService,
        private readonly messageService: MessageService
    ) {}

    get actions(): WorkflowActionDto[] {
        return this.state?.allowedActions ?? [];
    }

    /** Couleur du bouton : celle du circuit, ou celle que porte la décision à défaut. */
    severiteDe(action: WorkflowActionDto): any {
        if (action.severity) {
            return action.severity;
        }
        return action.decision === 'REJETE' ? 'danger' : 'success';
    }

    ouvrir(action: WorkflowActionDto): void {
        this.actionRetenue = action;
        this.dialogueOuvert = true;
    }

    executer(decision: DecisionConfirmee): void {
        if (!this.resourceId || !this.actionRetenue) {
            return;
        }
        this.loading = true;
        this.workflowService
            .executeTransition(this.resourceId, this.actionRetenue.code, {
                comments: decision.comments,
                // Étape sur laquelle l'écran croit agir : le serveur refuse en 409 si le dossier
                // a changé d'étape entre-temps, ce qui neutralise aussi un double clic.
                expectedStateCode: this.state?.currentStateCode,
                fields: decision.fields
            })
            .subscribe({
                next: () => {
                    this.loading = false;
                    this.dialogueOuvert = false;
                    this.actionRetenue = undefined;
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Action exécutée',
                        detail: "La décision a été enregistrée."
                    });
                    this.executed.emit();
                },
                error: (erreur: any) => {
                    this.loading = false;
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Décision refusée',
                        detail: erreur?.message || erreur?.error?.message
                            || "La décision n'a pas pu être enregistrée.",
                        life: 8000
                    });
                }
            });
    }
}
