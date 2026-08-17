import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { AccordionModule } from 'primeng/accordion';
import { ButtonModule } from 'primeng/button';
import { PanelModule } from 'primeng/panel';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import { WorkflowDto, WorkflowStepDto, WorkflowTransitionDto } from '../../models/workflow.model';
import { WorkflowDiagramComponent } from './workflow-diagram.component';

/** Sévérité de tag admise par PrimeNG. */
type Severite = 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast';

/** Une étape, augmentée de ce qui ne se lit que par rapport aux autres. */
interface EtapeVue extends WorkflowStepDto {
    rang: number;
    premiere: boolean;
    sansSuite: boolean;
    severite: Severite;
    sortantes: WorkflowTransitionDto[];
    entrantes: { transition: WorkflowTransitionDto; depuis: WorkflowStepDto }[];
}

/** Les actions d'une étape, regroupées pour l'onglet « Transitions ». */
interface GroupeTransitions {
    cle: string;
    libelle: string;
    severite: Severite;
    items: WorkflowTransitionDto[];
}

/**
 * Fiche de consultation d'un circuit de validation, diagramme état-transition compris.
 *
 * <p>Un circuit ne se comprend pas en lisant ses étapes l'une après l'autre : ce qui compte est ce
 * qui les relie — quelle action mène où, laquelle renvoie en arrière, laquelle clôt le dossier, et à
 * quelle condition. Trois vues du même circuit sont donc présentées : ses étapes, ses actions
 * regroupées par étape d'origine, et son graphe.</p>
 *
 * <p>Les boutons d'action sont montrés <b>tels qu'ils s'afficheront</b> au décideur, désactivés :
 * c'est la seule façon de vérifier l'apparence d'une action sans dérouler le circuit pour de vrai.</p>
 */
@Component({
    selector: 'app-workflow-detail',
    standalone: true,
    imports: [CommonModule, PanelModule, TabsModule, AccordionModule, TagModule, ButtonModule,
        TooltipModule, WorkflowDiagramComponent],
    templateUrl: './workflow-detail.component.html'
})
export class WorkflowDetailComponent {

    /** Apparence par défaut d'une action, quand le circuit n'en fixe pas. */
    private static readonly APPARENCE: Record<string, { icone: string; severite: string }> = {
        APPROUVE: { icone: 'pi pi-check', severite: 'success' },
        REJETE: { icone: 'pi pi-times', severite: 'danger' },
        CLOTURE: { icone: 'pi pi-lock', severite: 'warn' }
    };

    private static readonly LIBELLES_TYPE: Record<string, string> = {
        DOCUMENT: 'Documents',
        NON_CONFORMITE: 'Non-conformités',
        PLAN_ACTION: "Plans d'action",
        DEMANDE_DOCUMENT: 'Demandes sur documents'
    };

    circuit?: WorkflowDto;
    etapes: EtapeVue[] = [];
    groupes: GroupeTransitions[] = [];
    nombreTransitions = 0;

    /**
     * Étape ouverte dans l'accordéon — la première, pour ne pas présenter un pavé fermé.
     *
     * <p>Chaîne vide plutôt que {@code null} : c'est ce que la liaison bidirectionnelle de
     * l'accordéon accepte, et une valeur qui ne correspond à aucun panneau les laisse tous fermés.</p>
     */
    etapeOuverte = '';
    groupeOuvert = '';

    @Input({ required: true })
    set workflow(circuit: WorkflowDto | undefined) {
        this.circuit = circuit;
        this.etapes = this.construireLesEtapes(circuit);
        this.groupes = this.construireLesGroupes(this.etapes);
        this.nombreTransitions = this.etapes.reduce((total, etape) => total + etape.sortantes.length, 0);
        this.etapeOuverte = this.etapes.length ? this.cleDe(this.etapes[0]) : '';
        this.groupeOuvert = this.groupes.length ? this.groupes[0].cle : '';
    }

    // ------------------------------------------------------------------ construction des vues

