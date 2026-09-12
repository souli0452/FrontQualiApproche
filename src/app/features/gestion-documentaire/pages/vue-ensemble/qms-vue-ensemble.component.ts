import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subject, forkJoin, takeUntil } from 'rxjs';

import { NgPrimeModule } from '@prime-ng';
import { formatDateToDDMMYYYY } from '../../../../utils/formatage/formatage-utils';
import { LigneATraiter, QmsATraiterComponent } from './qms-a-traiter.component';
import { hasAnyPermission } from '@core/auth/auth-utils';
import { KpiCardComponent } from '@shared/kpi-card/kpi-card.component';
import { QmsDocumentService } from '@features/gestion-documentaire/services/document.service';
import { DemandeDocumentService } from '@features/gestion-documentaire/services/demande.service';
import { DocumentaireATraiterService } from '@features/gestion-documentaire/services/documentaire-a-traiter.service';
import { DocumentQms } from '@features/gestion-documentaire/models/document.model';
import { DemandeDocumentDto } from '@features/gestion-documentaire/models/demande.model';
import { DocumentStatsDto } from '@features/gestion-documentaire/models/stats.model';

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
    imports: [CommonModule, KpiCardComponent, NgPrimeModule, QmsATraiterComponent],
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
    loading: boolean = true;
    /** Chargement des listes de travail : « rien à faire » ne doit pas s'afficher avant de le savoir. */
    chargementATraiter: boolean = true;

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
                console.group('🔍 [QMS VUE-ENSEMBLE] Données "À Traiter"');
                console.log('📦 État global brut :', etat);
                console.log('📄 Documents bruts reçus (%d) :', etat.documents?.length || 0, etat.documents);
                console.log('📝 Demandes brutes reçues (%d) :', etat.demandes?.length || 0, etat.demandes);
                this.documentsATraiter = (etat.documents ?? []).map(doc => this.ligneDeDocument(doc));
                this.demandesATraiter = (etat.demandes ?? []).map(demande => this.ligneDeDemande(demande));
                if (this.documentsATraiter.length > 0) {
                    console.log('📋 Tableau formaté - Documents attendant décision :');
                    console.table(this.documentsATraiter.map(d => ({
                        Réf: d.reference || '—',
                        Titre: d.titre,
                        Étape: d.etape || '—',
                        Type: d.badge,
                        Détail: d.detail || '—',
                        'Nb Actions Possibles': d.workflowState?.allowedActions?.length || 0
                    })));
                } else {
                    console.log('ℹ️ Aucun document à traiter pour l\'utilisateur connecté.');
                }
                if (this.demandesATraiter.length > 0) {
                    console.log('📋 Tableau formaté - Demandes à instruire :');
                    console.table(this.demandesATraiter.map(d => ({
                        Réf: d.reference || '—',
                        Titre: d.titre,
                        Étape: d.etape || '—',
                        Type: d.badge,
                        Détail: d.detail || '—',
                        'Nb Actions Possibles': d.workflowState?.allowedActions?.length || 0
                    })));
                } else {
                    console.log('ℹ️ Aucune demande à instruire pour l\'utilisateur connecté.');
                }
                console.groupEnd();
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
        const etapeNom = doc.workflowState?.currentStateName || doc.currentEtape || 'Rédaction';
        return {
            id: doc.id!,
            reference: doc.documentNumber,
            titre: doc.titre || 'Document sans titre',
            detail: [doc.serviceLibelle, doc.redacteur].filter(Boolean).join(' — ') || undefined,
            badge: doc.documentType,
            badgeSeverite: 'secondary',
            etape: etapeNom,
            depuis: doc.createdAt ? formatDateToDDMMYYYY(doc.createdAt) : undefined,
            auteur: doc.redacteur || (doc as any).currentUserFullName || 'Non renseigné',
            iconeFichier: this.getIconeFichier(doc.currentObjectName),
            iconeEtape: this.getIconeEtape(etapeNom),
            delaiRelatif: this.getDelaiRelatif(doc.createdAt),
            statutDelai: 'À soumettre',
            deposerFichier: (fichier: File) =>
                this.qmsService.deposerFichierDEtape(doc.id ?? '', fichier),
            workflowState: doc.workflowState
        };
    }


    private ligneDeDemande(demande: DemandeDocumentDto): LigneATraiter {
        const etapeNom = demande.workflowState?.currentStateName || demande.currentEtape || 'Instruction';
        return {
            id: demande.id,
            reference: demande.documentNumber,
            titre: demande.objectif || demande.documentTitre || 'Demande',
            detail: [demande.documentTitre, demande.demandeurNom].filter(Boolean).join(' — ') || undefined,
            badge: demande.type === 'SUPPRESSION' ? 'Suppression' : 'Modification',
            badgeSeverite: demande.type === 'SUPPRESSION' ? 'danger' : 'info',
            etape: etapeNom,
            depuis: demande.createdAt ? formatDateToDDMMYYYY(demande.createdAt) : undefined,
            auteur: demande.demandeurNom || 'Demandeur',
            iconeFichier: 'assets/images/doc-file.png',
            iconeEtape: this.getIconeEtape(etapeNom),
            delaiRelatif: this.getDelaiRelatif(demande.createdAt),
            statutDelai: 'À instruire',
            deposerFichier: (fichier: File) =>
                this.demandeService.deposerFichierDEtape(demande.id, fichier),
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

        /** Détecte l'extension du fichier et retourne l'icône correspondante dans assets */
    private getIconeFichier(nomFichier?: string): string {
        if (!nomFichier) return 'assets/images/doc-file.png';
        const lower = nomFichier.toLowerCase();
        if (lower.endsWith('.pdf')) return 'assets/images/pdf-file.png';
        if (lower.endsWith('.doc') || lower.endsWith('.docx')) return 'assets/images/doc-file.png';
        if (lower.endsWith('.xls') || lower.endsWith('.xlsx')) return 'assets/images/xls-file.png';
        if (lower.endsWith('.txt')) return 'assets/images/txt-file.png';
        if (lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png')) return 'assets/images/jpeg-file.png';
        return 'assets/images/doc-file.png';
    }

    /** Calcule le temps écoulé de manière lisible (ex: "Il y a 17 jours") */
    private getDelaiRelatif(dateStr?: string | Date): string {
        if (!dateStr) return '';
        const created = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - created.getTime();
        const diffJours = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffJours <= 0) return "Aujourd'hui";
        if (diffJours === 1) return "Il y a 1 jour";
        return `Il y a ${diffJours} jours`;
    }

    /** Icône PrimeNG adaptée à l'étape du workflow */
    private getIconeEtape(etape?: string): string {
        const lower = (etape || '').toLowerCase();
        if (lower.includes('rédac') || lower.includes('redac')) return 'pi pi-pencil';
        if (lower.includes('vérif') || lower.includes('verif')) return 'pi pi-search';
        if (lower.includes('approb') || lower.includes('valid')) return 'pi pi-check-circle';
        if (lower.includes('diffus') || lower.includes('public')) return 'pi pi-send';
        return 'pi pi-file-edit';
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }
}
