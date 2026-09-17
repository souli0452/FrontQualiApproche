import { CommonModule } from '@angular/common';
import { DecisionConfirmee, WorkflowDecisionDialogComponent } from '../../../workflow/execution/workflow-decision-dialog.component';
import { Component, OnDestroy, OnInit, ViewChild, TemplateRef, AfterViewInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService, MenuItem } from 'primeng/api';
import { Subject, takeUntil } from 'rxjs';

import { NgPrimeModule } from '@prime-ng';
import { TableauAffichageComponent } from '../../../../shared/tableau-affichage/tableau-affichage';
import { TableColumn } from '../../../../models/generique.model';
import { DemandeDocumentDto } from '../../models/demande.model';
import { DemandeDocumentService } from '../../services/demande.service';
import { showToast, StatusEnum } from '../../../../utils/global/global-utils';
import { QmsDemandeDetailComponent } from './qms-demande-detail.component';
import { WorkflowService } from '../../../workflow/services/workflow.service';
import {
    ValidationHistoryDto,
    WorkflowActionDto,
    WorkflowStateDto,
    WorkflowValidationRequestDto
} from '../../../../models/workflow.model';
import { hasAnyPermission } from '../../../../core/auth/auth-utils';

/** Ligne du tableau : la demande, augmentée de ce que la colonne affiche telle quelle. */
type LigneDemande = DemandeDocumentDto & {
    /** Numéro et titre du document, mis en forme pour la colonne. */
    documentLibelle: string;
    nomFichier?: string;
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
    imports: [
        CommonModule, 
        FormsModule,
        ReactiveFormsModule, 
        NgPrimeModule, 
        TableauAffichageComponent,
        QmsDemandeDetailComponent, 
        WorkflowDecisionDialogComponent
    ],
    providers: [MessageService],
    templateUrl: './qms-demandes.component.html'
})
export class QmsDemandesComponent implements OnInit, AfterViewInit, OnDestroy {
    @ViewChild('documentTpl', { static: true }) documentTpl!: TemplateRef<any>;
    @ViewChild('natureTpl', { static: true }) natureTpl!: TemplateRef<any>;
    @ViewChild('etatTpl', { static: true }) etatTpl!: TemplateRef<any>;

    loading: boolean = true;
    demandes: LigneDemande[] = [];
    pageSize: number = 10;
    currentPage: number = 0;
    cellTemplates: { [field: string]: TemplateRef<any> } = {};
    filterFields: string[] = ['documentTitre', 'documentNumber', 'objectif', 'typeLibelle', 'etatLibelle'];

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

    /** Un téléchargement de pièce jointe est en cours : le lien de la fiche attend. */
    pieceEnCours = false;

    fichierRemplacant?: File;
    commentaireRemplacant = '';

    readonly formulaireTableau: FormGroup;

    private readonly destroy$ = new Subject<void>();

    readonly colonnes: TableColumn[] = [
        { field: 'documentTitre', header: 'DOCUMENT', type: 'custom', sort: true, width: '25%' },
        { field: 'objectif', header: 'OBJECTIF', type: 'string', sort: true, width: '32%' },
        { field: 'typeLibelle', header: 'NATURE', type: 'custom', sort: true, align: 'center', width: '14%' },
        { field: 'etatLibelle', header: 'ÉTAT', type: 'custom', sort: true, align: 'center', width: '16%' },
        { field: 'createdAt', header: 'DÉPOSÉE LE', type: 'date', dateFormat: 'dd/MM/yyyy', sort: true, align: 'center', width: '13%' }
    ];

    constructor(
        private readonly fb: FormBuilder,
        private readonly router: Router,
        private readonly route: ActivatedRoute,
        private readonly demandeService: DemandeDocumentService,
        private readonly workflowService: WorkflowService,
        private readonly messageService: MessageService
    ) {
        this.formulaireTableau = this.fb.group({});
    }

    ngAfterViewInit(): void {
        this.cellTemplates = {
            documentTitre: this.documentTpl,
            typeLibelle: this.natureTpl,
            etatLibelle: this.etatTpl
        };
    }

    getActionMenuItems = (demande: LigneDemande): MenuItem[] => {
        const items: MenuItem[] = [
            {
                label: 'Détails',
                icon: 'pi pi-eye',
                command: () => this.ouvrirDetail(demande)
            }
        ];

        if (this.attendUnRemplacant(demande) && this.peutDeposerRemplacant) {
            items.push({
                label: 'Déposer le remplaçant',
                icon: 'pi pi-upload',
                command: () => this.ouvrirDepotRemplacant(demande)
            });
        }

        return items;
    };

    onPageChange(event: { page: number; size: number }): void {
        this.currentPage = event.page;
        this.pageSize = event.size;
    }

