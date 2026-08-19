import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgPrimeModule } from '../../../prime-ng.module';
import { WorkflowService } from '../../services/workflow.service';
import { ValidationHistoryDto, ValidationFieldValueDto, WorkflowStateDto } from '../../models/workflow.model';

/**
 * Traçabilité d'un circuit de validation : qui a décidé quoi, quand, sur quelles bases — et où le
 * dossier en est maintenant.
 *
 * <p>Vaut pour tout dossier suivi par le moteur : un document, une non-conformité, une action
 * corrective, une demande. Trois écrans rendaient cette même frise avec trois marquages divergents
 * — libellés normalisés ici, bruts là, valeurs saisies affichées ou non, rejet reconnu strictement
 * ou pas du tout. Celui-ci les remplace tous, sur le rendu qu'avait la fiche documentaire.</p>
 *
 * <p>La frise se lit dans l'ordre des décisions — la plus ancienne en haut, comme le rend le
 * serveur — et se termine par l'<b>étape en cours</b>, marquée d'une couleur que n'a aucune
 * décision passée : l'historique dit ce qui a été fait, ce nœud dit ce qui est attendu.</p>
 *
 * <p>Deux alimentations, selon l'hôte :</p>
 * <ul>
 *   <li><b>autonome</b> — {@code [resourceId]} : le composant charge lui-même l'historique et
 *       l'état courant (non-conformités, plans d'action) ;</li>
 *   <li><b>piloté</b> — {@code [historique]}, et {@code [etat]} ou {@code [etapeCourante]} :
 *       l'hôte a déjà chargé, rien n'est redemandé (documents, demandes).</li>
 * </ul>
 *
 * @example
 * <app-workflow-historique [resourceId]="plan.id" objet="cette action" />
 */
