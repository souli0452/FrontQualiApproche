import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import { WorkflowActionsComponent } from '../../../shared/workflow/workflow-actions.component';
import { WorkflowStateDto } from '../../../models/workflow.model';

/**
 * Une ligne de la liste de travail, réduite à ce qu'il faut pour décider.
 *
 * <p>Documents et demandes n'ont pas la même forme, mais on en attend la même chose : savoir de
 * quel dossier il s'agit, où il en est, et pouvoir le prendre en charge. Ce contrat commun évite
 * deux tableaux jumeaux qui auraient divergé au premier correctif.</p>
 */
export interface LigneATraiter {
    /** Ressource du circuit : c'est sur elle que porte la décision. */
    id: string;
    /** Référence courte et stable — numéro de document. */
    reference?: string;
    /** Ce dont il s'agit, en clair. */
    titre: string;
    /** Précision de second rang : nature de la demande, service émetteur… */
    detail?: string;
    /** Qualification affichée en pastille (« Suppression », type de document…). */
    badge?: string;
    badgeSeverite?: string;
    /** Étape du circuit, telle que le serveur la nomme. */
    etape?: string;
    /** Date d'entrée du dossier, déjà mise en forme par l'appelant. */
    depuis?: string;
    /** État du circuit : ce sont ses actions ouvertes qui deviennent les boutons de la ligne. */
    workflowState?: WorkflowStateDto;
    /**
     * Dépôt d'une pièce réclamée par l'étape, rendant la référence qui la désigne.
     *
     * <p>Propre à la ligne : la pièce se range sous le dossier concerné. Absent, le champ n'est pas
     * présenté — l'étape reste alors à décider depuis la fiche du dossier.</p>
     */
    deposerFichier?: (fichier: File) => Observable<string>;
}

/**
 * Liste de travail documentaire : ce qui attend une décision de l'utilisateur, et de quoi la prendre.
 *
 * <p>La vue d'ensemble présentait des courbes. Elles disent l'activité du mois, elles ne disent pas
 * ce qu'il y a à faire aujourd'hui — et rien ne s'y prenait en charge : il fallait deviner quels
 * dossiers attendaient, ouvrir la liste des documents ou celle des demandes, y retrouver les lignes
 * une à une, puis ouvrir chaque fiche. Les non-conformités posaient la question autrement, en
 * plaçant les dossiers à traiter au premier plan ; le module documentaire fait de même.</p>
 *
 * <p>Les décisions offertes sont celles que le serveur déclare ouvertes sur chaque ligne —
 * {@code app-workflow-actions}, le même composant que sur la fiche d'une non-conformité. Aucune
 * règle n'est rejouée ici : l'écran ne propose jamais ce que le moteur refuserait, et le dialogue de
 * décision recueille le commentaire et les champs exigés par l'étape.</p>
 */
