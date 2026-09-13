import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
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
import { PrioriteDocument } from '@features/gestion-documentaire/models/referentiel.model';
import { PrioriteDocumentService } from '@features/gestion-documentaire/services/referentiel.service';
import { ChartEvolutionComponent } from '@shared/chart-evolution/chart-evolution.component';
import { ChartFilterEvent, BreakdownItem } from '@shared/chart-evolution/chart-evolution.model';
import { ChartDonutComponent, ChartDonutStatItem } from '@shared/chart-donut/chart-donut.component';
import { LightboxComponent } from '@features/non-conformite/components/lightbox/lightbox';

interface DimensionEntry {
    label: string;
    count: number;
}

/**
 * Vue d'ensemble documentaire : d'abord ce qui attend un geste de l'utilisateur, puis ce qui est en
 * stock.
 */
@Component({
    selector: 'app-qms-vue-ensemble',
    standalone: true,
    imports: [CommonModule, KpiCardComponent, NgPrimeModule, QmsATraiterComponent, ChartEvolutionComponent, ChartDonutComponent, LightboxComponent],
    // Le dialogue de décision des lignes rend compte par messages : sans fournisseur ni conteneur,
    // ni le succès ni le refus du serveur ne seraient dits.
    providers: [MessageService],
    templateUrl: './qms-vue-ensemble.component.html',
    styleUrl: './qms-vue-ensemble.component.scss'
})
export class QmsVueEnsembleComponent implements OnInit, OnDestroy {
    @ViewChild('lightbox') lightbox?: LightboxComponent;
    private readonly qmsService = inject(QmsDocumentService);
    private readonly demandeService = inject(DemandeDocumentService);
    private readonly aTraiterService = inject(DocumentaireATraiterService);
    private readonly prioriteService = inject(PrioriteDocumentService);
    private readonly router = inject(Router);
    private readonly messageService = inject(MessageService);

    /** Référentiel des priorités indexé par id et par libellé pour récupérer les vraies couleurs */
    private readonly prioritesMap = new Map<string, PrioriteDocument>();

    /** Chargement des chiffres de stock ; les listes de travail ont le leur. */
    loading: boolean = true;
    /** Chargement des listes de travail : « rien à faire » ne doit pas s'afficher avant de le savoir. */
    chargementATraiter: boolean = true;

    stats: DocumentStatsDto | null = null;

    countByStatus: DimensionEntry[] = [];
    countByDocumentType: DimensionEntry[] = [];

    /** Demandes : total des demandes, tous instructeurs confondus. */
    demandesTotal = 0;

    /** Données et état du graphique d'évolution temporelle */
    evolutionTotal: number = 0;
    evolutionChartData: any = { labels: [], datasets: [] };
    evolutionBreakdownItems: BreakdownItem[] = [];
    selectedYear: Date = new Date();
    selectedMonth: Date | null = null;
    selectedStructure: string | number | null = null;
    private rawDocsParMois: Record<string, number> = {};
    private rawDemandesParMois: Record<string, number> = {};

    /** Données du graphique Donut (Bloc Droit) */
    donutSeries: number[] = [];
    donutLabels: string[] = [];
    donutColors: string[] = [];
    donutStats: ChartDonutStatItem[] = [];
    donutMode: 'STATUT' | 'TYPE' = 'STATUT';

    /** Ce que l'utilisateur a à traiter, mis en forme pour le tableau. */
    documentsATraiter: LigneATraiter[] = [];
    demandesATraiter: LigneATraiter[] = [];

    /** Indicateurs enrichis pour la 1ère card (Documents à traiter) */
    documentsATraiterMeterData: any[] = [];
    documentsATraiterSubText: string = '';
    documentsATraiterMeterMax: number = 1;

    /** Indicateurs enrichis pour la 2ème card (Demandes à instruire) */
    demandesATraiterMeterData: any[] = [];
    demandesATraiterSubText: string = '';
    demandesATraiterMeterMax: number = 1;

    /** Indicateurs enrichis pour la 3ème card (Total Documents) */
    totalDocumentsMeterData: any[] = [];
    totalDocumentsSubText: string = '';
    totalDocumentsMeterMax: number = 1;

    /** Indicateurs enrichis pour la 4ème card (En retard de révision) */
    retardRevisionMeterData: any[] = [];
    retardRevisionSubText: string = '';
    retardRevisionMeterMax: number = 100;

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

        // 1. Charge les couleurs et priorités configurées dans le référentiel officiel
        this.chargerPriorites();