    private construireLesEtapes(circuit?: WorkflowDto): EtapeVue[] {
        const triees = [...(circuit?.steps ?? [])]
            .sort((a, b) => (a.stepOrder ?? 0) - (b.stepOrder ?? 0));

        return triees.map((etape, index) => {
            const sortantes = etape.transitions ?? [];
            const entrantes = triees.flatMap((autre) =>
                (autre.transitions ?? [])
                    .filter((transition) => transition.toStepCode
                        && transition.toStepCode === etape.code && !transition.terminal)
                    .map((transition) => ({ transition, depuis: autre })));

            const premiere = index === 0;
            const sansSuite = sortantes.length === 0
                || sortantes.every((transition) => transition.terminal || !transition.toStepCode);

            return {
                ...etape,
                rang: index + 1,
                premiere,
                sansSuite,
                sortantes,
                entrantes,
                severite: premiere ? 'info' : sansSuite ? 'success' : 'secondary'
            } satisfies EtapeVue;
        });
    }

    private construireLesGroupes(etapes: EtapeVue[]): GroupeTransitions[] {
        return etapes
            .filter((etape) => etape.sortantes.length > 0)
            .map((etape) => ({
                cle: this.cleDe(etape),
                libelle: etape.nomEtape,
                severite: etape.severite,
                items: etape.sortantes
            }));
    }

    // ------------------------------------------------------------------ présentation

    cleDe(etape: EtapeVue | WorkflowStepDto): string {
        return (etape as EtapeVue).code || `etape-${(etape as EtapeVue).rang ?? 0}`;
    }

    libelleType(type?: string): string {
        return WorkflowDetailComponent.LIBELLES_TYPE[type ?? ''] ?? (type ?? '—');
    }

    /** Icône telle qu'elle s'affichera : celle du circuit, ou celle que porte la décision. */
    icone(transition: WorkflowTransitionDto): string {
        return transition.icon
            || WorkflowDetailComponent.APPARENCE[String(transition.decision)]?.icone
            || 'pi pi-check';
    }

    /** Couleur telle qu'elle s'affichera, dans le vocabulaire de `p-button`. */
    severite(transition: WorkflowTransitionDto): Severite {
        return (transition.severity
            || WorkflowDetailComponent.APPARENCE[String(transition.decision)]?.severite
            || 'success') as Severite;
    }

    /** Nature d'une action, en clair : avancer, revenir en arrière, ou mettre en clôture. */
    libelleNature(decision: unknown): string {
        if (decision === 'REJETE') {
            return 'Rejet';
        }
        return decision === 'CLOTURE' ? 'Clôture' : 'Approbation';
    }

    /** Où mène une action, en clair. */
    destination(transition: WorkflowTransitionDto): string {
        if (transition.terminal || !transition.toStepCode) {
            return 'clôt le circuit';
        }
        const arrivee = this.etapes.find((etape) => etape.code === transition.toStepCode);
        return `mène à « ${arrivee?.nomEtape ?? transition.toStepCode} »`;
    }

    /** Une action qui remonte vers une étape antérieure : c'est un retour en arrière. */
    estUnRetour(transition: WorkflowTransitionDto, depuis: EtapeVue): boolean {
        if (transition.terminal || !transition.toStepCode) {
            return false;
        }
        const arrivee = this.etapes.find((etape) => etape.code === transition.toStepCode);
        return arrivee !== undefined && arrivee.rang < depuis.rang;
    }

    /** Nature d'une étape, dite en un mot. */
    nature(etape: EtapeVue): string {
        if (etape.premiere) {
            return 'Première étape';
        }
        return etape.sansSuite ? 'Dernière étape' : 'Étape intermédiaire';
    }

    /** Habilitation d'une étape, en termes lisibles : les désignations ne sont pas des rôles. */
    habilitation(role?: string | null): string {
        if (!role) {
            return 'Non précisée';
        }
        if (role === '@CREATEUR') {
            return 'Le créateur du dossier';
        }
        if (role === '@TITULAIRE') {
            return 'Le titulaire du dossier';
        }
        return role;
    }
}
