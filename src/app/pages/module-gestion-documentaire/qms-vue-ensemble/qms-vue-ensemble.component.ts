import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subject, forkJoin, takeUntil } from 'rxjs';

import { NgPrimeModule } from '../../../../prime-ng.module';
import { DocStatsCardComponent } from '../../../components/gestion-documentaire/doc-stats-card/doc-stats-card.component';
import { QmsDocumentService } from '../../../services/module-gestion-documentaire/qms-document.service';
import { DemandeDocumentService } from '../../../services/module-gestion-documentaire/demande-document.service';
import {
    DocumentaireATraiterService
} from '../../../services/module-gestion-documentaire/documentaire-a-traiter.service';
import { DocumentQms, DocumentStatsDto } from '../../../models/gestion-documentaire.model';
import { DemandeDocumentDto } from '../../../models/demande-document.model';
import { hasAnyPermission } from '../../../utils/auth/auth-utils';
import { formatDateToDDMMYYYY } from '../../../utils/formatage/formatage-utils';
import { LigneATraiter, QmsATraiterComponent } from './qms-a-traiter.component';

interface DimensionEntry {
    label: string;
    count: number;
}

/**
 * Vue d'ensemble documentaire : d'abord ce qui attend un geste de l'utilisateur, puis ce qui est en
 * stock.
 *
 * <p>L'écran présentait des courbes de dépôts et deux camemberts. Ils disent l'activité du
 * trimestre ; ils ne disent pas ce qu'il y a à faire aujourd'hui, et l'on n'y prenait rien en
 * charge. Celui qui devait instruire une demande devait la deviner, ouvrir la liste des demandes, y
 * retrouver les lignes en instruction — dont beaucoup ne le concernaient pas — puis ouvrir chaque
 * fiche pour découvrir s'il pouvait décider. Le module non-conformité range sa vue d'ensemble
 * autrement : les dossiers qui attendent une décision au premier plan, avec leurs boutons. Celui-ci
 * fait de même.</p>
 *
 * <p>Ce sont les listes du <b>circuit</b> qui alimentent cette page — non un filtre sur le statut
 * des documents : le moteur seul sait quel rôle décide de l'étape courante, et une seconde règle
 * écrite ici aurait fait apparaître des dossiers que le serveur refuse ensuite de faire avancer.</p>
 *
 * <p>La portée des chiffres est celle qu'applique le serveur — la structure de l'utilisateur, ou
 * l'ensemble pour qui accompagne la qualité. Elle est annoncée à l'écran : un total dont on ignore
 * l'étendue n'est pas un chiffre, c'est une devinette.</p>
 */
@Component({
    selector: 'app-qms-vue-ensemble',
    standalone: true,
    imports: [CommonModule, NgPrimeModule, DocStatsCardComponent, QmsATraiterComponent],
    // Le dialogue de décision des lignes rend compte par messages : sans fournisseur ni conteneur,
    // ni le succès ni le refus du serveur ne seraient dits.
    providers: [MessageService],
    templateUrl: './qms-vue-ensemble.component.html',
    styleUrl: './qms-vue-ensemble.component.scss'
})
export class QmsVueEnsembleComponent implements OnInit, OnDestroy {
    private readonly qmsService = inject(QmsDocumentService);
    private readonly demandeService = inject(DemandeDocumentService);
    private readonly aTraiterService = inject(DocumentaireATraiterService);
    private readonly router = inject(Router);

    /** Chargement des chiffres de stock ; les listes de travail ont le leur. */
    loading = true;
    /** Chargement des listes de travail : « rien à faire » ne doit pas s'afficher avant de le savoir. */
    chargementATraiter = true;

    stats: DocumentStatsDto | null = null;

    countByStatus: DimensionEntry[] = [];
    countByDocumentType: DimensionEntry[] = [];

    /** Demandes : total et nombre en attente d'un geste, tous instructeurs confondus. */
    demandesTotal = 0;
    demandesEnAttente = 0;

    /** Ce que l'utilisateur a à traiter, mis en forme pour le tableau. */
    documentsATraiter: LigneATraiter[] = [];
    demandesATraiter: LigneATraiter[] = [];

    /** Voit-on toute l'organisation, ou sa seule structure ? */
    porteeGlobale = false;

    private destroy$ = new Subject<void>();

    ngOnInit(): void {
        // Même règle que le serveur : responsable qualité et administration générale voient
        // l'ensemble des structures. Reconnus ici par des permissions qui n'appartiennent qu'à eux,
        // le front ne disposant pas des noms de rôles.
        this.porteeGlobale = hasAnyPermission(
            ['MANAGE_USER', 'ROLE_MANAGE', 'CONFIG_GLOBAL_MANAGE',
             'nc-close', 'demande-document-validate']);

        // L'état est partagé avec la cloche de notifications : elle annonce ce que cette page
        // montre, et une décision prise ici la corrige du même coup.
        this.aTraiterService.aTraiter$
            .pipe(takeUntil(this.destroy$))
            .subscribe((etat) => {
                this.documentsATraiter = (etat.documents ?? []).map(doc => this.ligneDeDocument(doc));
                this.demandesATraiter = (etat.demandes ?? []).map(demande => this.ligneDeDemande(demande));
                this.chargementATraiter = etat.chargement || !etat.charge;
            });

        this.chargerATraiter();
        this.loadStats();
    }

