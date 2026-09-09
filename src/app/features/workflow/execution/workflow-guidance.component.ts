import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MessageModule } from 'primeng/message';
import { TagModule } from 'primeng/tag';
import { WorkflowStateDto, WorkflowActionDto, WorkflowStepFieldDto } from '../models';

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
        .wf-guidance--rejet {
            background: rgba(239, 68, 68, 0.07);
            border-color: rgba(239, 68, 68, 0.35);
            border-left-color: #ef4444;
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
        .wf-guidance--rejet .wf-guidance-icone { color: #dc2626; }
        .wf-guidance--attente .wf-guidance-icone { color: #2563eb; }
        .wf-guidance--fin .wf-guidance-icone,
        .wf-guidance--neutre .wf-guidance-icone { color: #64748b; }
        .wf-guidance-texte { flex: 1 1 auto; min-width: 0; }
        .wf-guidance-titre { font-weight: 700; color: var(--text-color, #0f172a); }
        .wf-guidance--rejet .wf-guidance-titre { color: #b91c1c; }
        
        /* Dark mode (.app-dark & .dark) */
        :host-context(.app-dark) .wf-guidance--neutre,
        :host-context(.dark) .wf-guidance--neutre {
            background: #1e293b !important;
            border-color: #334155 !important;
            border-left-color: #64748b !important;
        }
        :host-context(.app-dark) .wf-guidance--neutre .wf-guidance-icone,
        :host-context(.dark) .wf-guidance--neutre .wf-guidance-icone {
            color: #94a3b8 !important;
        }
        :host-context(.app-dark) .wf-guidance--action,
        :host-context(.dark) .wf-guidance--action {
            background: rgba(34, 197, 94, 0.15) !important;
            border-color: rgba(34, 197, 94, 0.3) !important;
            border-left-color: #22c55e !important;
        }
        :host-context(.app-dark) .wf-guidance--action .wf-guidance-icone,
        :host-context(.dark) .wf-guidance--action .wf-guidance-icone {
            color: #4ade80 !important;
        }
        :host-context(.app-dark) .wf-guidance--attente,
        :host-context(.dark) .wf-guidance--attente {
            background: rgba(59, 130, 246, 0.15) !important;
            border-color: rgba(59, 130, 246, 0.3) !important;
            border-left-color: #3b82f6 !important;
        }
        :host-context(.app-dark) .wf-guidance--attente .wf-guidance-icone,
        :host-context(.dark) .wf-guidance--attente .wf-guidance-icone {
            color: #60a5fa !important;
        }
        :host-context(.app-dark) .wf-guidance--fin,
        :host-context(.dark) .wf-guidance--fin {
            background: rgba(100, 116, 139, 0.2) !important;
            border-color: rgba(100, 116, 139, 0.4) !important;
            border-left-color: #94a3b8 !important;
        }
        :host-context(.app-dark) .wf-guidance--fin .wf-guidance-icone,
        :host-context(.dark) .wf-guidance--fin .wf-guidance-icone {
            color: #94a3b8 !important;
        }
        :host-context(.app-dark) .wf-guidance--rejet,
        :host-context(.dark) .wf-guidance--rejet {
            background: rgba(220, 38, 38, 0.1) !important;
            border-color: rgba(220, 38, 38, 0.3) !important;
            border-left-color: #ef4444 !important;
        }
        :host-context(.app-dark) .wf-guidance--rejet .wf-guidance-titre,
        :host-context(.dark) .wf-guidance--rejet .wf-guidance-titre {
            color: #fca5a5 !important;
        }
        :host-context(.app-dark) .wf-guidance--rejet .wf-guidance-icone,
        :host-context(.dark) .wf-guidance--rejet .wf-guidance-icone {
            color: #f87171 !important;
        }
        :host-context(.app-dark) .wf-guidance-titre,
        :host-context(.dark) .wf-guidance-titre {
            color: #f8fafc !important;
        }
        :host-context(.app-dark) .wf-guidance-detail,
        :host-context(.dark) .wf-guidance-detail {
            color: #cbd5e1 !important;
        }
        :host-context(.app-dark) .wf-guidance-liste,
        :host-context(.dark) .wf-guidance-liste {
            color: #f8fafc !important;
        }
        :host-context(.app-dark) .wf-guidance-champs,
        :host-context(.dark) .wf-guidance-champs,
        :host-context(.app-dark) .wf-guidance-attente-liste,
        :host-context(.dark) .wf-guidance-attente-liste {
            border-top-color: #334155 !important;
            color: #94a3b8 !important;
        }

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

    /** Le dossier parent (ex: Non-Conformité). */
    @Input() parentDemande: any = null;

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
        '@TITULAIRE': 'la personne désignée sur ce dossier',
        // Sans cette entrée, l'écran annonçait « @createur doit se prononcer » : la sentinelle
        // partait telle quelle dans la phrase, faute d'être traduite.
        '@CREATEUR': "l'auteur de ce dossier"
    };

    get actions() {
        return this.state?.allowedActions ?? [];
    }

    /**
     * L'utilisateur est écarté de cette étape parce qu'il a soumis le dossier lui-même.
     *
     * <p>Subordonné à l'absence d'action : l'administration passe outre la séparation des
     * signatures et reçoit les boutons, auquel cas lui dire qu'il n'a rien à faire serait faux.</p>
     */
    get ecarteCommeAuteur(): boolean {
        return !this.actions.length && !!this.state?.ecarteCommeAuteur;
    }

    get estTermine(): boolean {
        const statut = (this.state?.status ?? '').toUpperCase();
        return !this.actions.length && (statut === 'APPROVED' || statut === 'TERMINE' || statut === 'CLOTURE');
    }

    get isRejet(): boolean {
        const parent = this.parentDemande;
        const state = this.state;
        const status = parent?.status || state?.status;
        if (status === 'DRAFT' || status === 'Brouillon') return false;

        const STEP_ORDER: Record<string, number> = {
            'SOUMISSION': 1,
            'RECEPTION': 2,
            'VALIDATION_RQ': 3,
            'IMPUTATION': 4,
            'TRAITEMENT': 5,
            'VALIDATION': 6,
            'VALIDATION_RS': 7,
            'SUIVI_RQ': 8,
            'CLOTURE': 9,

            // Support des codes numériques du moteur de workflow
            '1': 1, // SOUMISSION
            '2': 2, // RECEPTION
            '3': 3, // VALIDATION_RQ
            '4': 4, // IMPUTATION
            '5': 5, // TRAITEMENT
            '6': 6, // VALIDATION
            '7': 7, // VALIDATION_RS
            '8': 8, // SUIVI_RQ
            '9': 9  // CLOTURE
        };

        const currentStep = parent?.etatTraitement || state?.currentStateCode || '';
        const currentOrder = STEP_ORDER[currentStep] || 0;

        const saisies = state?.saisies || [];
        const docRejetId = parent?.docRejet?.id?.toLowerCase();
        const docRejetNom = (parent?.docRejet?.nom || parent?.docRejet?.nomFichier || '').toLowerCase();

        const rejectionSaisie = saisies.find((s: any) => {
            const val = (s.value || '').toLowerCase();
            const fieldName = (s.fieldName || '').toLowerCase();
            const fieldLabel = (s.fieldLabel || '').toLowerCase();

            return fieldName.includes('rejet') || 
                   fieldLabel.includes('rejet') ||
                   fieldName === 'docrejet' ||
                   (docRejetId && val.includes(docRejetId)) ||
                   (docRejetNom && val.includes(docRejetNom));
        });

        if (rejectionSaisie) {
            const rejectOrder = STEP_ORDER[rejectionSaisie.stepCode || ''] || 0;
            if (rejectOrder > currentOrder) {
                return true; // Rejet actif
            }
        }

        // Cas de repli : retour à l'étape initiale SOUMISSION
        if (currentStep === 'SOUMISSION' && status !== 'DRAFT') {
            return true;
        }

        return false;
    }

    get ton(): 'action' | 'attente' | 'fin' | 'rejet' {
        if (this.isRejet) {
            return 'rejet';
        }
        if (this.actions.length) {
            return 'action';
        }
        return this.estTermine ? 'fin' : 'attente';
    }

    get icone(): string {
        return { action: 'pi-bolt', rejet: 'pi-exclamation-triangle', attente: 'pi-hourglass', fin: 'pi-flag' }[this.ton];
    }

    get titre(): string {
        const etape = this.state?.currentStateName;
        if (this.ton === 'fin') {
            return 'Circuit terminé';
        }
        if (this.ton === 'rejet') {
            return etape ? `Dossier rejeté — étape « ${etape} »` : 'Dossier rejeté';
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
        if (this.ton === 'rejet') {
            if (this.actions.length) {
                const libelles = this.actions.map((a: WorkflowActionDto) => `« ${a.libelle} »`);
                const liste = libelles.length > 1
                    ? `${libelles.slice(0, -1).join(', ')} ou ${libelles[libelles.length - 1]}`
                    : libelles[0];
                return `Cette non-conformité a été rejetée. Vous devez la corriger et ${liste}. Les boutons se trouvent au pied de cette fiche.`;
            } else {
                const attendu = this.libelleDeLHabilitation(this.state?.currentStepRole);
                return attendu
                    ? `Cette non-conformité a été rejetée. ${this.majuscule(attendu)} doit la corriger et la soumettre de nouveau. Vous n'avez rien à faire pour l'instant.`
                    : `Cette non-conformité a été rejetée et est en cours de correction. Vous n'avez rien à faire pour l'instant.`;
            }
        }
        if (this.ton === 'action') {
            const libelles = this.actions.map((a: WorkflowActionDto) => `« ${a.libelle} »`);
            const liste = libelles.length > 1
                ? `${libelles.slice(0, -1).join(', ')} ou ${libelles[libelles.length - 1]}`
                : libelles[0];
            // Le commentaire est exigé à toute décision : le dire ici évite de chercher où
            // consigner ce qu'on a fait, et évite surtout de le redemander dans un champ à part.
            return `Vous pouvez ${liste}. Les boutons se trouvent au pied de cette fiche, et un `
                + `commentaire vous sera demandé au moment de décider.`;
        }
        const attendu = this.libelleDeLHabilitation(this.state?.currentStepRole);
        // Répondre « le pilote du processus doit se prononcer » à un pilote, sur le dossier qu'il a
        // lui-même déposé, est exact et incompréhensible : c'est bien un pilote qu'on attend, mais
        // pas celui-là. Ce n'est pas une question de rôle, et le rôle ne pouvait pas la répondre.
        if (this.ecarteCommeAuteur) {
            return attendu
                ? `Vous avez soumis ${this.objet} : à cette étape, la décision revient à un autre `
                    + `signataire que son auteur — ${attendu}. Vous n'avez rien à faire pour l'instant.`
                : `Vous avez soumis ${this.objet} : à cette étape, la décision revient à un autre `
                    + `signataire que son auteur. Vous n'avez rien à faire pour l'instant.`;
        }
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

    get champsRequis(): WorkflowStepFieldDto[] {
        return (this.state?.currentStepFields ?? []).filter((champ: WorkflowStepFieldDto) => champ.required);
    }

    get aDesChampsASaisir(): boolean {
        return this.ton === 'action' && (this.state?.currentStepFields?.length ?? 0) > 0;
    }

    get libellesDesChamps(): string {
        const champs = this.champsRequis.length ? this.champsRequis : (this.state?.currentStepFields ?? []);
        return champs.map((champ: WorkflowStepFieldDto) => champ.fieldLabel || champ.fieldName).join(', ');
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
