import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import { WorkflowStateDto } from '../../../../models/workflow.model';
import { WorkflowActionsComponent } from '@features/workflow/execution/workflow-actions.component';

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

    auteur?: string;
    iconeFichier?: string;
    iconeEtape?: string;
    delaiRelatif?: string;
    statutDelai?: string;
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
        <div class="rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900 overflow-hidden shadow-xs">
            <!-- En-tête de la section -->
            <div class="flex items-center gap-2 px-4 py-3 border-b border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900">
                <i [class]="icone" class="text-primary text-base"></i>
                <span class="font-semibold text-base text-surface-900 dark:text-surface-0">{{ titre }}</span>
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
                <p-table 
                    [value]="lignes" 
                    [loading]="chargement" 
                    [showLoader]="false" 
                    styleClass="p-datatable-sm"
                    [paginator]="lignes.length > 8" 
                    [rows]="8"
                    [rowHover]="true">
                    
                    <!-- ─── HEADER DE LA TABLE ─────────────────────────────────── -->
                    <ng-template pTemplate="header">
                        <tr>
                            <th class="py-3 px-4 !bg-slate-50 dark:!bg-surface-800 text-surface-700 dark:text-surface-300 font-semibold text-sm border-b border-surface-200 dark:border-surface-700">
                                <div class="flex items-center gap-1.5">
                                    <span>Dossier</span>
                                    <i class="pi pi-sort-alt text-xs opacity-50"></i>
                                </div>
                            </th>
                            <th class="py-3 px-4 !bg-slate-50 dark:!bg-surface-800 text-surface-700 dark:text-surface-300 font-semibold text-sm border-b border-surface-200 dark:border-surface-700 w-56">
                                <div class="flex items-center gap-1.5">
                                    <span>Étape</span>
                                    <i class="pi pi-sort-alt text-xs opacity-50"></i>
                                </div>
                            </th>
                            <th class="py-3 px-4 !bg-slate-50 dark:!bg-surface-800 text-surface-700 dark:text-surface-300 font-semibold text-sm border-b border-surface-200 dark:border-surface-700 w-52">
                                <div class="flex items-center gap-1.5">
                                    <span>État / Délai</span>
                                    <i class="pi pi-sort-alt text-xs opacity-50"></i>
                                </div>
                            </th>
                            <th class="py-3 px-4 !bg-slate-50 dark:!bg-surface-800 text-surface-700 dark:text-surface-300 font-semibold text-sm border-b border-surface-200 dark:border-surface-700 text-right w-80">
                                <span>Action</span>
                            </th>
                        </tr>
                    </ng-template>

                    <!-- ─── CORPS DE LA TABLE ──────────────────────────────────── -->
                    <ng-template pTemplate="body" let-ligne>
                        <tr class="hover:bg-surface-50/80 dark:hover:bg-surface-800/50 transition-colors border-b border-surface-200 dark:border-surface-700">
                            
                            <!-- 1. Colonne Dossier avec liseré gauche orange -->
                            <td class="py-3 px-4 border-l-[4px] border-l-amber-500">
                                <div class="flex items-center gap-3">
                                    <!-- Icône selon extension (PDF, Word, etc.) -->
                                    <div class="w-11 h-11 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40 flex items-center justify-center shrink-0 p-1.5 shadow-xs">
                                        <img [src]="ligne.iconeFichier || 'assets/images/doc-file.png'" class="w-7 h-7 object-contain" alt="doc icon" />
                                    </div>
                                    <!-- Détails Dossier -->
                                    <div class="flex flex-col min-w-0">
                                        <span *ngIf="ligne.reference" class="font-mono text-[11px] font-medium text-surface-500 dark:text-surface-400 tracking-wide leading-tight">
                                            {{ ligne.reference }}
                                        </span>
                                        <div class="flex items-center gap-2 my-0.5">
                                            <span class="font-semibold text-sm text-surface-900 dark:text-surface-50 truncate" [title]="ligne.titre">
                                                {{ ligne.titre }}
                                            </span>
                                            <span *ngIf="ligne.badge" class="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300 border border-surface-200 dark:border-surface-700 shrink-0">
                                                {{ ligne.badge }}
                                            </span>
                                        </div>
                                        <div class="flex items-center gap-1.5 text-xs text-surface-500 dark:text-surface-400">
                                            <i class="pi pi-user text-[11px]"></i>
                                            <span class="truncate">{{ ligne.auteur || 'Non renseigné' }}</span>
                                        </div>
                                    </div>
                                </div>
                            </td>

                            <!-- 2. Colonne Étape -->
                            <td class="py-3 px-4">
                                <div class="flex items-center gap-3">
                                    <div class="w-9 h-9 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-200/70 dark:border-amber-800/40 shadow-xs">
                                        <i [class]="ligne.iconeEtape || 'pi pi-pencil'" class="text-sm"></i>
                                    </div>
                                    <div class="flex flex-col">
                                        <span class="font-semibold text-sm text-surface-900 dark:text-surface-100">
                                            {{ ligne.etape || 'Rédaction' }}
                                        </span>
                                        <span *ngIf="ligne.depuis" class="text-xs text-surface-400 dark:text-surface-500">
                                            Depuis le {{ ligne.depuis }}
                                        </span>
                                    </div>
                                </div>
                            </td>

                            <!-- 3. Colonne État / Délai -->
                            <td class="py-3 px-4">
                                <div class="flex flex-col gap-1.5">
                                    <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800/30 w-fit">
                                        <i class="pi pi-clock text-[10px]"></i>
                                        <span>{{ ligne.statutDelai || 'À soumettre' }}</span>
                                    </span>
                                    <div *ngIf="ligne.delaiRelatif" class="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                                        <i class="pi pi-clock text-[11px]"></i>
                                        <span>{{ ligne.delaiRelatif }}</span>
                                    </div>
                                </div>
                            </td>

                            <!-- 4. Colonne Action -->
                            <td class="py-3 px-4 text-right">
                                <div class="flex items-center justify-end gap-2">
                                    @if (nombreDActions(ligne) > 1) {
                                        <p-button label="Décider" icon="pi pi-pencil" [outlined]="true"
                                                  size="small"
                                                  [pTooltip]="nombreDActions(ligne) + ' décisions possibles : ouvrez la fiche'"
                                                  tooltipPosition="left"
                                                  (onClick)="voirDetail.emit(ligne)"></p-button>
                                    } @else if (nombreDActions(ligne) === 1) {
                                        <app-workflow-actions
                                            [deposerFichier]="ligne.deposerFichier"
                                            [resourceId]="ligne.id"
                                            [reference]="ligne.reference || ligne.titre"
                                            [state]="ligne.workflowState"
                                            (executed)="traite.emit()"></app-workflow-actions>
                                    } @else {
                                        <span class="text-xs text-surface-400">
                                            Aucune action requise
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
