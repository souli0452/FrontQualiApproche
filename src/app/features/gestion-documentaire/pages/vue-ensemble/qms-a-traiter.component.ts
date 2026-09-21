import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { MenuModule } from 'primeng/menu';
import { PaginatorModule } from 'primeng/paginator';
import { MenuItem, MessageService } from 'primeng/api';

import { WorkflowActionDto, WorkflowStateDto } from '../../../../models/workflow.model';
import { DecisionConfirmee, WorkflowDecisionDialogComponent } from '@features/workflow/execution/workflow-decision-dialog.component';
import { WorkflowService } from '@features/workflow/services/workflow.service';

/**
 * Une ligne de la liste de travail, réduite à ce qu'il faut pour décider.
 */
export interface LigneATraiter {
    /** Ressource du circuit : c'est sur elle que porte la décision. */
    id: string;
    /** Identifiant du document visé (identique à id pour un document, documentId pour une demande). */
    documentId?: string;
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
    nomFichier?: string;
    iconeFichier?: string;
    iconeEtape?: string;
    delaiRelatif?: string;
    statutDelai?: string;
    /** État du circuit : ce sont ses actions ouvertes qui deviennent les boutons de la ligne. */
    workflowState?: WorkflowStateDto;
    deposerFichier?: (fichier: File) => Observable<string>;
}