        // L'état est partagé avec la cloche de notifications : elle annonce ce que cette page
        // montre, et une décision prise ici la corrige du même coup.
        this.aTraiterService.aTraiter$
            .pipe(takeUntil(this.destroy$))
            .subscribe((etat) => {
                this.documentsATraiter = (etat.documents ?? []).map(doc => this.ligneDeDocument(doc));
                this.demandesATraiter = (etat.demandes ?? []).map(demande => this.ligneDeDemande(demande));
                this.calculerIndicateursDocumentsATraiter(etat.documents ?? []);
                this.calculerIndicateursDemandesATraiter(etat.demandes ?? []);
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
            parMois: this.qmsService.getDocumentsParMois(24),
            demandes: this.demandeService.statistiques(24)
        })
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: ({ stats, byStatus, byType, parMois, demandes }) => {
                    this.stats = (stats as any)?.data ?? stats;
                    this.countByStatus = this.toEntries(byStatus);
                    if (this.countByStatus.length === 0 && this.stats?.countByStatus) {
                        this.countByStatus = this.toEntries(this.stats.countByStatus);
                    }
                    this.countByDocumentType = this.toEntries(byType);
                    if (this.countByDocumentType.length === 0 && this.stats?.countByDocumentType) {
                        this.countByDocumentType = this.toEntries(this.stats.countByDocumentType);
                    }
                    this.demandesTotal = Number(demandes?.total) || 0;
                    this.rawDocsParMois = (parMois as any)?.data ?? parMois ?? {};
                    this.rawDemandesParMois = demandes?.parMois ?? {};
                    this.construireGraphiqueEvolution();
                    this.construireDonutStatut();
                    this.calculerIndicateursStockEtRetard();
                    if (this.aTraiterService.instantane.demandes) {
                        this.calculerIndicateursDemandesATraiter(this.aTraiterService.instantane.demandes);
                    }
                    this.loading = false;
                },
                error: () => {
                    this.loading = false;
                }
            });
    }

    onChartFilterChange(event: ChartFilterEvent): void {
        this.selectedYear = new Date(event.annee, 0, 1);
        this.selectedMonth = event.mois ? new Date(event.annee, event.mois - 1, 1) : null;
        this.selectedStructure = event.structureId || null;
        this.construireGraphiqueEvolution();
    }

    private construireGraphiqueEvolution(): void {
        const annee = this.selectedYear ? (this.selectedYear instanceof Date ? this.selectedYear.getFullYear() : new Date(this.selectedYear).getFullYear()) : new Date().getFullYear();
        const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

        const docsData: number[] = [];
        const demandesData: number[] = [];

        for (let m = 1; m <= 12; m++) {
            const mm = String(m).padStart(2, '0');
            const key = `${annee}-${mm}`;
            const altKey = `${annee}-${m}`;
            const docCount = Number(this.rawDocsParMois[key] ?? this.rawDocsParMois[altKey] ?? 0);
            const demCount = Number(this.rawDemandesParMois[key] ?? this.rawDemandesParMois[altKey] ?? 0);
            docsData.push(docCount);
            demandesData.push(demCount);
        }

        if (this.selectedMonth) {
            const moisIdx = (this.selectedMonth instanceof Date ? this.selectedMonth : new Date(this.selectedMonth)).getMonth();
            const docsMois = docsData[moisIdx] || 0;
            const demMois = demandesData[moisIdx] || 0;
            this.evolutionTotal = docsMois + demMois;
            this.evolutionBreakdownItems = [
                {
                    label: 'Documents créés',
                    count: docsMois,
                    customColor: '#0084ca'
                },
                {
                    label: 'Demandes déposées',
                    count: demMois,
                    customColor: '#a855f7'
                }
            ];
        } else {
            const totalDocs = docsData.reduce((a, b) => a + b, 0);
            const totalDemandes = demandesData.reduce((a, b) => a + b, 0);
            this.evolutionTotal = totalDocs + totalDemandes;
            this.evolutionBreakdownItems = [
                {
                    label: 'Documents créés',
                    count: totalDocs,
                    customColor: '#0084ca'
                },
                {
                    label: 'Demandes déposées',
                    count: totalDemandes,
                    customColor: '#a855f7'
                }
            ];
        }

        this.evolutionChartData = {
            labels: monthNames,
            datasets: [
                {
                    label: 'Documents créés',
                    data: docsData,
                    borderColor: '#0084ca',
                    backgroundColor: '#0084ca'
                },
                {
                    label: 'Demandes déposées',
                    data: demandesData,
                    borderColor: '#a855f7',
                    backgroundColor: '#a855f7'
                }
            ]
        };
    }

    setDonutMode(mode: 'STATUT' | 'TYPE'): void {
        this.donutMode = mode;
        this.construireDonutStatut();
    }

    private construireDonutStatut(): void {
        const total = this.stats?.totalDocuments || 0;
        const retard = this.stats?.documentsEnRetardRevision || 0;

        if (this.donutMode === 'STATUT') {
            const statusWithDocs = (this.countByStatus || []).filter(e => e.count > 0);
            if (statusWithDocs.length > 0) {
                this.donutLabels = statusWithDocs.map(e => this.libelleStatut(e.label));
                this.donutSeries = statusWithDocs.map(e => e.count);
                this.donutColors = statusWithDocs.map((e, idx) => {
                    const l = e.label?.toUpperCase();
                    if (l === 'EN_VIGUEUR') return '#10b981'; // Vert
                    if (l === 'APPROUVE') return '#0084ca'; // Bleu QualiSira
                    if (l.includes('REVISION')) return '#f59e0b'; // Ambre
                    if (l.includes('VALIDATION') || l === 'BROUILLON') return '#bc9551'; // Ocre
                    if (l === 'OBSOLETE' || l === 'REJETE') return '#ef4444'; // Rouge
                    const colors = ['#0084ca', '#10b981', '#bc9551', '#a855f7', '#06b6d4'];
                    return colors[idx % colors.length];
                });
            } else if (total > 0) {
                this.donutLabels = ['En vigueur'];
                this.donutSeries = [total];
                this.donutColors = ['#10b981'];
            } else {
                this.donutLabels = [];
                this.donutSeries = [];
            }
        } else {
            // Mode 'TYPE'
            const typesWithDocs = (this.countByDocumentType || []).filter(e => e.count > 0);
            if (typesWithDocs.length > 0) {
                this.donutLabels = typesWithDocs.map(e => this.libelleType(e.label));
                this.donutSeries = typesWithDocs.map(e => e.count);
                const colors = ['#0084ca', '#10b981', '#bc9551', '#a855f7', '#06b6d4', '#ec4899'];
                this.donutColors = typesWithDocs.map((_, idx) => colors[idx % colors.length]);
            } else {
                this.donutLabels = [];
                this.donutSeries = [];
            }
        }

        const tauxConformite = total > 0 ? Math.round(((total - retard) / total) * 100) : 100;
        this.donutStats = [
            {
                label: 'Conformité ISO',
                value: `${tauxConformite}%`,
                color: retard === 0 ? '#10b981' : '#ef4444'
            },
            {
                label: 'En révision',
                value: this.countByStatus.find(s => s.label?.includes('REVISION'))?.count || 0,
                color: '#f59e0b'
            },
            {
                label: 'En retard',
                value: retard,
                color: retard > 0 ? '#ef4444' : '#10b981'
            }
        ];
    }

    private libelleStatut(statut: string): string {
        switch (statut?.toUpperCase()) {
            case 'EN_VIGUEUR': return 'En vigueur';
            case 'BROUILLON': return 'Brouillon';
            case 'EN_COURS_REVISION':
            case 'EN_REVISION': return 'En révision';
            case 'EN_VALIDATION':
            case 'EN_APPROBATION': return 'En validation';
            case 'APPROUVE': return 'Approuvé';
            case 'ARCHIVE': return 'Archivé';
            case 'OBSOLETE': return 'Obsolète';
            case 'REJETE': return 'Rejeté';
            default: return statut || 'Autre';
        }
    }

    private libelleType(type: string): string {
        switch (type?.toUpperCase()) {
            case 'PRO':
            case 'PROCEDURE': return 'Procédure';
            case 'INS':
            case 'INSTRUCTION': return 'Instruction';
            case 'NOR':
            case 'NORME': return 'Norme';
            case 'ENR':
            case 'ENREGISTREMENT': return 'Enregistrement';
            case 'POL':
            case 'POLITIQUE': return 'Politique';
            case 'MAN':
            case 'MANUEL': return 'Manuel';
            default: return type || 'Document';
        }
    }

    /**
     * Un document, réduit à ce qu'il faut pour décider.
     *
     * <p>L'étape vient de l'état du circuit, non du champ recopié sur le document : c'est le moteur
     * qui fait foi, et le champ local peut être en retard d'une transition.</p>
     */
    private ligneDeDocument(doc: DocumentQms): LigneATraiter {
        const etapeNom = doc.workflowState?.currentStateName || doc.currentEtape || 'Rédaction';
        const nomFichier = doc.currentObjectName;
        return {
            id: doc.id!,
            documentId: doc.id!,
            reference: doc.documentNumber,
            titre: doc.titre || 'Document sans titre',
            detail: [doc.serviceLibelle, doc.redacteur].filter(Boolean).join(' — ') || undefined,
            badge: doc.documentType,
            badgeSeverite: 'secondary',
            etape: etapeNom,
            depuis: doc.createdAt ? formatDateToDDMMYYYY(doc.createdAt) : undefined,
            auteur: doc.redacteur || (doc as any).currentUserFullName || 'Non renseigné',
            nomFichier: nomFichier,
            iconeFichier: this.getIconeFichier(nomFichier),
            iconeEtape: this.getIconeEtape(etapeNom),
            delaiRelatif: this.getDelaiRelatif(doc.createdAt),
            statutDelai: 'À soumettre',
            peutApercu: this.isFormatVisualisable(nomFichier),
            deposerFichier: (fichier: File) =>
                this.qmsService.deposerFichierDEtape(doc.id ?? '', fichier),
            workflowState: doc.workflowState
        };
    }


    private ligneDeDemande(demande: DemandeDocumentDto): LigneATraiter {
        const etapeNom = demande.workflowState?.currentStateName || demande.currentEtape || 'Instruction';
        const nomFichier = demande.pieceJointeNom;
        return {
            id: demande.id,
            documentId: demande.documentId,
            reference: demande.documentNumber,
            titre: demande.objectif || demande.documentTitre || 'Demande',
            detail: [demande.documentTitre, demande.demandeurNom].filter(Boolean).join(' — ') || undefined,
            badge: demande.type === 'SUPPRESSION' ? 'Suppression' : 'Modification',
            badgeSeverite: demande.type === 'SUPPRESSION' ? 'danger' : 'info',
            etape: etapeNom,
            depuis: demande.createdAt ? formatDateToDDMMYYYY(demande.createdAt) : undefined,
            auteur: demande.demandeurNom || 'Demandeur',
            nomFichier: nomFichier,
            iconeFichier: this.getIconeFichier(nomFichier),
            iconeEtape: this.getIconeEtape(etapeNom),
            delaiRelatif: this.getDelaiRelatif(demande.createdAt),
            statutDelai: 'À instruire',
            peutApercu: this.isFormatVisualisable(nomFichier),
            deposerFichier: (fichier: File) =>
                this.demandeService.deposerFichierDEtape(demande.id, fichier),
            workflowState: demande.workflowState
        };
    }

    /** Charge les priorités et leurs couleurs configurées en base de données. */
    private chargerPriorites(): void {
        this.prioriteService.findAll(0, 100)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (res: any) => {
                    const list: PrioriteDocument[] = res?.data?.content || res?.data || (Array.isArray(res) ? res : []);
                    list.forEach(p => {
                        if (p.id) this.prioritesMap.set(p.id, p);
                        if (p.libelle) this.prioritesMap.set(p.libelle.trim().toLowerCase(), p);
                    });
                    // Si les documents sont déjà arrivés, recalculer avec les vraies couleurs du référentiel
                    if (this.aTraiterService.instantane.documents?.length) {
                        this.calculerIndicateursDocumentsATraiter(this.aTraiterService.instantane.documents);
                    }
                },
                error: () => { /* repli automatique sur les couleurs par défaut */ }
            });
    }

    /** Calcule la répartition par priorité et la synthèse des étapes pour la 1ère KPI card (Documents à traiter). */
    private calculerIndicateursDocumentsATraiter(docs: DocumentQms[]): void {
        if (!docs || docs.length === 0) {
            this.documentsATraiterMeterData = [
                { label: 'Bannette à jour (100%)', value: 100, color: '#10b981' }
            ];
            this.documentsATraiterSubText = 'Bannette à jour · Aucune action requise';
            this.documentsATraiterMeterMax = 100;
            return;
        }

        const prioritesMap = new Map<string, { count: number; color: string; rank: number; label: string }>();
        const etapesMap = new Map<string, number>();
        let nbUrgents = 0;

        for (const doc of docs) {
            // Priorité résolue depuis le référentiel officiel QualiSira
            const match = (doc.prioriteId ? this.prioritesMap.get(doc.prioriteId) : undefined)
                || (doc.prioriteLibelle ? this.prioritesMap.get(doc.prioriteLibelle.trim().toLowerCase()) : undefined);

            const libelle = match?.libelle || doc.prioriteLibelle || 'Normal';
            const color = match?.couleur || this.getCouleurParDefaut(libelle);
            const rank = match?.ordre ?? match?.score ?? this.getRangParDefaut(libelle);

            if (prioritesMap.has(libelle)) {
                prioritesMap.get(libelle)!.count++;
            } else {
                prioritesMap.set(libelle, {
                    count: 1,
                    color: color,
                    rank: rank,
                    label: libelle
                });
            }

            const libelleLower = libelle.toLowerCase();
            if (rank <= 2 || libelleLower.includes('urgent') || libelleLower.includes('critique') || libelleLower.includes('haut')) {
                nbUrgents++;
            }

            // Étape du workflow pour le sous-texte opérationnel
            const etape = doc.workflowState?.currentStateName || doc.currentEtape || 'Rédaction';
            etapesMap.set(etape, (etapesMap.get(etape) || 0) + 1);
        }

        // Tri : du plus prioritaire au moins prioritaire (gauche à droite dans la jauge)
        this.documentsATraiterMeterData = Array.from(prioritesMap.values())
            .sort((a, b) => a.rank - b.rank)
            .map(p => ({
                label: p.label,
                value: p.count,
                color: p.color
            }));

        this.documentsATraiterMeterMax = docs.length;

        // Synthèse textuelle claire sur les actions du workflow avec pluriel
        const detailsEtapes = Array.from(etapesMap.entries())
            .map(([etape, count]) => {
                const lower = etape.toLowerCase();
                const pluriel = count > 1 && !lower.endsWith('s') && !lower.endsWith('x') ? 's' : '';
                return `${count} ${lower}${pluriel}`;
            })
            .join(' · ');

        this.documentsATraiterSubText = nbUrgents > 0
            ? `${detailsEtapes} • ${nbUrgents} prioritaire${nbUrgents > 1 ? 's' : ''}`
            : detailsEtapes;
    }

    /** Calcule la ventilation et le sous-texte pour la 2ème KPI card (Demandes à instruire). */
    private calculerIndicateursDemandesATraiter(demandes: DemandeDocumentDto[]): void {
        if (!demandes || demandes.length === 0) {
            this.demandesATraiterMeterData = [
                { label: 'Flux maîtrisé (100%)', value: 100, color: '#c084fc' }
            ];
            this.demandesATraiterSubText = this.demandesTotal > 0
                ? `Flux maîtrisé • 0 en attente sur ${this.demandesTotal} globale${this.demandesTotal > 1 ? 's' : ''}`
                : 'Flux maîtrisé · 0 dossier en attente';
            this.demandesATraiterMeterMax = 100;
            return;
        }

        const typesMap = new Map<string, number>();

        for (const d of demandes) {
            const type = d.type === 'SUPPRESSION' ? 'Suppression' : 'Modification';
            typesMap.set(type, (typesMap.get(type) || 0) + 1);
        }

        const colorsByType: Record<string, string> = {
            'modification': '#8b5cf6', // violet
            'suppression': '#f43f5e',  // rose / rouge alerte
            'creation': '#06b6d4',     // cyan
        };

        this.demandesATraiterMeterData = Array.from(typesMap.entries()).map(([type, count]) => ({
            label: type,
            value: count,
            color: colorsByType[type.toLowerCase()] || '#8b5cf6'
        }));

        this.demandesATraiterMeterMax = demandes.length;

        this.demandesATraiterSubText = Array.from(typesMap.entries())
            .map(([type, count]) => `${count} ${type.toLowerCase()}${count > 1 ? 's' : ''}`)
            .join(' · ');
    }

    /** Calcule la répartition du stock (Card 3) et la conformité des révisions (Card 4). */
    private calculerIndicateursStockEtRetard(): void {
        const total = this.stats?.totalDocuments || 0;
        const retard = this.stats?.documentsEnRetardRevision || 0;

        // --- Card 3 : Total Documents (Ventilation par Typologie documentaire) ---
        const typeLabels: Record<string, { label: string; color: string }> = {
            'PRO': { label: 'Procédure', color: '#67e8f9' },
            'INS': { label: 'Instruction', color: '#a5b4fc' },
            'NOR': { label: 'Norme', color: '#f9a8d4' },
            'ENR': { label: 'Enregistrement', color: '#86efac' },
            'MAN': { label: 'Manuel', color: '#fde047' },
        };

        const typesBreakdown = this.countByDocumentType.filter(item => item.count > 0);

        if (typesBreakdown.length > 0) {
            this.totalDocumentsMeterData = typesBreakdown.map(item => {
                const conf = typeLabels[item.label.toUpperCase()] || { label: item.label, color: '#ffffff' };
                return {
                    label: conf.label,
                    value: item.count,
                    color: conf.color
                };
            });
            this.totalDocumentsMeterMax = total > 0 ? total : 1;

            this.totalDocumentsSubText = typesBreakdown
                .map(item => {
                    const conf = typeLabels[item.label.toUpperCase()] || { label: item.label, color: '#ffffff' };
                    const pluriel = item.count > 1 ? 's' : '';
                    return `${item.count} ${conf.label.toLowerCase()}${pluriel}`;
                })
                .slice(0, 3)
                .join(' · ');
        } else {
            this.totalDocumentsMeterData = [{ label: 'Fonds documentaire (100%)', value: 100, color: '#67e8f9' }];
            this.totalDocumentsMeterMax = 100;
            this.totalDocumentsSubText = total > 0 ? `${total} documents au référentiel` : 'Fonds documentaire vierge';
        }

        // --- Card 4 : En retard de révision (ISO 9001 §7.5) ---
        if (retard === 0) {
            this.retardRevisionMeterData = [{ label: 'À jour (100%)', value: 100, color: '#10b981' }];
            this.retardRevisionMeterMax = 100;
            this.retardRevisionSubText = '100% à jour · Zéro écart d\'audit';
        } else {
            const aJour = Math.max(0, total - retard);
            const pctRetard = total > 0 ? Math.round((retard / total) * 100) : 100;
            this.retardRevisionMeterData = [
                { label: 'En retard', value: retard, color: '#ef4444' },
                { label: 'À jour', value: aJour, color: '#10b981' }
            ];
            this.retardRevisionMeterMax = total > 0 ? total : retard;
            this.retardRevisionSubText = `${retard} échu${retard > 1 ? 's' : ''} • ${pctRetard}% du fonds`;
        }
    }

    private getCouleurParDefaut(libelle: string): string {
        const key = libelle.toLowerCase().trim();
        if (key.includes('urgent') || key.includes('critique')) return '#ef4444';
        if (key.includes('haut')) return '#f97316';
        if (key.includes('moyen') || key.includes('normal')) return '#fde047';
        return '#67e8f9';
    }

    private getRangParDefaut(libelle: string): number {
        const key = libelle.toLowerCase().trim();
        if (key.includes('urgent') || key.includes('critique')) return 1;
        if (key.includes('haut')) return 2;
        if (key.includes('moyen') || key.includes('normal')) return 3;
        return 4;
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

    ouvrirApercu(ligne: LigneATraiter): void {
        this.messageService.add({
            severity: 'info',
            summary: 'Visualisation',
            detail: 'Chargement de l\'aperçu...'
        });

        const targetId = ligne.documentId || ligne.id;
        this.qmsService.exportSecuredPdf(targetId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (blob: Blob) => {
                    const nomFichier = ligne.nomFichier || (ligne.reference ? `${ligne.reference}.pdf` : 'document.pdf');
                    this.lightbox?.openBlob(blob, nomFichier, ligne.titre || ligne.reference);
                },
                error: () => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Aperçu indisponible',
                        detail: 'Le fichier est introuvable ou inaccessible.'
                    });
                }
            });
    }

    modifierDossier(ligne: LigneATraiter): void {
        const targetId = ligne.documentId || ligne.id;
        this.router.navigate(['/gestion-documentaire/demandes/nouvelle'], {
            queryParams: { documentId: targetId }
        });
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

    /** Indique si le document peut être visualisé directement dans la Lightbox (PDF et images) */
    private isFormatVisualisable(nomFichier?: string): boolean {
        if (!nomFichier) return false;
        const lower = nomFichier.toLowerCase().trim();
        return lower.endsWith('.pdf') ||
               lower.endsWith('.png') ||
               lower.endsWith('.jpg') ||
               lower.endsWith('.jpeg') ||
               lower.endsWith('.webp') ||
               lower.endsWith('.svg') ||
               lower.endsWith('.gif');
    }

    /** Calcule le temps écoulé de manière lisible (ex: "Il y a 17 jours") */
    private getDelaiRelatif(dateStr?: string | Date): string {
        if (!dateStr) return '';
        const created = new Date(dateStr);
        if (isNaN(created.getTime())) return '';
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
