import { CommonModule } from '@angular/common';
import { DecisionConfirmee, WorkflowDecisionDialogComponent } from '../../../shared';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subject, takeUntil } from 'rxjs';

import { NgPrimeModule } from '../../../../prime-ng.module';
import { AppCrudGenericComponent } from '../../../components/app-crud-generic/app-crud-generic.component';
import { TableColumn } from '../../../models/generique.model';
import { DemandeDocumentDto } from '../../../models/demande-document.model';
import { DemandeDocumentService } from '../../../services/module-gestion-documentaire/demande-document.service';
import { showToast, StatusEnum } from '../../../utils/global/global-utils';
import { QmsDemandeDetailComponent } from './qms-demande-detail.component';
import { WorkflowService } from '../../../services/workflow.service';
import { ValidationHistoryDto, WorkflowActionDto, WorkflowStateDto } from '../../../models/workflow.model';
import { hasAnyPermission } from '../../../utils/auth/auth-utils';

/** Ligne du tableau : la demande, augmentée de ce que la colonne affiche telle quelle. */
type LigneDemande = DemandeDocumentDto & {
    /** Numéro et titre du document, mis en forme pour la colonne. */
    documentLibelle: string;
    typeLibelle: string;
    etatLibelle: string;
    /** Sévérité de la pastille, portée par la ligne : le tableau générique la lit telle quelle. */
    typeSeverite: string;
    etatSeverite: string;
};

/**
 * Demandes de modification et de suppression de document.
 *
 * <p>Une demande suit un circuit : elle est déposée, instruite au titre de la qualité, puis
 * décidée. Ce que cet écran ajoute au circuit est l'aboutissement — c'est ici qu'on dépose le
 * document remplaçant d'une modification acceptée, seule chose qu'aucun automatisme ne peut
 * fournir.</p>
 */
@Component({
    selector: 'app-qms-demandes',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, NgPrimeModule, AppCrudGenericComponent,
        QmsDemandeDetailComponent, WorkflowDecisionDialogComponent],
    providers: [MessageService],
    templateUrl: './qms-demandes.component.html'
})
export class QmsDemandesComponent implements OnInit, OnDestroy {

    loading = true;
    demandes: LigneDemande[] = [];

    readonly titrePage = 'Demandes sur les documents';

    /** Liste ou fiche : même principe que l'écran des documents. */
    vue: 'liste' | 'detail' = 'liste';
    demandeSelectionnee?: DemandeDocumentDto;
    etatCircuit?: WorkflowStateDto;
    /** L'état du circuit n'a pas pu être obtenu : la fiche le dit au lieu de rester muette. */
    etatIndisponible = false;
    historique: ValidationHistoryDto[] = [];

    actionChoisie?: WorkflowActionDto;
    dialogueDecisionOuvert = false;

    /**
     * Déposer le document remplaçant relève de l'écriture documentaire : c'est une version qui se
     * publie. Les décisions du circuit, elles, ne sont pas filtrées ici — le moteur vérifie déjà
     * le rôle attendu par l'étape, et une seconde barrière applicative masquait tout à qui
     * détenait pourtant ce rôle.
     */
    peutDeposerRemplacant = false;

    dialogueRemplacantOuvert = false;
    demandeEnCours?: DemandeDocumentDto;
    enregistrement = false;

    fichierRemplacant?: File;
    commentaireRemplacant = '';

    readonly formulaireTableau: FormGroup;

    private readonly destroy$ = new Subject<void>();

    /**
     * Menu de ligne, comme sur les autres tableaux.
     *
     * <p>Le dépôt du remplaçant n'y figure que sur les demandes qui l'attendent : proposer partout
     * une action qui ne vaut que pour quelques lignes revient à ne rien indiquer du tout.</p>
     */
    readonly actionsLigne = [
        { label: 'Détails', icon: 'pi pi-eye', action: 'detail' },
        {
            label: 'Déposer le remplaçant', icon: 'pi pi-upload', action: 'remplacant',
            visible: (ligne: any) => this.peutDeposerRemplacant
                && ligne?.type === 'MODIFICATION' && ligne?.etat === 'ACCEPTEE'
        }
    ];

    readonly colonnes: TableColumn[] = [
        { field: 'documentLibelle', header: 'Document', type: 'string', filter: true, width: 'auto' },
        // L'objectif prend la place restante : c'est lui qui dit de quoi il retourne, et le
        // tronquer reviendrait à ne rien montrer.
        { field: 'objectif', header: 'Objectif', type: 'string', filter: true, width: 'auto' },
        {
            field: 'typeLibelle', header: 'Nature', type: 'badge', filter: true,
            severityField: 'typeSeverite', width: 'auto'
        },
        {
            field: 'etatLibelle', header: 'État', type: 'badge', filter: true,
            severityField: 'etatSeverite', width: 'auto'
        },
        { field: 'createdAt', header: 'Déposée le', type: 'date', filter: false, width: 'auto' }
    ];