@Component({
    selector: 'app-qms-a-traiter',
    standalone: true,
    imports: [CommonModule, TableModule, TagModule, ButtonModule, TooltipModule, WorkflowActionsComponent],
    template: `
        <div class="rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900 overflow-hidden">
            <div class="flex items-center gap-2 px-4 py-3 border-b border-surface-200 dark:border-surface-700">
                <i [class]="icone" class="text-primary"></i>
                <span class="font-semibold">{{ titre }}</span>
                @if (lignes.length) {
                    <p-tag severity="warn" [value]="lignes.length + ''"></p-tag>
                }
                <span class="flex-1"></span>
                @if (lienLibelle) {
                    <p-button [label]="lienLibelle" icon="pi pi-arrow-right" iconPos="right"
                              size="small" [text]="true" (onClick)="voirTout.emit()"></p-button>
                }
            </div>

            @if (lignes.length) {
                <p-table [value]="lignes" [loading]="chargement" styleClass="p-datatable-sm"
                         [paginator]="lignes.length > 8" [rows]="8">
                    <ng-template pTemplate="header">
                        <tr>
                            <th>Dossier</th>
                            <th class="w-56">Étape</th>
                            <th class="w-96 text-right">Décision</th>
                        </tr>
                    </ng-template>
                    <ng-template pTemplate="body" let-ligne>
                        <tr>
                            <td>
                                <div class="flex flex-col gap-1 py-1">
                                    <div class="flex flex-wrap items-center gap-2">
                                        @if (ligne.reference) {
                                            <span class="font-mono text-xs text-surface-500">{{ ligne.reference }}</span>
                                        }
                                        <span class="font-medium">{{ ligne.titre }}</span>
                                        @if (ligne.badge) {
                                            <p-tag [severity]="ligne.badgeSeverite || 'secondary'"
                                                   [value]="ligne.badge"></p-tag>
                                        }
                                    </div>
                                    @if (ligne.detail) {
                                        <span class="text-xs text-surface-500">{{ ligne.detail }}</span>
                                    }
                                </div>
                            </td>
                            <td>
                                <div class="flex flex-col gap-1">
                                    <span class="text-sm">{{ ligne.etape || '—' }}</span>
                                    @if (ligne.depuis) {
                                        <span class="text-xs text-surface-400">depuis le {{ ligne.depuis }}</span>
                                    }
                                </div>
                            </td>
                            <td class="text-right">
                                <!-- Les boutons viennent du circuit, avec leur libellé, leur icône et
                                     leur couleur : « Prendre en charge », « Approuver », « Retourner
                                     au rédacteur » selon ce que l'étape prévoit. -->
                                <div class="flex justify-end">
                                    @if (nombreDActions(ligne) > 1) {
                                        <!-- Plusieurs décisions ouvertes : elles ne tiennent pas dans
                                             une cellule sans s'y écraser, et l'on ne choisit pas
                                             entre « Approuver », « Demander un complément » et
                                             « Retourner au rédacteur » sans avoir lu le dossier. La
                                             ligne renvoie donc à la fiche, où les mêmes décisions
                                             figurent avec ce qui permet de trancher. -->
                                        <p-button label="Détail" icon="pi pi-eye" [outlined]="true"
                                                  size="small"
                                                  [pTooltip]="nombreDActions(ligne) + ' décisions vous sont ouvertes : ouvrez la fiche pour choisir'"
                                                  tooltipPosition="left"
                                                  (onClick)="voirDetail.emit(ligne)"></p-button>
                                    } @else if (nombreDActions(ligne) === 1) {
                                        <!-- Une seule issue : elle se prend d'ici, sans détour. -->
                                        <app-workflow-actions
                                            [deposerFichier]="ligne.deposerFichier"
                                            [resourceId]="ligne.id"
                                            [reference]="ligne.reference || ligne.titre"
                                            [state]="ligne.workflowState"
                                            (executed)="traite.emit()"></app-workflow-actions>
                                    } @else {
                                        <!-- L'état du circuit n'a pas pu être obtenu : la ligne reste
                                             affichée, mais sans boutons elle se lirait comme un écran
                                             en panne. Le dire vaut mieux que le silence. -->
                                        <span class="text-xs text-surface-400">
                                            Décisions momentanément indisponibles
                                        </span>
                                    }
                                </div>
                            </td>
                        </tr>
                    </ng-template>
                </p-table>
            } @else {
                <div class="flex flex-col items-center gap-2 py-8 text-surface-400">
                    <i class="pi pi-check-circle text-2xl"></i>
                    <span class="text-sm">{{ messageVide }}</span>
                </div>
            }
        </div>
    `
})
export class QmsATraiterComponent {
    @Input() titre = 'À traiter';
    @Input() icone = 'pi pi-inbox';
    @Input() lignes: LigneATraiter[] = [];
    @Input() chargement = false;
    @Input() messageVide = 'Rien n\'attend votre décision.';
    /** Libellé du renvoi vers la liste complète ; absent, aucun renvoi n'est proposé. */
    @Input() lienLibelle?: string;

    /** Une décision a été enregistrée : à l'appelant de relire ses listes. */
    @Output() traite = new EventEmitter<void>();
    @Output() voirTout = new EventEmitter<void>();
    /** La fiche du dossier est demandée : c'est l'appelant qui sait où elle se trouve. */
    @Output() voirDetail = new EventEmitter<LigneATraiter>();

    /**
     * Nombre de décisions que le circuit ouvre sur cette ligne.
     *
     * <p>Une seule se prend d'ici. Au-delà, la ligne renvoie à la fiche : trois boutons dans une
     * cellule deviennent illisibles, et surtout on ne choisit pas entre approuver, demander un
     * complément et retourner au rédacteur sans avoir lu le dossier.</p>
     */
    nombreDActions(ligne: LigneATraiter): number {
        return ligne.workflowState?.allowedActions?.length ?? 0;
    }
}