    getFileIcon(fileName?: string): string {
        if (!fileName) return 'assets/images/doc-file.png';
        const lower = fileName.toLowerCase().trim();
        if (lower.endsWith('.pdf')) return 'assets/images/pdf-file.png';
        if (lower.endsWith('.doc') || lower.endsWith('.docx')) return 'assets/images/doc-file.png';
        if (lower.endsWith('.xls') || lower.endsWith('.xlsx')) return 'assets/images/xls-file.png';
        if (lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png') || lower.endsWith('.webp')) return 'assets/images/jpeg-file.png';
        if (lower.endsWith('.txt')) return 'assets/images/txt-file.png';
        return 'assets/images/doc-file.png';
    }

    ngOnInit(): void {
        this.peutDeposerRemplacant = hasAnyPermission(['document-write']);
        this.charger();
        this.ouvrirLaDemandeDeLAdresse();
    }

    /**
     * Ouvre d'emblée la fiche de la demande désignée par l'adresse (`?demandeId=`).
     *
     * <p>La vue d'ensemble y renvoie pour les demandes qui offrent plus d'une décision : instruire
     * suppose d'avoir lu l'objectif et la pièce jointe, ce qu'une ligne de tableau ne montre pas.
     * L'identifiant passe par l'adresse, si bien que le lien reste rechargeable.</p>
     */
    private ouvrirLaDemandeDeLAdresse(): void {
        const demandeId = this.route.snapshot.queryParamMap.get('demandeId');
        if (!demandeId) {
            return;
        }

        this.demandeService.getById(demandeId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (demande) => this.ouvrirDetail(demande),
                // La demande a pu sortir de portée : la liste reste affichée, et l'échec est dit.
                error: () => this.messageService.add({
                    severity: 'warn', summary: 'Demande introuvable',
                    detail: "Cette demande n'est plus accessible : elle a pu être close, ou sortir de votre périmètre."
                })
            });
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
                    documentLibelle: demande.documentTitre
                        ? `<span class="font-mono text-xs text-slate-500">${demande.documentNumber ?? ''}</span>`
                          + `<span class="block text-slate-800">${demande.documentTitre}</span>`
                        : (demande.documentNumber ?? ''),
                    nomFichier: (demande as any).nomFichier || demande.pieceJointeNom || (demande.documentNumber ? `${demande.documentNumber}.docx` : ''),
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

        // Une demande sans identifiant ne se demande pas au moteur : l'appel partait avec
        // « undefined » dans l'adresse et revenait en 500, deux fois, pour une donnée que le serveur
        // ne pouvait de toute façon pas trouver. La fiche s'affiche, et dit ce qui manque.
        if (!demande?.id) {
            this.etatIndisponible = true;
            return;
        }

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
    /**
     * Dépôt d'une pièce réclamée par l'étape d'instruction, rendant sa référence.
     *
     * <p>Fonction fléchée : passée en entrée du dialogue, une méthode ordinaire y perdrait son
     * {@code this}. La demande concernée est celle sur laquelle porte la décision en cours.</p>
     */
    readonly deposerFichierDEtape = (fichier: File) =>
        this.demandeService.deposerFichierDEtape(this.demandeSelectionnee?.id ?? '', fichier);

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

    /**
     * Transmet la décision, avec les saisies que l'étape exigeait.
     *
     * <p>Les valeurs étaient envoyées sous le nom {@code fieldValues}, que ni le serveur ni le
     * dialogue ne connaissent : le serveur attend {@code fields}. Le champ arrivait donc vide, et
     * l'utilisateur se voyait refuser sa décision en « Champ(s) obligatoire(s) non renseigné(s) »
     * alors qu'il venait de les saisir. Le paramètre était typé {@code any} et la requête castée,
     * si bien que rien ne signalait l'écart.</p>
     *
     * <p>{@code expectedStateCode} accompagne désormais la décision, comme ailleurs : le serveur
     * refuse en 409 une décision prise depuis un écran périmé, ce qui neutralise du même coup le
     * second envoi d'un double clic.</p>
     */
    soumettreDecision(decision: DecisionConfirmee): void {
        if (!this.demandeSelectionnee || !this.actionChoisie) {
            return;
        }
        const requete: WorkflowValidationRequestDto = {
            comments: decision.comments,
            fields: decision.fields,
            expectedStateCode: this.etatCircuit?.currentStateCode
        };

        this.enregistrement = true;
        this.workflowService
            .executeTransition(this.demandeSelectionnee.id, this.actionChoisie.code!, requete)
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

    /**
     * Enregistre la pièce jointe déposée avec la demande.
     *
     * <p>Le serveur rend le fichier sous son nom d'origine ; il est repris ici pour que le
     * navigateur n'enregistre pas un identifiant technique.</p>
     */
    telechargerPieceJointe(demande: DemandeDocumentDto): void {
        if (!demande?.id || this.pieceEnCours) {
            return;
        }
        this.pieceEnCours = true;
        this.demandeService.pieceJointe(demande.id)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (fichier) => {
                    this.pieceEnCours = false;
                    const url = window.URL.createObjectURL(fichier);
                    const lien = document.createElement('a');
                    lien.href = url;
                    lien.download = demande.pieceJointeNom || 'piece-jointe';
                    lien.click();
                    setTimeout(() => window.URL.revokeObjectURL(url), 100);
                },
                error: async (erreur) => {
                    this.pieceEnCours = false;
                    this.messageService.add({
                        severity: 'error', summary: 'Pièce jointe',
                        detail: await this.messageDuRefus(erreur), life: 5000
                    });
                }
            });
    }

    /**
     * Le message que le serveur a réellement rendu.
     *
     * <p>Demandé en {@code blob}, un refus arrive lui aussi en binaire : sans cette relecture,
     * l'écran n'aurait à afficher qu'un code de statut là où le serveur a rédigé une phrase.</p>
     */
    private async messageDuRefus(erreur: any): Promise<string> {
        try {
            if (erreur?.error instanceof Blob) {
                const texte = await erreur.error.text();
                return JSON.parse(texte)?.message || texte || 'Le fichier n\'a pas pu être obtenu.';
            }
        } catch {
            // Un refus sans corps lisible : le message générique fera l'affaire.
        }
        return erreur?.error?.message || 'Le fichier n\'a pas pu être obtenu.';
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
