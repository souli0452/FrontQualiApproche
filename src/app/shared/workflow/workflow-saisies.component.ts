import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SaisieDto, WorkflowStateDto } from '../../models/workflow.model';
import { ChoixDeChampService } from './choix-de-champ.service';

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
                                <span class="wf-saisies-valeur">{{ valeurDe(saisie) }}</span>
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
export class WorkflowSaisiesComponent implements OnChanges {

    /**
     * Un identifiant brut, tel que les champs alimentés par le référentiel en enregistrent —
     * « Processus destinataire » porte l'UUID d'une structure, pas son nom.
     */
    private static readonly UUID =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    /**
     * Les sources dont les valeurs sont des identifiants. La saisie ne dit pas de quelle source
     * elle vient — le moteur ne transporte que des chaînes — mais un UUID est unique parmi
     * toutes : chercher dans leur réunion suffit.
     */
    private static readonly SOURCES_D_IDENTIFIANTS = ['@STRUCTURES', '@UTILISATEURS'];

    /** État du circuit du dossier, tel que le serveur le joint à la ressource. */
    @Input() state?: WorkflowStateDto | null;

    /** Titre du bloc. Vide, aucun titre n'est affiché — utile dans un onglet qui en porte déjà un. */
    @Input() titre = 'Informations recueillies';

    /**
     * Ce qu'il faut dire quand le dossier n'a encore rien recueilli. Vide, le bloc s'efface :
     * mieux vaut ne rien montrer qu'un cadre vide sur une fiche à peine ouverte.
     */
    @Input() messageSiVide = '';

    /** Libellés connus des référentiels, indexés par identifiant. Rempli à la demande. */
    private libelles = new Map<string, string>();
    private chargementLance = false;

    constructor(private readonly choixDeChamp: ChoixDeChampService) {}

    /**
     * Charge les dictionnaires de libellés, seulement si une valeur à traduire existe : la
     * plupart des dossiers n'en portent aucune, et interroger les référentiels sur chaque fiche
     * serait payer pour rien. Le service met les réponses en cache pour la session.
     */
    ngOnChanges(): void {
        if (this.chargementLance || !this.contientDesIdentifiants()) {
            return;
        }
        this.chargementLance = true;
        for (const source of WorkflowSaisiesComponent.SOURCES_D_IDENTIFIANTS) {
            this.choixDeChamp.choix(source).subscribe((choix) => {
                for (const c of choix) {
                    this.libelles.set(c.value, c.label);
                }
            });
        }
    }

    get saisies(): SaisieDto[] {
        return (this.state?.saisies ?? []).filter((saisie) => {
            const valeur = (saisie.value ?? '').trim();
            // Un UUID ne dit rien à personne : quand une réponse en est un, c'est son libellé au
            // référentiel qui s'affiche. Introuvable — structure supprimée, référentiel
            // injoignable — la ligne s'efface plutôt que de montrer l'identifiant.
            return valeur.length > 0
                && (!WorkflowSaisiesComponent.UUID.test(valeur) || this.libelles.has(valeur));
        });
    }

    /** Valeur telle qu'elle se lit : celle saisie, ou son libellé quand c'est un identifiant. */
    valeurDe(saisie: SaisieDto): string {
        const valeur = (saisie.value ?? '').trim();
        return this.libelles.get(valeur) ?? valeur;
    }

    private contientDesIdentifiants(): boolean {
        return (this.state?.saisies ?? []).some((saisie) =>
            WorkflowSaisiesComponent.UUID.test((saisie.value ?? '').trim())
            || WorkflowSaisiesComponent.UUID.test((saisie.auteur ?? '').trim()));
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
        // L'auteur est le nom du décideur quand le serveur l'a enregistré, sinon son identifiant
        // brut — cas des décisions antérieures à cet enregistrement. L'identifiant se traduit
        // alors par l'annuaire ; s'il n'y figure plus, l'origine se réduit à l'étape et à la
        // date, comme le fait déjà l'historique.
        const auteur = (saisie.auteur ?? '').trim();
        if (auteur && !WorkflowSaisiesComponent.UUID.test(auteur)) {
            morceaux.push(auteur);
        } else if (this.libelles.has(auteur)) {
            morceaux.push(this.libelles.get(auteur)!);
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
