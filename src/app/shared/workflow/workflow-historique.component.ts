import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TagModule } from 'primeng/tag';
import { WorkflowService } from '../../services/workflow.service';
import { ValidationHistoryDto } from '../../models/workflow.model';

/**
 * Les décisions déjà prises sur un dossier, telles que le moteur les a consignées.
 *
 * <p>Vaut pour tout dossier suivi par le moteur — une non-conformité comme une action corrective.
 * L'historique d'une action n'était visible nulle part : on lui demandait de rendre compte de son
 * traitement sans pouvoir relire ce qui lui avait été demandé, ni par qui, ni pourquoi elle était
 * revenue.</p>
 *
 * <p>Le fil est tenu par un rail à gauche. Le {@code p-timeline} qu'il remplace réservait une
 * colonne « opposée » que rien ne remplissait : le contenu se trouvait poussé sur un côté, avec un
 * vide de même largeur en regard.</p>
 *
 * @example
 * <app-workflow-historique [resourceId]="plan.id" objet="cette action" />
 */
@Component({
    selector: 'app-workflow-historique',
    standalone: true,
    imports: [CommonModule, TagModule],
    template: `
        <div class="nc-historique">
            @if (chargement) {
                <div class="flex justify-center p-8"><i class="pi pi-spin pi-spinner text-2xl text-400"></i></div>
            } @else if (illisible) {
                <div class="flex flex-col items-center justify-center p-8 text-center">
                    <i class="pi pi-lock text-4xl text-300 mb-3"></i>
                    <p class="text-500 m-0">L'historique n'a pas pu être lu.</p>
                    <p class="text-400 text-sm m-0 mt-1">
                        Il se peut qu'il ne vous soit pas ouvert : il nomme des personnes et rapporte
                        leurs appréciations.
                    </p>
                </div>
            } @else if (!decisions.length) {
                <div class="flex flex-col items-center justify-center p-8 text-center">
                    <i class="pi pi-history text-4xl text-300 mb-3"></i>
                    <p class="text-500 m-0">Aucune décision n'a encore été prise sur {{ objet }}.</p>
                </div>
            } @else {
                <div class="flex items-baseline justify-between mb-4 pb-3 border-bottom-1 surface-border">
                    <span class="font-bold text-900">Décisions prises sur {{ objet }}</span>
                    <span class="text-500 text-sm">{{ decisions.length }} décision(s), de la plus récente à la première</span>
                </div>

                <ol class="nc-historique-fil">
                    @for (decision of decisions; track decision.id; let derniere = $last) {
                        <li class="nc-historique-entree" [class.nc-historique-entree--derniere]="derniere">
                            <span class="nc-historique-pastille"
                                  [ngClass]="decision.decision === 'REJETE' ? 'nc-historique-pastille--renvoi' : 'nc-historique-pastille--validation'">
                                <i class="pi" [ngClass]="decision.decision === 'REJETE' ? 'pi-undo' : 'pi-check'"></i>
                            </span>

                            <div class="nc-historique-carte">
                                <div class="flex flex-wrap items-center gap-2">
                                    <span class="font-bold text-900">{{ decision.stepName || decision.stepCode }}</span>
                                    <p-tag [severity]="decision.decision === 'REJETE' ? 'warn' : 'success'"
                                           [value]="decision.decision === 'REJETE' ? 'Renvoyé' : 'Validé'"
                                           [style]="{'font-weight':'500'}"></p-tag>
                                    <span class="text-500 text-sm ml-auto white-space-nowrap">
                                        <i class="pi pi-clock mr-1 text-400"></i>{{ decision.decisionDate | date:'dd/MM/yyyy à HH:mm' }}
                                    </span>
                                </div>

                                <!-- L'identifiant technique s'affiche à défaut du nom : les décisions
                                     prises avant que le serveur ne consigne l'auteur n'en ont pas. -->
                                <div class="text-600 text-sm mt-2">
                                    <i class="pi pi-user mr-1 text-400"></i>
                                    {{ decision.validatorFullName || decision.validatorUserId || 'Auteur inconnu' }}
                                </div>

                                <div *ngIf="decision.comments" class="nc-historique-commentaire" [innerHTML]="decision.comments"></div>

                                <div *ngIf="decision.fieldValues?.length" class="nc-historique-champs">
                                    <div *ngFor="let champ of decision.fieldValues" class="nc-historique-champ">
                                        <span class="nc-historique-champ-nom">{{ champ.fieldName || champ.fieldCode }}</span>
                                        <span class="nc-historique-champ-valeur">{{ champ.value }}</span>
                                    </div>
                                </div>
                            </div>
                        </li>
                    }
                </ol>
            }
        </div>
    `,
    styles: [`
        .nc-historique { padding: 0.5rem 0.25rem 0.25rem; }
        .nc-historique-fil { list-style: none; margin: 0; padding: 0; }
        .nc-historique-entree {
            position: relative;
            display: flex;
            gap: 1rem;
            padding-bottom: 1.25rem;
        }
        /* Le rail relie une décision à la suivante, et s'arrête à la dernière. */
        .nc-historique-entree::before {
            content: '';
            position: absolute;
            left: 1.125rem;
            top: 2.25rem;
            bottom: 0;
            width: 2px;
            background: var(--surface-300, #dee2e6);
        }
        .nc-historique-entree--derniere { padding-bottom: 0.25rem; }
        .nc-historique-entree--derniere::before { display: none; }
        .nc-historique-pastille {
            flex: 0 0 2.25rem;
            width: 2.25rem;
            height: 2.25rem;
            border-radius: 999px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #fff;
            font-size: 0.875rem;
            z-index: 1;
            box-shadow: 0 0 0 4px var(--surface-0, #fff);
        }
        .nc-historique-pastille--validation { background: #22c55e; }
        .nc-historique-pastille--renvoi { background: #f59e0b; }
        .nc-historique-carte {
            flex: 1 1 auto;
            min-width: 0;
            border: 1px solid var(--surface-200, #eaeaea);
            border-radius: 0.75rem;
            padding: 0.875rem 1rem;
            background: var(--surface-0, #fff);
        }
        .nc-historique-commentaire {
            margin-top: 0.75rem;
            padding-top: 0.75rem;
            border-top: 1px solid var(--surface-100, #f4f4f4);
            color: var(--text-color-secondary, #64748b);
            font-size: 0.875rem;
            line-height: 1.55;
            overflow-wrap: anywhere;
        }
        .nc-historique-champs {
            margin-top: 0.75rem;
            padding-top: 0.75rem;
            border-top: 1px solid var(--surface-100, #f4f4f4);
            display: flex;
            flex-direction: column;
            gap: 0.375rem;
        }
        .nc-historique-champ { display: flex; gap: 0.5rem; font-size: 0.8125rem; align-items: baseline; }
        .nc-historique-champ-nom { flex: 0 0 auto; font-weight: 600; color: var(--text-color-secondary, #64748b); }
        .nc-historique-champ-nom::after { content: ' :'; }
        .nc-historique-champ-valeur { flex: 1 1 auto; min-width: 0; color: var(--text-color, #334155); overflow-wrap: anywhere; }
        @media (max-width: 640px) {
            .nc-historique-entree { gap: 0.75rem; }
            .nc-historique-carte { padding: 0.75rem; }
        }
    `]
})
export class WorkflowHistoriqueComponent {
    /** Dossier dont on lit l'historique. Un changement relance la lecture. */
    @Input() set resourceId(valeur: string | undefined | null) {
        this._resourceId = valeur ?? undefined;
        this.charger();
    }
    get resourceId(): string | undefined {
        return this._resourceId;
    }
    private _resourceId?: string;