    constructor(
        private readonly fb: FormBuilder,
        private readonly router: Router,
        private readonly demandeService: DemandeDocumentService,
        private readonly workflowService: WorkflowService,
        private readonly messageService: MessageService
    ) {
        this.formulaireTableau = this.fb.group({});
    }

    ngOnInit(): void {
        this.peutDeposerRemplacant = hasAnyPermission(['document-write']);
        this.charger();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    charger(): void {
        this.loading = true;
        this.demandeService.mesDemandes().pipe(takeUntil(this.destroy$)).subscribe({
            next: (demandes) => {
                // Le tableau générique lit la valeur brute du champ : libellés et sévérités sont
                // calculés ici, pas dans le gabarit.
                this.demandes = (demandes ?? []).map(demande => ({
                    ...demande,
                    // Champ dédié à l'affichage : `documentNumber` est réutilisé tel quel par la
                    // fiche et par le dialogue de décision, le réécrire y aurait fait apparaître du
                    // balisage. Le numéro seul étant peu parlant dans une liste, le titre le suit
                    // sur une seconde ligne.
                    documentLibelle: demande.documentTitre
                        ? `<span class="font-mono text-xs text-slate-500">${demande.documentNumber ?? ''}</span>`
                          + `<span class="block text-slate-800">${demande.documentTitre}</span>`
                        : (demande.documentNumber ?? ''),
                    typeLibelle: demande.type === 'SUPPRESSION' ? 'Suppression' : 'Modification',
                    // Une suppression se distingue d'une modification au premier coup d'œil :
                    // l'une retire un document, l'autre le remplace.
                    typeSeverite: demande.type === 'SUPPRESSION' ? 'danger' : 'info',
                    etatLibelle: this.libelleEtat(demande),
                    etatSeverite: this.severiteEtat(demande)
                }));
                this.loading = false;
            },
            error: (err) => {
                this.loading = false;
                showToast(StatusEnum.error, err.status, 'Chargement des demandes impossible',
                    this.messageService, err);
            }
        });
    }

    private libelleEtat(demande: DemandeDocumentDto): string {
        switch (demande.etat) {
            case 'EN_COURS': return 'En cours d’instruction';
            // La nuance compte : accepté n'est pas fait. Une modification acceptée attend son
            // fichier, et une suppression décidée mais non exécutée doit rester visible comme telle.
            case 'ACCEPTEE': return demande.type === 'MODIFICATION'
                ? 'Acceptée — remplaçant attendu'
                : 'Acceptée — retrait en cours';
            case 'REFUSEE': return 'Refusée';
            case 'EXECUTEE': return demande.type === 'MODIFICATION' ? 'Remplacé' : 'Document supprimé';
            default: return demande.etat;
        }
    }

    // ------------------------------------------------------------------ dépôt

    /**
     * Le dépôt se fait sur une page dédiée, avec son guide de saisie — comme la création d'un
     * document ou la déclaration d'une non-conformité. Une demande se rédige : l'objectif et la
     * description sont ce que lira l'instructeur, et un dialogue étroit n'aidait pas à les écrire.
     */
    ouvrirCreation(): void {
        this.router.navigate(['/gestion-documentaire/demandes/nouvelle']);
    }

    /**
     * Couleur de l'état. « Acceptée » reste en attente — ambre — tant que l'aboutissement n'a pas
     * eu lieu : c'est la nuance que la liste doit rendre visible.
     */
    private severiteEtat(demande: DemandeDocumentDto): string {
        switch (demande.etat) {
            case 'EN_COURS': return 'info';
            case 'ACCEPTEE': return 'warn';
            case 'REFUSEE': return 'secondary';
            case 'EXECUTEE': return 'success';
            default: return 'info';
        }
    }

    // ------------------------------------------------------------------ fiche et décisions

    /**
     * Ouvre la fiche d'une demande.
     *
     * <p>L'état du circuit est demandé au serveur : ce sont ses `allowedActions` qui déterminent
     * les décisions proposées, jamais une règle recopiée ici — l'écran ne doit pas offrir ce que
     * le serveur refuserait.</p>
     */
    executerAction(evenement: { action: string; user: any }): void {
        const demande = evenement.user as DemandeDocumentDto;
        if (evenement.action === 'detail') {
            this.ouvrirDetail(demande);
        } else if (evenement.action === 'remplacant') {
            this.ouvrirDepotRemplacant(demande);
        }
    }

    ouvrirDetail(demande: DemandeDocumentDto): void {
        this.demandeSelectionnee = demande;
        this.etatCircuit = undefined;
        this.historique = [];
        this.vue = 'detail';

        this.etatIndisponible = false;
        this.workflowService.getWorkflowStateForResource(demande.id)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (etat) => {
                    this.etatCircuit = etat;
                    this.etatIndisponible = false;
                },
                error: (err: any) => {
                    // La fiche reste consultable, mais l'échec est dit : un écran sans action et
                    // sans explication se lit comme une panne, ou comme un droit manquant.
                    this.etatCircuit = undefined;
                    this.etatIndisponible = true;
                    this.messageService.add({
                        severity: 'warn', summary: 'Circuit indisponible',
                        detail: err?.message || err?.error?.message
                            || "L'état du circuit de cette demande n'a pas pu être obtenu."
                    });
                }
            });