@Component({
    selector: 'app-workflow-historique',
    standalone: true,
    imports: [CommonModule, NgPrimeModule],
    template: `
        <div class="bg-white border border-slate-200 rounded-lg overflow-hidden">

            <div class="px-5 py-4 border-b border-slate-200 flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h3 class="m-0 text-lg font-bold text-slate-800">
                        <i class="pi pi-verified text-sky-500 mr-2"></i>{{ titre }}
                    </h3>
                    <p class="m-0 mt-1 text-sm text-slate-500">
                        Décisions prises sur {{ objet }} — auteurs, motifs et informations saisies.
                    </p>
                </div>
                @if (close.observed) {
                    <button pButton label="Retour à la liste" icon="pi pi-arrow-left"
                            class="p-button-text p-button-secondary p-button-sm"
                            (click)="close.emit()"></button>
                }
            </div>

            <div class="p-5">
                @if (enChargement) {
                    <div class="flex justify-center py-6">
                        <i class="pi pi-spin pi-spinner text-3xl text-slate-300"></i>
                    </div>
                } @else if (illisible) {
                    <div class="flex flex-col items-center gap-2 py-8 text-center text-slate-400">
                        <i class="pi pi-lock text-3xl"></i>
                        <span class="text-sm text-slate-500">L'historique n'a pas pu être lu.</span>
                        <span class="text-xs">
                            Il se peut qu'il ne vous soit pas ouvert : il nomme des personnes et
                            rapporte leurs appréciations.
                        </span>
                    </div>
                } @else if (!entrees.length && !nomEtapeEnCours && !termine) {
                    <div class="flex flex-col items-center gap-2 py-8 text-slate-400">
                        <i class="pi pi-inbox text-3xl"></i>
                        <span class="text-sm">Aucune décision n'a encore été prise sur {{ objet }}.</span>
                    </div>
                } @else {
                    <!-- Frise : la plus ancienne décision en haut, comme le rend le serveur ; le
                         dossier « descend » jusqu'à son étape en cours. -->
                    <div class="flex flex-col">
                        @for (entree of entrees; track $index; let dernier = $last) {
                            <div class="flex gap-3">

                                <!-- Colonne repère -->
                                <div class="flex flex-col items-center">
                                    <span class="flex items-center justify-center w-8 h-8 rounded-full bg-slate-50 border border-slate-200 shrink-0">
                                        <i [class]="icone(entree) + ' ' + couleur(entree)"></i>
                                    </span>
                                    @if (!dernier || nomEtapeEnCours || termine) {
                                        <span class="flex-1 bg-slate-200" style="width: 1px; min-height: 1.5rem;"></span>
                                    }
                                </div>

                                <!-- Contenu -->
                                <div class="flex-1 min-w-0 pb-4">
                                    <div class="flex items-center gap-2 flex-wrap">
                                        <span class="font-bold text-slate-800 text-sm">{{ entree.decision }}</span>
                                        @if (entree.stepName) {
                                            <span class="text-xs text-slate-400">depuis « {{ entree.stepName }} »</span>
                                        }
                                    </div>

                                    <div class="text-xs text-slate-500 mt-1 flex items-center gap-3 flex-wrap">
                                        @if (entree.decisionDate) {
                                            <span><i class="pi pi-clock mr-1"></i>{{ entree.decisionDate | date: 'dd/MM/yyyy à HH:mm' }}</span>
                                        }
                                        <!-- Le nom est celui consigné avec la décision. À défaut — décisions
                                             antérieures à sa mise en place — il ne reste que l'identifiant
                                             technique, présenté comme tel plutôt que déguisé en nom. -->
                                        @if (entree.validatorFullName) {
                                            <span><i class="pi pi-user mr-1"></i>{{ entree.validatorFullName }}</span>
                                        } @else if (entree.validatorUserId) {
                                            <span>
                                                <i class="pi pi-user mr-1"></i>
                                                <span class="font-mono"
                                                      pTooltip="Nom non consigné : décision antérieure à son enregistrement">{{ entree.validatorUserId }}</span>
                                            </span>
                                        }
                                    </div>

                                    @if (entree.comments) {
                                        <p class="mt-2 mb-0 text-sm text-slate-700 bg-slate-50 rounded-lg p-2">{{ entree.comments }}</p>
                                    }

                                    <!-- Valeurs saisies au moment de la décision : c'est la partie que ni
                                         l'historique des versions ni la piste d'audit ne conservent. -->
                                    @if (entree.fieldValues?.length) {
                                        <div class="mt-2">
                                            <div class="text-[11px] uppercase text-slate-400 mb-1">Informations saisies</div>
                                            <div class="flex flex-col gap-1">
                                                @for (valeur of entree.fieldValues; track $index) {
                                                    <div class="text-xs flex gap-2">
                                                        <span class="text-slate-500">{{ libelleChamp(valeur) }} :</span>
                                                        <span class="text-slate-800 font-medium">{{ valeur.value || '—' }}</span>
                                                    </div>
                                                }
                                            </div>
                                        </div>
                                    }
                                </div>
                            </div>
                        }

                        <!-- L'étape en cours ferme la frise, dans une couleur qu'aucune décision
                             passée ne porte : l'historique dit ce qui a été fait, ce nœud dit ce
                             qui est attendu — sans le confondre avec la dernière décision. -->
                        @if (termine) {
                            <div class="flex gap-3">
                                <div class="flex flex-col items-center">
                                    <span class="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-600 shrink-0">
                                        <i class="pi pi-flag-fill text-white text-sm"></i>
                                    </span>
                                </div>
                                <div class="flex-1 min-w-0">
                                    <div class="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                                        <div class="text-[11px] uppercase tracking-wide font-bold text-emerald-600">Circuit terminé</div>
                                        <p class="text-xs text-emerald-700 m-0 mt-1">Toutes les décisions du circuit ont été prises.</p>
                                    </div>
                                </div>
                            </div>
                        } @else if (nomEtapeEnCours) {
                            <div class="flex gap-3">
                                <div class="flex flex-col items-center">
                                    <span class="flex items-center justify-center w-8 h-8 rounded-full bg-sky-600 shrink-0">
                                        <i class="pi pi-hourglass text-white text-sm"></i>
                                    </span>
                                </div>
                                <div class="flex-1 min-w-0">
                                    <div class="rounded-lg border border-sky-200 bg-sky-50 p-3">
                                        <div class="text-[11px] uppercase tracking-wide font-bold text-sky-600">Étape en cours</div>
                                        <div class="text-sm font-bold text-sky-900 mt-0.5">{{ nomEtapeEnCours }}</div>
                                        <p class="text-xs text-sky-700 m-0 mt-1">Le dossier attend une décision à cette étape.</p>
                                    </div>
                                </div>
                            </div>
                        }
                    </div>
                }
            </div>
        </div>
    `
})
export class WorkflowHistoriqueComponent {
    /** Dossier dont on lit l'historique. Un changement relance la lecture — mode autonome. */
    @Input() set resourceId(valeur: string | undefined | null) {
        this._resourceId = valeur ?? undefined;
        this.charger();
    }
    get resourceId(): string | undefined {
        return this._resourceId;
    }
    private _resourceId?: string;

    /** Nom du dossier tel qu'on en parle : « ce dossier », « cette action », « le document X ». */
    @Input() objet = 'ce dossier';

    @Input() titre = 'Traçabilité du circuit';

    /** Historique déjà chargé par l'hôte — mode piloté, aucun appel réseau. */
    @Input() historique?: ValidationHistoryDto[];