@Component({
    selector: 'app-qms-a-traiter',
    standalone: true,
    imports: [
        CommonModule,
        TableModule,
        TagModule,
        ButtonModule,
        TooltipModule,
        MenuModule,
        PaginatorModule,
        WorkflowDecisionDialogComponent
    ],
    styles: [`
        :host ::ng-deep .paginator-nc {
            .p-paginator {
                background: transparent !important;
                border: none !important;
                padding: 0 !important;

                .p-paginator-pages .p-paginator-page {
                    border-radius: 9999px !important;
                    min-width: 2rem !important;
                    height: 2rem !important;
                    margin: 0 0.125rem !important;
                    font-size: 0.875rem !important;

                    &.p-highlight,
                    &.p-paginator-page-selected {
                        background: var(--secondary-color, #0084ca) !important;
                        color: #ffffff !important;
                    }
                }

                .p-paginator-first,
                .p-paginator-prev,
                .p-paginator-next,
                .p-paginator-last {
                    border-radius: 9999px !important;
                    min-width: 2rem !important;
                    height: 2rem !important;
                    background: white !important;
                    border: 1px solid var(--p-surface-200, #e4e4e7) !important;
                    color: var(--p-surface-600, #52525b) !important;

                    &:hover:not(.p-disabled) {
                        background: var(--p-surface-100, #f4f4f5) !important;
                    }
                }
            }
        }

        :host-context(.dark) ::ng-deep .paginator-nc,
        :host-context([class*='app-dark']) ::ng-deep .paginator-nc {
            .p-paginator {
                .p-paginator-first,
                .p-paginator-prev,
                .p-paginator-next,
                .p-paginator-last {
                    background: var(--p-surface-800, #27272a) !important;
                    border-color: var(--p-surface-700, #3f3f46) !important;
                    color: var(--p-surface-200, #e4e4e7) !important;

                    &:hover:not(.p-disabled) {
                        background: var(--p-surface-700, #3f3f46) !important;
                    }
                }
            }
        }
    `],
    template: `
        <div class="rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900 overflow-hidden shadow-xs flex flex-col h-full">
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
                <div class="overflow-x-auto flex-grow">
                    <p-table 
                        [value]="paginatedLignes" 
                        [loading]="chargement" 
                        [showLoader]="false" 
                        styleClass="p-datatable-sm"
                        [rowHover]="true">
                        
                        <!-- ─── HEADER DE LA TABLE (3 COLONNES) ───────────────────── -->
                        <ng-template pTemplate="header">
                            <tr>
                                <th class="py-2.5 px-4 !bg-slate-50 dark:!bg-surface-800 text-surface-700 dark:text-surface-300 font-semibold text-xs border-b border-surface-200 dark:border-surface-700">
                                    <span>Dossier</span>
                                </th>
                                <th class="py-2.5 px-4 !bg-slate-50 dark:!bg-surface-800 text-surface-700 dark:text-surface-300 font-semibold text-xs border-b border-surface-200 dark:border-surface-700 w-44">
                                    <span>Étape</span>
                                </th>
                                <th class="py-2.5 px-3 !bg-slate-50 dark:!bg-surface-800 text-surface-700 dark:text-surface-300 font-semibold text-xs border-b border-surface-200 dark:border-surface-700 text-center w-14">
                                    <span>Action</span>
                                </th>
                            </tr>
                        </ng-template>

                        <!-- ─── CORPS DE LA TABLE ──────────────────────────────────── -->
                        <ng-template pTemplate="body" let-ligne>
                            <tr class="hover:bg-surface-50/80 dark:hover:bg-surface-800/50 transition-colors border-b border-surface-200 dark:border-surface-700">
                                
                                <!-- 1. Colonne Dossier avec liseré gauche accentué -->
                                <td class="py-2.5 px-4 border-l-[3px] border-l-primary">
                                    <div class="flex items-center gap-3">
                                        <!-- Icône fichier -->
                                        <div class="w-10 h-10 rounded-lg bg-blue-50/80 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40 flex items-center justify-center shrink-0 p-1 shadow-2xs">
                                            <img [src]="ligne.iconeFichier || 'assets/images/doc-file.png'" class="w-6 h-6 object-contain" alt="doc icon" />
                                        </div>
                                        <!-- Détails Dossier -->
                                        <div class="flex flex-col min-w-0">
                                            <div class="flex items-center gap-1.5 leading-none mb-1">
                                                <span *ngIf="ligne.reference" class="font-mono text-[11px] font-semibold text-surface-500 dark:text-surface-400 tracking-wide">
                                                    {{ ligne.reference }}
                                                </span>
                                                <span *ngIf="ligne.badge" class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 border border-surface-200 dark:border-surface-700 shrink-0">
                                                    {{ ligne.badge }}
                                                </span>
                                            </div>
                                            <span class="font-semibold text-xs text-surface-900 dark:text-surface-50 truncate max-w-[280px]" [title]="ligne.titre">
                                                {{ ligne.titre }}
                                            </span>
                                            <div class="flex items-center gap-1 text-[11px] text-surface-400 dark:text-surface-500 mt-0.5">
                                                <i class="pi pi-user text-[10px]"></i>
                                                <span class="truncate">{{ ligne.auteur || 'Non renseigné' }}</span>
                                            </div>
                                        </div>
                                    </div>
                                </td>

                                <!-- 2. Colonne Étape (avec statut temporel) -->
                                <td class="py-2.5 px-4">
                                    <div class="flex items-center gap-2.5">
                                        <div class="w-7 h-7 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-200/70 dark:border-amber-800/40 shadow-2xs">
                                            <i [class]="ligne.iconeEtape || 'pi pi-pencil'" class="text-xs"></i>
                                        </div>
                                        <div class="flex flex-col min-w-0">
                                            <span class="font-semibold text-xs text-surface-900 dark:text-surface-100 truncate">
                                                {{ ligne.etape || 'Rédaction' }}
                                            </span>
                                            <div class="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                                                <i class="pi pi-clock text-[9px]"></i>
                                                <span class="truncate">{{ ligne.delaiRelatif || ('Depuis le ' + ligne.depuis) }}</span>
                                            </div>
                                        </div>
                                    </div>
                                </td>

                                <!-- 3. Colonne Action (3 points verticaux) -->
                                <td class="py-2.5 px-3 text-center">
                                    <p-button 
                                        icon="pi pi-ellipsis-v" 
                                        [rounded]="true" 
                                        [text]="true" 
                                        size="small"
                                        (click)="openRowMenu($event, ligne, menu)"
                                        pTooltip="Actions disponibles"
                                        tooltipPosition="left"
                                        styleClass="w-8 h-8 text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800">
                                    </p-button>
                                </td>

                            </tr>
                        </ng-template>
                    </p-table>
                </div>

                <!-- Footer / Paginator (Style Non-Conformités NC, sans texte ni sélecteur) -->
                <div class="flex items-center justify-end px-3 py-2 bg-surface-0 dark:bg-surface-900 border-t border-surface-200 dark:border-surface-700 mt-auto paginator-nc">
                    <p-paginator 
                        [first]="first" 
                        [rows]="rows" 
                        [totalRecords]="lignes.length" 
                        (onPageChange)="onPageChange($event)">
                    </p-paginator>
                </div>
            } @else {
                <div class="flex flex-col items-center gap-2 py-8 text-surface-400">
                    <i class="pi pi-check-circle text-2xl"></i>
                    <span class="text-sm">{{ messageVide }}</span>
                </div>
            }
        </div>

        <!-- Menu contextuel flottant pour les 3 points verticaux -->
        <p-menu #menu [model]="menuItems" [popup]="true" appendTo="body"></p-menu>

        <!-- Dialogue de décision de workflow -->
        <app-workflow-decision-dialog
            [reference]="selectedLigne?.reference || selectedLigne?.titre"
            [etapeCourante]="selectedLigne?.etape"
            [action]="selectedAction"
            [stepFields]="selectedLigne?.workflowState?.currentStepFields"
            [deposerFichier]="selectedLigne?.deposerFichier"
            [loading]="actionLoading"
            [visible]="dialogueDecisionOuvert"
            (visibleChange)="dialogueDecisionOuvert = $event"
            (confirm)="executerDecision($event)">
        </app-workflow-decision-dialog>
    `
})
export class QmsATraiterComponent {
    @Input() titre = 'À traiter';
    @Input() icone = 'pi pi-inbox';
    @Input() lignes: LigneATraiter[] = [];
    @Input() chargement = false;
    @Input() messageVide = 'Rien n\'attend votre décision.';
    @Input() lienLibelle?: string;
    @Input() recordName = 'documents';

