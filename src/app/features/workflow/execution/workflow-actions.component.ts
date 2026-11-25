import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MenuItem, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { TooltipModule } from 'primeng/tooltip';
import { Observable } from 'rxjs';
import { DecisionConfirmee, WorkflowDecisionDialogComponent } from './workflow-decision-dialog.component';
import { WorkflowActionDto, WorkflowStateDto } from 'src/app/models/workflow.model';
import { WorkflowService } from '../services/workflow.service';

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
    imports: [CommonModule, ButtonModule, MenuModule, TooltipModule, WorkflowDecisionDialogComponent],
    template: `
        @if (actions.length) {
            @if (compact) {
                <div class="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
                    @for (action of compactPrimaryActions; track action.code; let idx = $index) {
                        @if (idx === 0 && !estActionNegative(action)) {
                            <p-button
                                [label]="action.libelle"
                                [icon]="action.icon || (estActionValidation(action) ? 'pi pi-check' : 'pi pi-arrow-right')"
                                [severity]="estActionValidation(action) ? 'success' : 'info'"
                                size="small"
                                [styleClass]="compactPrimaryClass(action)"
                                [disabled]="loading"
                                (onClick)="ouvrir(action)"></p-button>
                        } @else {
                            <p-button
                                [label]="action.libelle"
                                [icon]="action.icon || 'pi pi-undo'"
                                severity="secondary"
                                [outlined]="true"
                                size="small"
                                [styleClass]="compactSecondaryClass(action)"
                                [disabled]="loading"
                                (onClick)="ouvrir(action)"></p-button>
                        }
                    }

                    @if (compactOverflowActions.length) {
                        <p-button
                            icon="pi pi-ellipsis-v"
                            severity="secondary"
                            [outlined]="true"
                            size="small"
                            styleClass="!bg-[var(--surface-card)] !border-[#dddddd] dark:!border-surface-700 !text-[var(--text-color-secondary)] !w-8 !px-0"
                            pTooltip="Autres actions"
                            tooltipPosition="top"
                            [disabled]="loading"
                            (onClick)="ouvrirMenuOverflow($event, overflowMenu)"></p-button>
                        <p-menu #overflowMenu [model]="overflowMenuItems" [popup]="true" appendTo="body"></p-menu>
                    }
                </div>
            } @else {
                <div class="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
                    @if (state?.currentStateName) {
                        <span class="text-xs text-[var(--text-color-secondary)] mr-1">
                            Étape : <span class="font-semibold text-[var(--heading-color)]">{{ state?.currentStateName }}</span>
                        </span>
                    }
                    @for (action of actions; track action.code) {
                        <p-button
                            [label]="action.libelle"
                            [icon]="action.icon || 'pi pi-directions'"
                            [severity]="severiteDe(action)"
                            size="small"
                            styleClass="w-full sm:w-auto justify-center font-semibold"
                            [disabled]="loading"
                            (onClick)="ouvrir(action)"></p-button>
                    }
                </div>
            }
        }

        <app-workflow-decision-dialog
            [reference]="reference"
            [etapeCourante]="state?.currentStateName ?? undefined"
            [action]="actionRetenue"
            [stepFields]="state?.currentStepFields"
            [structureId]="structureIdCible"
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
    /** Structure rattachée au dossier (ex: structure destinataire). */
    @Input() structureId?: string;
    /** Mode compact (ex: accueil) : 1 action principale + 1 action secondaire sobre + menu overflow si 3+. */
    @Input() compact = false;
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
    overflowMenuItems: MenuItem[] = [];

    /**
     * Structure ciblée pour l'étape (ex: la structure destinataire choisie au visa RQ).
     * Utilisée par les champs dynamiques comme @UTILISATEURS_MA_STRUCTURE.
     */
    get structureIdCible(): string | undefined {
        if (this.structureId) {
            return this.structureId;
        }
        const saisies = this.state?.saisies ?? [];
        const saisieDest = saisies.find(s =>
            s.fieldName === 'structureDestinataireId' ||
            s.fieldName === 'structureDestinataire' ||
            s.fieldName?.toLowerCase().includes('structure')
        );
        return saisieDest?.value;
    }

    constructor(
        private readonly workflowService: WorkflowService,
        private readonly messageService: MessageService
    ) {}

    get actions(): WorkflowActionDto[] {
        return this.state?.allowedActions ?? [];
    }

    /** Trie les actions pour placer la progression/validation en tête et limiter à 2 boutons visibles en mode compact. */
    private get actionsTrieesCompact(): WorkflowActionDto[] {
        return [...this.actions].sort((a, b) => this.poidsCompact(a) - this.poidsCompact(b));
    }

    get compactPrimaryActions(): WorkflowActionDto[] {
        return this.actionsTrieesCompact.slice(0, 2);
    }

    get compactOverflowActions(): WorkflowActionDto[] {
        return this.actionsTrieesCompact.slice(2);
    }

    private poidsCompact(action: WorkflowActionDto): number {
        if (!this.estActionNegative(action) && action.decision !== 'CLOTURE') {
            return this.estActionValidation(action) ? 0 : 1;
        }
        if (this.estActionRetour(action)) {
            return 2;
        }
        if (this.estActionRejet(action)) {
            return 3;
        }
        return 4;
    }

    estActionValidation(action: WorkflowActionDto): boolean {
        const lib = (action.libelle || '').toLowerCase();
        return action.severity === 'success'
            || lib.includes('valider')
            || lib.includes('accepter')
            || lib.includes('approuv');
    }

    estActionRejet(action: WorkflowActionDto): boolean {
        const lib = (action.libelle || '').toLowerCase();
        return action.decision === 'REJETE'
            || action.severity === 'danger'
            || lib.includes('rejet')
            || lib.includes('refus');
    }

    estActionRetour(action: WorkflowActionDto): boolean {
        const lib = (action.libelle || '').toLowerCase();
        return lib.includes('retour') || lib.includes('renvoy');
    }

    estActionNegative(action: WorkflowActionDto): boolean {
        return this.estActionRejet(action) || this.estActionRetour(action) || action.decision === 'CLOTURE';
    }

    compactPrimaryClass(action: WorkflowActionDto): string {
        if (this.estActionValidation(action)) {
            return '!bg-emerald-500/12 !text-emerald-700 dark:!text-emerald-300 !border !border-emerald-500/35 hover:!bg-emerald-500/20 !font-semibold !text-xs';
        }
        return '!font-semibold !text-xs';
    }

    compactSecondaryClass(action: WorkflowActionDto): string {
        if (this.estActionRetour(action)) {
            return '!bg-transparent !text-amber-700 dark:!text-amber-300 !border-amber-500/35 hover:!bg-amber-500/10 !font-semibold !text-xs';
        }
        if (this.estActionRejet(action)) {
            return '!bg-transparent !text-rose-600 dark:!text-rose-400 !border-rose-500/35 hover:!bg-rose-500/10 !font-semibold !text-xs';
        }
        return '!bg-[var(--surface-card)] !border-[#dddddd] dark:!border-surface-700 !text-[var(--heading-color)] !font-semibold !text-xs';
    }

    ouvrirMenuOverflow(event: Event, menu: any): void {
        this.overflowMenuItems = this.compactOverflowActions.map((action) => ({
            label: action.libelle,
            icon: action.icon || 'pi pi-directions',
            command: () => this.ouvrir(action)
        }));
        menu.toggle(event);
    }

    /** Couleur du bouton : celle du circuit, ou celle que porte la décision à défaut. */
    severiteDe(action: WorkflowActionDto): any {
        if (action.severity) {
            return action.severity;
        }
        if (action.decision === 'REJETE') {
            return 'danger';
        }
        return action.decision === 'CLOTURE' ? 'warn' : 'success';
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