    /** Relit les listes de travail. Appelée à l'ouverture, et après chaque décision prise ici. */
    chargerATraiter(): void {
        this.aTraiterService.rafraichir().pipe(takeUntil(this.destroy$)).subscribe();
    }

    /**
     * Après une décision : les listes de travail changent, et les compteurs de stock aussi — une
     * approbation met un document en vigueur, une suppression décidée le retire.
     */
    apresDecision(): void {
        this.chargerATraiter();
        this.loadStats();
    }

    loadStats(): void {
        this.loading = true;
        forkJoin({
            stats: this.qmsService.getDocumentStats(),
            byStatus: this.qmsService.getDocumentStatsByDimension('STATUT'),
            byType: this.qmsService.getDocumentStatsByDimension('DOCUMENT_TYPE'),
            demandes: this.demandeService.statistiques(12)
        })
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: ({ stats, byStatus, byType, demandes }) => {
                    this.stats = (stats as any)?.data ?? stats;
                    this.countByStatus = this.toEntries(byStatus);
                    this.countByDocumentType = this.toEntries(byType);
                    this.demandesTotal = Number(demandes?.total) || 0;
                    this.demandesEnAttente = Number(demandes?.enAttente) || 0;
                    this.loading = false;
                },
                error: () => {
                    this.loading = false;
                }
            });
    }

    // --------------------------------------------------------------- listes de travail

    /**
     * Un document, réduit à ce qu'il faut pour décider.
     *
     * <p>L'étape vient de l'état du circuit, non du champ recopié sur le document : c'est le moteur
     * qui fait foi, et le champ local peut être en retard d'une transition.</p>
     */
    private ligneDeDocument(doc: DocumentQms): LigneATraiter {
        return {
            id: doc.id!,
            reference: doc.documentNumber,
            titre: doc.titre || 'Document sans titre',
            detail: [doc.serviceLibelle, doc.redacteur].filter(Boolean).join(' — ') || undefined,
            badge: doc.documentType,
            badgeSeverite: 'secondary',
            etape: doc.workflowState?.currentStateName || doc.currentEtape,
            deposerFichier: (fichier: File) =>
                this.qmsService.deposerFichierDEtape(doc.id ?? '', fichier),
            depuis: doc.createdAt ? formatDateToDDMMYYYY(doc.createdAt) : undefined,
            workflowState: doc.workflowState
        };
    }

    private ligneDeDemande(demande: DemandeDocumentDto): LigneATraiter {
        return {
            id: demande.id,
            reference: demande.documentNumber,
            titre: demande.objectif || demande.documentTitre || 'Demande',
            // Le document visé, puis qui demande : c'est ce qui permet d'instruire sans ouvrir la fiche.
            detail: [demande.documentTitre, demande.demandeurNom].filter(Boolean).join(' — ') || undefined,
            badge: demande.type === 'SUPPRESSION' ? 'Suppression' : 'Modification',
            // Une suppression retire un document, une modification le remplace : la distinction
            // doit sauter aux yeux avant qu'on décide.
            badgeSeverite: demande.type === 'SUPPRESSION' ? 'danger' : 'info',
            etape: demande.workflowState?.currentStateName || demande.currentEtape,
            deposerFichier: (fichier: File) =>
                this.demandeService.deposerFichierDEtape(demande.id, fichier),
            depuis: demande.createdAt ? formatDateToDDMMYYYY(demande.createdAt) : undefined,
            workflowState: demande.workflowState
        };
    }

    /** Nombre de dossiers en attente d'un geste de l'utilisateur, toutes familles confondues. */
    get totalATraiter(): number {
        return this.documentsATraiter.length + this.demandesATraiter.length;
    }

    voirLesDocuments(): void {
        this.router.navigate(['/gestion-documentaire/documents']);
    }

    voirLesDemandes(): void {
        this.router.navigate(['/gestion-documentaire/demandes']);
    }

    /**
     * Ouvre la fiche du dossier, décisions comprises.
     *
     * <p>Demandé par les lignes qui offrent plus d'une décision : on ne choisit pas entre approuver
     * et retourner au rédacteur depuis une cellule de tableau. Le dossier est désigné dans l'adresse
     * plutôt que porté en mémoire — l'écran de destination est un autre écran, et le lien reste
     * partageable et rechargeable.</p>
     */
    ouvrirLeDocument(ligne: LigneATraiter): void {
        this.router.navigate(['/gestion-documentaire/documents'],
            { queryParams: { documentId: ligne.id } });
    }

    ouvrirLaDemande(ligne: LigneATraiter): void {
        this.router.navigate(['/gestion-documentaire/demandes'],
            { queryParams: { demandeId: ligne.id } });
    }

    private toEntries(input: any): DimensionEntry[] {
        const map = input?.data ?? input;
        if (!map || typeof map !== 'object') return [];
        return Object.entries(map)
            .map(([label, count]) => ({ label, count: Number(count) || 0 }))
            .sort((a, b) => b.count - a.count);
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }
}