        this.workflowService.getValidationHistory(demande.id)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (historique) => (this.historique = historique ?? []),
                error: () => (this.historique = [])
            });
    }

    /**
     * Recharge ce qui est à l'écran après une opération réussie.
     *
     * <p>Recharger la liste ne suffisait pas : depuis la fiche, un dépôt de remplaçant laissait
     * affichée une demande « en attente de remplaçant » que le serveur avait déjà passée à
     * « remplacé ». Ce que l'utilisateur a sous les yeux doit être ce que le serveur vient
     * d'enregistrer, pas ce qu'il en croyait avant.</p>
     */
    private rafraichir(): void {
        this.charger();
        if (this.vue === 'detail' && this.demandeSelectionnee) {
            this.demandeService.getById(this.demandeSelectionnee.id)
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: (demande) => this.ouvrirDetail(demande),
                    // La demande n'est plus consultable — elle a pu sortir de portée : retour à
                    // la liste plutôt qu'une fiche périmée.
                    error: () => this.fermerDetail()
                });
        }
    }

    fermerDetail(): void {
        this.vue = 'liste';
        this.demandeSelectionnee = undefined;
        this.charger();
    }

    /**
     * Ce que le dialogue de décision affiche en tête.
     *
     * <p>Il a été écrit pour un document ; une demande n'en est pas un. On lui présente donc le
     * strict nécessaire — le document visé et l'étape — plutôt que d'en écrire un second, identique
     * à un libellé près.</p>
     */
    get documentDeLaDecision(): any {
        if (!this.demandeSelectionnee) {
            return undefined;
        }
        return {
            documentNumber: this.demandeSelectionnee.documentNumber,
            currentEtape: this.demandeSelectionnee.currentEtape
        };
    }

    /** Une décision se motive : le dialogue recueille l'observation avant de la transmettre. */
    ouvrirDecision(action: WorkflowActionDto): void {
        this.actionChoisie = action;
        this.dialogueDecisionOuvert = true;
    }

    soumettreDecision(decision: any): void {
        if (!this.demandeSelectionnee || !this.actionChoisie) {
            return;
        }
        const requete = {
            comments: decision?.comments ?? decision?.commentaire ?? '',
            fieldValues: decision?.fieldValues ?? decision?.valeurs ?? {}
        };

        this.enregistrement = true;
        this.workflowService
            .executeTransition(this.demandeSelectionnee.id, this.actionChoisie.code!, requete as any)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: () => {
                    this.enregistrement = false;
                    this.dialogueDecisionOuvert = false;
                    this.messageService.add({
                        severity: 'success', summary: 'Décision enregistrée',
                        detail: 'La demande poursuit son circuit.'
                    });
                    // Rechargée depuis le serveur : l'aboutissement d'une décision finale — retrait
                    // du document, passage en attente de remplaçant — se joue de son côté.
                    this.rafraichir();
                },
                error: (err: any) => {
                    this.enregistrement = false;
                    this.messageService.add({
                        severity: 'error', summary: 'Décision refusée',
                        detail: err?.message || err?.error?.message
                            || "La décision n'a pas pu être enregistrée."
                    });
                }
            });
    }

    // ------------------------------------------------------------------ aboutissement

    /** Seules les modifications acceptées attendent un fichier ; le reste n'a rien à déposer. */
    attendUnRemplacant(demande: DemandeDocumentDto): boolean {
        return demande.type === 'MODIFICATION' && demande.etat === 'ACCEPTEE';
    }

    /** Vrai dès qu'une demande attend son fichier : sinon le bloc annonce qu'il n'y a rien à faire. */
    get desDemandesAttendentUnRemplacant(): boolean {
        return this.demandes.some(demande => this.attendUnRemplacant(demande));
    }

    ouvrirDepotRemplacant(demande: DemandeDocumentDto): void {
        this.demandeEnCours = demande;
        this.fichierRemplacant = undefined;
        this.commentaireRemplacant = '';
        this.dialogueRemplacantOuvert = true;
    }

    onFichierRemplacant(event: any): void {
        this.fichierRemplacant = event?.target?.files?.[0] ?? event?.files?.[0];
    }

    deposerRemplacant(): void {
        if (!this.demandeEnCours || !this.fichierRemplacant) {
            return;
        }
        this.enregistrement = true;
        this.demandeService.deposerRemplacant(
                this.demandeEnCours.id, this.fichierRemplacant, this.commentaireRemplacant)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: () => {
                    this.enregistrement = false;
                    this.dialogueRemplacantOuvert = false;
                    this.messageService.add({
                        severity: 'success', summary: 'Document remplacé',
                        detail: 'Une nouvelle version majeure a été publiée.'
                    });
                    this.rafraichir();
                },
                error: (err) => {
                    this.enregistrement = false;
                    showToast(StatusEnum.error, err.status, 'Dépôt impossible', this.messageService, err);
                }
            });
    }
}
