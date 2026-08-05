import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MessageModule } from 'primeng/message';
import { TagModule } from 'primeng/tag';
import { WorkflowStateDto } from '../../models/workflow.model';

/**
 * Dit à l'utilisateur où en est un dossier et ce qu'on attend de lui.
 *
 * <p>Les écrans montraient une étape et, selon les cas, des boutons. Rien ne disait ce que
 * l'utilisateur devait en faire : celui qui n'avait aucune action voyait un dossier immobile sans
 * savoir s'il devait agir, attendre, ou relancer quelqu'un — et celui qui en avait ne savait pas
 * qu'une saisie était exigée avant de pouvoir décider. Le message se déduit de ce que le serveur
 * rend, jamais d'une table d'états écrite en parallèle : c'est le circuit qui sait, et lui seul.</p>
 *
 * @example
 * <app-workflow-guidance [state]="nc.workflowState" objet="cette non-conformité" />
 */
@Component({
    selector: 'app-workflow-guidance',
    standalone: true,
    imports: [CommonModule, MessageModule, TagModule],
    template: `
        @if (state) {
            <div class="wf-guidance" [ngClass]="'wf-guidance--' + ton">
                
                <div class="wf-guidance-texte">
                    <div class="wf-guidance-titre">{{ titre }}</div>
                    <div class="wf-guidance-detail">{{ detail }}</div>
                    @if (decisionsEnAttente.length) {
                        <div class="wf-guidance-attente-liste">
                            <i class="pi pi-lock mr-1"></i>
                            @for (attente of decisionsEnAttente; track attente.condition) {
                                <div>
                                    <span class="wf-guidance-liste">« {{ attente.libelle }} »</span>
                                    sera possible lorsque {{ attente.conditionLibelle || attente.condition }}.
                                </div>
                            }
                        </div>
                    }
                    @if (aDesChampsASaisir) {
                        <div class="wf-guidance-champs">
                            <i class="pi pi-pencil mr-1"></i>
                            {{ champsRequis.length ? 'À renseigner avant de décider :' : 'Informations facultatives :' }}
                            <span class="wf-guidance-liste">{{ libellesDesChamps }}</span>
                        </div>
                    }
                </div>
            </div>
        } @else if (messageSansCircuit) {
            <div class="wf-guidance wf-guidance--neutre">
                <i class="wf-guidance-icone pi pi-info-circle"></i>
                <div class="wf-guidance-texte">
                    <div class="wf-guidance-detail">{{ messageSansCircuit }}</div>
                </div>
            </div>
        }
    `,
    styles: [`
        .wf-guidance {
            display: flex;
            gap: 0.75rem;
            align-items: flex-start;
            padding: 0.875rem 1rem;
            border-radius: 0.75rem;
            border: 1px solid transparent;
            border-left-width: 4px;
            font-size: 0.875rem;
            line-height: 1.5;
        }
        .wf-guidance--action {
            background: rgba(34, 197, 94, 0.07);
            border-color: rgba(34, 197, 94, 0.35);
            border-left-color: #22c55e;
        }
        .wf-guidance--attente {
            background: rgba(59, 130, 246, 0.07);
            border-color: rgba(59, 130, 246, 0.3);
            border-left-color: #3b82f6;
        }
        .wf-guidance--fin {
            background: rgba(100, 116, 139, 0.08);
            border-color: rgba(100, 116, 139, 0.3);
            border-left-color: #64748b;
        }
        .wf-guidance--neutre {
            background: var(--surface-50, #f8fafc);
            border-color: var(--surface-200, #e2e8f0);
            border-left-color: var(--surface-400, #94a3b8);
        }
        .wf-guidance-icone { font-size: 1.125rem; margin-top: 0.125rem; }
        .wf-guidance--action .wf-guidance-icone { color: #16a34a; }
        .wf-guidance--attente .wf-guidance-icone { color: #2563eb; }
        .wf-guidance--fin .wf-guidance-icone,
        .wf-guidance--neutre .wf-guidance-icone { color: #64748b; }
        .wf-guidance-texte { flex: 1 1 auto; min-width: 0; }
        .wf-guidance-titre { font-weight: 700; color: var(--text-color, #0f172a); }
        .wf-guidance-detail { color: var(--text-color-secondary, #475569); margin-top: 0.125rem; }
        .wf-guidance-champs {
            margin-top: 0.5rem;
            padding-top: 0.5rem;
            border-top: 1px dashed var(--surface-300, #cbd5e1);
            color: var(--text-color-secondary, #475569);
            font-size: 0.8125rem;
        }
        .wf-guidance-liste { font-weight: 600; color: var(--text-color, #0f172a); }
        .wf-guidance-attente-liste {
            margin-top: 0.5rem;
            padding-top: 0.5rem;
            border-top: 1px dashed var(--surface-300, #cbd5e1);
            color: var(--text-color-secondary, #475569);
            font-size: 0.8125rem;
        }
    `]
})
export class WorkflowGuidanceComponent {
    /** État rendu par le serveur. Absent, seul {@link messageSansCircuit} s'affiche. */
    @Input() state?: WorkflowStateDto | null;