    /** Chargement mené par l'hôte, en mode piloté. */
    @Input() loading = false;

    /** État courant déjà chargé par l'hôte, en mode piloté. */
    @Input() etat?: WorkflowStateDto;

    /** Nom de l'étape en cours quand l'hôte ne détient que lui — prime sur {@link etat}. */
    @Input() etapeCourante?: string;

    /** Circuit clos, quand l'hôte le sait sans détenir l'état complet. */
    @Input() termine?: boolean;

    /** Présent chez les hôtes qui offrent un retour à la liste ; le bouton ne s'affiche que suivi. */
    @Output() close = new EventEmitter<void>();

    private decisionsChargees: ValidationHistoryDto[] = [];
    private etatCharge?: WorkflowStateDto;
    private chargementInterne = false;

    /**
     * La lecture a échoué — service indisponible, ou historique non ouvert à l'appelant.
     *
     * <p>Distingué de « aucune décision » : afficher un dossier vierge à qui n'a pas le droit de
     * lire, ou à qui le service n'a pas répondu, c'est affirmer que rien n'a été décidé.</p>
     */
    illisible = false;

    constructor(private readonly workflowService: WorkflowService) {}

    get entrees(): ValidationHistoryDto[] {
        return this.historique ?? this.decisionsChargees;
    }

    get enChargement(): boolean {
        return this.loading || this.chargementInterne;
    }

    private get etatEffectif(): WorkflowStateDto | undefined {
        return this.etat ?? this.etatCharge;
    }

    get circuitTermine(): boolean {
        return this.termine ?? this.etatEffectif?.status === 'TERMINE';
    }

    get nomEtapeEnCours(): string | undefined {
        if (this.circuitTermine) {
            return undefined;
        }
        return this.etapeCourante || this.etatEffectif?.currentStateName || undefined;
    }

    /**
     * Distingue une approbation d'un rejet à partir du libellé enregistré.
     *
     * <p>L'historique conserve le libellé de la transition franchie — celui qu'a lu le décideur —
     * et non sa valeur machine. Un circuit peut donc nommer ses actions librement ; le repérage
     * reste volontairement tolérant, et retombe sur un rendu neutre s'il ne reconnaît rien.</p>
     */
    estRejet(entree: ValidationHistoryDto): boolean {
        const decision = (entree.decision ?? '').toLowerCase();
        return decision.includes('rejet') || decision.includes('refus')
            || decision.includes('reject') || decision.includes('renvo');
    }

    estApprobation(entree: ValidationHistoryDto): boolean {
        const decision = (entree.decision ?? '').toLowerCase();
        return (
            !this.estRejet(entree) &&
            (decision.includes('valid') || decision.includes('approu') || decision.includes('accept')
                || decision.includes('soumettre') || decision.includes('soumis'))
        );
    }

    icone(entree: ValidationHistoryDto): string {
        if (this.estRejet(entree)) return 'pi pi-times-circle';
        if (this.estApprobation(entree)) return 'pi pi-check-circle';
        return 'pi pi-arrow-right-arrow-left';
    }

    couleur(entree: ValidationHistoryDto): string {
        if (this.estRejet(entree)) return 'text-red-600';
        if (this.estApprobation(entree)) return 'text-emerald-600';
        return 'text-slate-500';
    }

    /** L'intitulé du champ au moment de la saisie ; à défaut, son nom technique. */
    libelleChamp(valeur: ValidationFieldValueDto): string {
        return valeur.fieldLabel || valeur.fieldName || valeur.fieldCode || 'Champ';
    }

    /**
     * Mode autonome : l'historique et l'état courant sont lus ensemble — c'est l'état qui dit où
     * le dossier en est, l'historique ne disant que d'où il vient.
     *
     * <p>Une erreur laisse la liste vide plutôt que de faire échouer l'écran : consulter un dossier
     * ne doit pas dépendre de la disponibilité de son historique. L'état est encore moins exigé —
     * illisible, la frise perd son dernier nœud, pas ses décisions.</p>
     */
    private charger(): void {
        this.illisible = false;
        this.etatCharge = undefined;
        if (!this._resourceId) {
            this.decisionsChargees = [];
            return;
        }
        this.chargementInterne = true;
        this.workflowService.getValidationHistory(this._resourceId).subscribe({
            next: (decisions) => {
                this.decisionsChargees = decisions ?? [];
                this.chargementInterne = false;
            },
            error: () => {
                this.decisionsChargees = [];
                this.illisible = true;
                this.chargementInterne = false;
            }
        });
        this.workflowService.getWorkflowStateForResource(this._resourceId).subscribe({
            next: (etat) => (this.etatCharge = etat),
            error: () => (this.etatCharge = undefined)
        });
    }
}
