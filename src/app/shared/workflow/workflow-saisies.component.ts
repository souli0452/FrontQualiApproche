import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SaisieDto, WorkflowStateDto } from '../../models/workflow.model';

/**
 * Ce que le dossier a recueilli au fil de son circuit, rassemblé au même endroit.
 *
 * <p>Les champs demandés à chaque étape étaient saisis, transmis au moteur, puis introuvables :
 * pour qu'une réponse reparaisse sur la fiche, il fallait qu'un module métier l'ait recopiée dans
 * une colonne à lui — ce que faisaient la non-conformité pour l'agent imputé et le plan d'action
 * pour son compte rendu, et personne pour le reste. Tout le reste n'existait que dans l'onglet
 * d'historique, éparpillé décision par décision, et disparaissait de la fiche dès l'étape
 * suivante.</p>
 *
 * <p>Les valeurs viennent de `workflowState.saisies`, que le serveur joint au dossier comme à
 * chaque ligne de liste : le composant n'appelle rien et vaut pour n'importe quelle ressource
 * suivie par le moteur — non-conformité, plan d'action, demande documentaire. Il ne connaît aucun
 * nom de champ : ce que le circuit demande, il l'affiche.</p>
 *
 * @example
 * <app-workflow-saisies [state]="nc.workflowState" />
 */
@Component({
    selector: 'app-workflow-saisies',
    standalone: true,
    imports: [CommonModule],
    template: `
        @if (saisies.length) {
            <div class="wf-saisies">
                @if (titre) {
                    <div class="wf-saisies-titre">{{ titre }}</div>
                }
                <dl class="wf-saisies-liste">
                    @for (saisie of saisies; track saisie.fieldName) {
                        <div class="wf-saisies-ligne">
                            <dt>{{ saisie.fieldLabel || saisie.fieldName }}</dt>
                            <dd>
                                <span class="wf-saisies-valeur">{{ saisie.value }}</span>
                                <span class="wf-saisies-origine">
                                    {{ origine(saisie) }}
                                </span>
                            </dd>
                        </div>
                    }
                </dl>
            </div>
        } @else if (messageSiVide) {
            <div class="wf-saisies wf-saisies--vide">{{ messageSiVide }}</div>
        }
    `,
    styles: [`
        .wf-saisies {
            border: 1px solid var(--surface-200, #e2e8f0);
            border-radius: 0.75rem;
            padding: 0.875rem 1rem;
            font-size: 0.875rem;
            background: var(--surface-0, #fff);
        }
        .wf-saisies--vide { color: var(--text-color-secondary, #64748b); font-style: italic; }
        .wf-saisies-titre {
            font-weight: 700;
            color: var(--text-color, #0f172a);
            margin-bottom: 0.5rem;
        }
        .wf-saisies-liste { margin: 0; }
        .wf-saisies-ligne {
            display: grid;
            grid-template-columns: minmax(9rem, 15rem) 1fr;
            gap: 0.5rem 1rem;
            padding: 0.4rem 0;
            border-top: 1px dashed var(--surface-200, #e2e8f0);
        }
        .wf-saisies-ligne:first-child { border-top: 0; }
        .wf-saisies-ligne dt {
            color: var(--text-color-secondary, #475569);
            font-weight: 600;
        }
        .wf-saisies-ligne dd { margin: 0; min-width: 0; }
        .wf-saisies-valeur {
            color: var(--text-color, #0f172a);
            white-space: pre-wrap;
            overflow-wrap: anywhere;
        }
        .wf-saisies-origine {
            display: block;
            margin-top: 0.125rem;
            color: var(--text-color-secondary, #64748b);
            font-size: 0.75rem;
        }
        /* La grille à deux colonnes tasse tout sur un écran étroit : les libellés y passent
           au-dessus de leur valeur plutôt que de se réduire à deux mots par ligne. */
        @media (max-width: 640px) {
            .wf-saisies-ligne { grid-template-columns: 1fr; gap: 0.125rem; }
        }
    `]
})
export class WorkflowSaisiesComponent {

    /** État du circuit du dossier, tel que le serveur le joint à la ressource. */
    @Input() state?: WorkflowStateDto | null;

    /** Titre du bloc. Vide, aucun titre n'est affiché — utile dans un onglet qui en porte déjà un. */
    @Input() titre = 'Informations recueillies';

    /**
     * Ce qu'il faut dire quand le dossier n'a encore rien recueilli. Vide, le bloc s'efface :
     * mieux vaut ne rien montrer qu'un cadre vide sur une fiche à peine ouverte.
     */
    @Input() messageSiVide = '';

    get saisies(): SaisieDto[] {
        return (this.state?.saisies ?? []).filter((saisie) => (saisie.value ?? '').trim().length > 0);
    }

    /**
     * D'où vient la donnée : l'étape qui l'a demandée, qui l'a saisie et quand.
     *
     * <p>Une valeur sans origine se lit comme une propriété de la fiche ; or c'est une réponse
     * donnée par quelqu'un, à un moment du circuit, et cela change ce qu'on en fait.</p>
     */
    origine(saisie: SaisieDto): string {
        const morceaux: string[] = [];
        if (saisie.stepName) {
            morceaux.push(saisie.stepName);
        }
        if (saisie.auteur) {
            morceaux.push(saisie.auteur);
        }
        if (saisie.decisionDate) {
            const date = new Date(saisie.decisionDate);
            if (!Number.isNaN(date.getTime())) {
                morceaux.push(date.toLocaleDateString('fr-FR'));
            }
        }
        return morceaux.join(' • ');
    }
}