    /** Nom du dossier tel qu'on en parle à l'utilisateur : « cette non-conformité », « cette action ». */
    @Input() objet = 'ce dossier';

    /** Ce qu'il faut dire quand le dossier n'est suivi par aucun circuit. */
    @Input() messageSansCircuit?: string;

    /**
     * Libellés lisibles des habilitations.
     *
     * <p>Le serveur rend le nom technique du rôle, et {@code @TITULAIRE} pour une étape réservée à
     * la personne désignée sur le dossier. Les afficher tels quels reviendrait à répondre « qui
     * attend-on ? » par « @TITULAIRE ».</p>
     */
    private static readonly LIBELLES: Record<string, string> = {
        AGENT: "l'agent concerné",
        PILOTE: 'le pilote du processus',
        RESPONSABLE_QUALITE: 'le responsable qualité',
        '@TITULAIRE': 'la personne désignée sur ce dossier'
    };

    get actions() {
        return this.state?.allowedActions ?? [];
    }

    get estTermine(): boolean {
        const statut = (this.state?.status ?? '').toUpperCase();
        return !this.actions.length && (statut === 'APPROVED' || statut === 'TERMINE' || statut === 'CLOTURE');
    }

    get ton(): 'action' | 'attente' | 'fin' {
        if (this.actions.length) {
            return 'action';
        }
        return this.estTermine ? 'fin' : 'attente';
    }

    get icone(): string {
        return { action: 'pi-bolt', attente: 'pi-hourglass', fin: 'pi-flag' }[this.ton];
    }

    get titre(): string {
        const etape = this.state?.currentStateName;
        if (this.ton === 'fin') {
            return 'Circuit terminé';
        }
        if (this.ton === 'action') {
            return etape ? `À vous de jouer — étape « ${etape} »` : 'À vous de jouer';
        }
        return etape ? `En attente — étape « ${etape} »` : 'En attente';
    }

    get detail(): string {
        if (this.ton === 'fin') {
            return `Aucune décision n'est plus attendue sur ${this.objet}.`;
        }
        if (this.ton === 'action') {
            const libelles = this.actions.map((a) => `« ${a.libelle} »`);
            const liste = libelles.length > 1
                ? `${libelles.slice(0, -1).join(', ')} ou ${libelles[libelles.length - 1]}`
                : libelles[0];
            // Le commentaire est exigé à toute décision : le dire ici évite de chercher où
            // consigner ce qu'on a fait, et évite surtout de le redemander dans un champ à part.
            return `Vous pouvez ${liste}. Les boutons se trouvent au pied de cette fiche, et un `
                + `commentaire vous sera demandé au moment de décider.`;
        }
        const attendu = this.libelleDeLHabilitation(this.state?.currentStepRole);
        return attendu
            ? `${this.majuscule(attendu)} doit se prononcer avant que ${this.objet} n'avance. Vous n'avez rien à faire pour l'instant.`
            : `Personne d'autre que le responsable de cette étape ne peut faire avancer ${this.objet}. Vous n'avez rien à faire pour l'instant.`;
    }

    /**
     * Décisions que le dossier n'admet pas encore.
     *
     * <p>Affichées à tous et non aux seuls décideurs : ce n'est pas une question d'habilitation,
     * c'est le dossier qui n'est pas prêt, et celui qui doit agir ailleurs pour lever la condition
     * a précisément besoin de le savoir.</p>
     */
    get decisionsEnAttente() {
        return this.state?.pendingDecisions ?? [];
    }

    get champsRequis() {
        return (this.state?.currentStepFields ?? []).filter((champ) => champ.required);
    }

    get aDesChampsASaisir(): boolean {
        return this.ton === 'action' && (this.state?.currentStepFields?.length ?? 0) > 0;
    }

    get libellesDesChamps(): string {
        const champs = this.champsRequis.length ? this.champsRequis : (this.state?.currentStepFields ?? []);
        return champs.map((champ) => champ.fieldLabel || champ.fieldName).join(', ');
    }

    private libelleDeLHabilitation(role?: string | null): string | null {
        if (!role) {
            return null;
        }
        return WorkflowGuidanceComponent.LIBELLES[role] ?? role.toLowerCase().replace(/_/g, ' ');
    }

    private majuscule(texte: string): string {
        return texte.charAt(0).toUpperCase() + texte.slice(1);
    }
}