    /** Nom du dossier tel qu'on en parle : « ce dossier », « cette action ». */
    @Input() objet = 'ce dossier';

    decisions: ValidationHistoryDto[] = [];
    chargement = false;
    /**
     * La lecture a échoué — service indisponible, ou historique non ouvert à l'appelant.
     *
     * <p>Distingué de « aucune décision » : afficher un dossier vierge à qui n'a pas le droit de
     * lire, ou à qui le service n'a pas répondu, c'est affirmer que rien n'a été décidé.</p>
     */
    illisible = false;

    constructor(private readonly workflowService: WorkflowService) {}

    /**
     * <p>Une erreur laisse la liste vide plutôt que de faire échouer l'écran : consulter un dossier
     * ne doit pas dépendre de la disponibilité de son historique.</p>
     */
    private charger(): void {
        this.illisible = false;
        if (!this._resourceId) {
            this.decisions = [];
            return;
        }
        this.chargement = true;
        this.workflowService.getValidationHistory(this._resourceId).subscribe({
            next: (decisions) => {
                // De la plus récente à la plus ancienne : c'est la dernière décision qu'on vient
                // lire, pas la première.
                this.decisions = [...decisions].reverse();
                this.chargement = false;
            },
            error: () => {
                this.decisions = [];
                this.illisible = true;
                this.chargement = false;
            }
        });
    }
}