    /** Événements émis */
    @Output() traite = new EventEmitter<void>();
    @Output() voirTout = new EventEmitter<void>();
    @Output() voirDetail = new EventEmitter<LigneATraiter>();
    @Output() apercu = new EventEmitter<LigneATraiter>();
    @Output() modifier = new EventEmitter<LigneATraiter>();

    // Pagination (Calquée sur NC)
    first = 0;
    rows = 5;
    // État du Menu contextuel et Workflow
    menuItems: MenuItem[] = [];
    selectedLigne?: LigneATraiter;
    selectedAction?: WorkflowActionDto;
    dialogueDecisionOuvert = false;
    actionLoading = false;

    constructor(
        private readonly workflowService: WorkflowService,
        private readonly messageService: MessageService
    ) {}

    get paginatedLignes(): LigneATraiter[] {
        if (!this.lignes || this.lignes.length <= this.rows) return this.lignes;
        return this.lignes.slice(this.first, this.first + this.rows);
    }

    onPageChange(event: any): void {
        this.first = event.first;
        this.rows = event.rows;
    }

    /**
     * Construit le menu d'actions contextuel lors du clic sur les 3 points verticaux.
     */
    openRowMenu(event: Event, ligne: LigneATraiter, menu: any): void {
        this.selectedLigne = ligne;
        const items: MenuItem[] = [];

        // 1. Action Aperçu, proposée pour tout document : le volet peint ce qu'il sait peindre
        //    et, pour le reste, l'annonce et offre l'enregistrement. La condition de format
        //    retirait l'entrée des lignes dont le nom de fichier n'était pas connu.
        items.push({
            label: 'Aperçu du document',
            icon: 'pi pi-eye',
            command: () => this.apercu.emit(ligne)
        });

        // 2. Action Modifier (Prioritaire et très vite visible)
        items.push({
            label: 'Modifier le document',
            icon: 'pi pi-pencil',
            command: () => this.modifier.emit(ligne)
        });

        // 3. Actions de Workflow dynamiques (Décisions du circuit)
        const actions = ligne.workflowState?.allowedActions || [];
        if (actions.length > 0) {
            items.push({ separator: true });
            actions.forEach(action => {
                items.push({
                    label: action.libelle,
                    icon: action.icon || this.getWorkflowActionIcon(action),
                    command: () => this.ouvrirDecision(action, ligne)
                });
            });
        }

        // 4. Détails / Fiche complète
        items.push({ separator: true });
        items.push({
            label: 'Consulter la fiche complète',
            icon: 'pi pi-external-link',
            command: () => this.voirDetail.emit(ligne)
        });

        this.menuItems = items;
        menu.toggle(event);
    }

    private getWorkflowActionIcon(action: WorkflowActionDto): string {
        const l = (action.libelle || action.code || '').toLowerCase();
        if (l.includes('soumettre') || l.includes('transmettre')) return 'pi pi-send text-primary';
        if (l.includes('approuv') || l.includes('valid')) return 'pi pi-check-circle text-emerald-600';
        if (l.includes('rejet') || l.includes('refus')) return 'pi pi-times-circle text-rose-600';
        if (l.includes('corrig') || l.includes('modifi') || l.includes('retour')) return 'pi pi-undo text-amber-600';
        return 'pi pi-directions';
    }

    ouvrirDecision(action: WorkflowActionDto, ligne: LigneATraiter): void {
        this.selectedLigne = ligne;
        this.selectedAction = action;
        this.dialogueDecisionOuvert = true;
    }

    executerDecision(decision: DecisionConfirmee): void {
        if (!this.selectedLigne || !this.selectedAction) return;

        this.actionLoading = true;
        this.workflowService
            .executeTransition(this.selectedLigne.id, this.selectedAction.code, {
                comments: decision.comments,
                expectedStateCode: this.selectedLigne.workflowState?.currentStateCode,
                fields: decision.fields
            })
            .subscribe({
                next: () => {
                    this.actionLoading = false;
                    this.dialogueDecisionOuvert = false;
                    this.selectedAction = undefined;
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Action exécutée',
                        detail: 'La décision a été enregistrée avec succès.'
                    });
                    this.traite.emit();
                },
                error: (erreur: any) => {
                    this.actionLoading = false;
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Décision refusée',
                        detail: erreur?.message || erreur?.error?.message || "L'action n'a pas pu être enregistrée.",
                        life: 8000
                    });
                }
            });
    }
}

