import { Component, OnDestroy, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, forkJoin, takeUntil } from 'rxjs';
import { NgPrimeModule } from '../../../../prime-ng.module';
import { DocStatsCardComponent } from '../../../components/gestion-documentaire/doc-stats-card/doc-stats-card.component';
import { QmsDocumentService } from '../../../services/module-gestion-documentaire/qms-document.service';
import { DemandeDocumentService } from '../../../services/module-gestion-documentaire/demande-document.service';
import { DocumentStatsDto } from '../../../models/gestion-documentaire.model';
import { LayoutService } from '../../../layout/service/layout.service';
import { hasAnyPermission } from '../../../utils/auth/auth-utils';

interface DimensionEntry {
    label: string;
    count: number;
}

/**
 * Palette catégorielle, validée pour les deux modes (bande de clarté, plancher de chroma,
 * séparation en vision daltonienne et en vision normale).
 *
 * <p>Les couleurs suivent l'entité, jamais son rang : chaque série garde sa teinte quel que soit
 * le nombre de séries affichées, sans quoi un filtre repeindrait les survivantes et ferait lire un
 * changement là où il n'y en a pas.</p>
 */
const PALETTE_CLAIRE = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4'];
const PALETTE_SOMBRE = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181'];

/**
 * Vue d'ensemble documentaire : ce qui est en stock, ce qui arrive, ce qui attend un geste.
 *
 * <p>La portée des chiffres est celle qu'applique le serveur — la structure de l'utilisateur, ou
 * l'ensemble pour qui accompagne la qualité. Elle est annoncée à l'écran : un total dont on ignore
 * l'étendue n'est pas un chiffre, c'est une devinette.</p>
 */
@Component({
    selector: 'app-qms-vue-ensemble',
    standalone: true,
    imports: [CommonModule, NgPrimeModule, DocStatsCardComponent],
    templateUrl: './qms-vue-ensemble.component.html',
    styleUrl: './qms-vue-ensemble.component.scss'
})
export class QmsVueEnsembleComponent implements OnInit, OnDestroy {
    loading = true;
    stats: DocumentStatsDto | null = null;

    countByStatus: DimensionEntry[] = [];
    countByDocumentType: DimensionEntry[] = [];

    /** Demandes : total, en attente d'un geste, et répartition par état. */
    demandesTotal = 0;
    demandesEnAttente = 0;
    demandesParEtat: DimensionEntry[] = [];

    /** Voit-on toute l'organisation, ou sa seule structure ? */
    porteeGlobale = false;

    // --------------------------------------------------------------- graphiques
    donneesCourbe: any;
    optionsCourbe: any;
    donneesStatut: any;
    donneesDemandes: any;
    optionsCamembert: any;

    /** Séries brutes, conservées pour redessiner à l'identique quand le thème bascule. */
    private documentsParMois: Record<string, number> = {};
    private demandesParMois: Record<string, number> = {};

    private destroy$ = new Subject<void>();

    constructor(
        private qmsService: QmsDocumentService,
        private demandeService: DemandeDocumentService,
        private layoutService: LayoutService
    ) {
        // Le mode sombre n'est pas une inversion : les teintes y sont reprises pour la surface
        // sombre, et validées contre elle. Les graphiques sont donc recomposés à chaque bascule.
        effect(() => {
            this.layoutService.isDarkTheme();
            this.composerGraphiques();
        });
    }

    ngOnInit(): void {
        // Même règle que le serveur : responsable qualité et administration générale voient
        // l'ensemble des structures. Reconnus ici par des permissions qui n'appartiennent qu'à eux,
        // le front ne disposant pas des noms de rôles.
        this.porteeGlobale = hasAnyPermission(
            ['MANAGE_USER', 'ROLE_MANAGE', 'CONFIG_GLOBAL_MANAGE',
             'nc-close', 'demande-document-validate']);
        this.loadStats();
    }

    loadStats(): void {
        this.loading = true;
        forkJoin({
            stats: this.qmsService.getDocumentStats(),
            byStatus: this.qmsService.getDocumentStatsByDimension('STATUT'),
            byType: this.qmsService.getDocumentStatsByDimension('DOCUMENT_TYPE'),
            parMois: this.qmsService.getDocumentsParMois(12),
            demandes: this.demandeService.statistiques(12)
        })
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: ({ stats, byStatus, byType, parMois, demandes }) => {
                    this.stats = (stats as any)?.data ?? stats;
                    this.countByStatus = this.toEntries(byStatus);
                    this.countByDocumentType = this.toEntries(byType);

                    this.documentsParMois = parMois ?? {};
                    this.demandesParMois = demandes?.parMois ?? {};
                    this.demandesTotal = Number(demandes?.total) || 0;
                    this.demandesEnAttente = Number(demandes?.enAttente) || 0;
                    this.demandesParEtat = this.toEntries(demandes?.parEtat);

                    this.composerGraphiques();
                    this.loading = false;
                },
                error: () => {
                    this.loading = false;
                }
            });
    }

    // --------------------------------------------------------------- composition

    private get palette(): string[] {
        return this.layoutService.isDarkTheme() ? PALETTE_SOMBRE : PALETTE_CLAIRE;
    }

    private get encreDiscrete(): string {
        return this.layoutService.isDarkTheme() ? '#c3c2b7' : '#52514e';
    }

    /** Grille en retrait : elle situe, elle ne se lit pas. */
    private get grille(): string {
        return this.layoutService.isDarkTheme() ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
    }

    private get surface(): string {
        return this.layoutService.isDarkTheme() ? '#1a1a19' : '#ffffff';
    }

    private composerGraphiques(): void {
        const palette = this.palette;
        const mois = Object.keys(this.documentsParMois);

        // Deux séries de même nature — des comptages — donc un seul axe. Deux échelles
        // superposées feraient croire à des ordres de grandeur comparables qui ne le sont pas.
        this.donneesCourbe = {
            labels: mois.map((m) => this.libelleMois(m)),
            datasets: [
                this.serie('Documents déposés', mois.map((m) => this.documentsParMois[m] ?? 0), palette[0]),
                this.serie('Demandes déposées',
                    Object.keys(this.demandesParMois).map((m) => this.demandesParMois[m] ?? 0), palette[1])
            ]
        };

        this.optionsCourbe = {
            maintainAspectRatio: false,
            // Repère commun à toute la colonne survolée : on compare deux séries à une même date,
            // pas un point isolé.
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: this.encreDiscrete, usePointStyle: true, boxWidth: 8 }
                },
                tooltip: { mode: 'index', intersect: false }
            },
            scales: {
                x: { ticks: { color: this.encreDiscrete }, grid: { display: false } },
                y: {
                    beginAtZero: true,
                    // Des comptages : pas de demi-document.
                    ticks: { color: this.encreDiscrete, precision: 0 },
                    grid: { color: this.grille }
                }
            }
        };

        this.donneesStatut = this.camembert(this.countByStatus, palette);
        this.donneesDemandes = this.camembert(
            this.demandesParEtat.map((entree) => ({
                label: this.libelleEtatDemande(entree.label),
                count: entree.count
            })), palette);

        this.optionsCamembert = {
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: this.encreDiscrete, usePointStyle: true, boxWidth: 8 }
                }
            }
        };
    }

    private serie(libelle: string, donnees: number[], couleur: string): any {
        return {
            label: libelle,
            data: donnees,
            borderColor: couleur,
            backgroundColor: couleur,
            borderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 7,
            tension: 0.3,
            fill: false
        };
    }

    private camembert(entrees: DimensionEntry[], palette: string[]): any {
        return {
            labels: entrees.map((e) => e.label),
            datasets: [{
                data: entrees.map((e) => e.count),
                backgroundColor: entrees.map((_, i) => palette[i % palette.length]),
                // Un liseré de la couleur de la surface sépare les parts : sans lui, deux teintes
                // voisines se touchent et la frontière disparaît.
                borderColor: this.surface,
                borderWidth: 2
            }]
        };
    }

    /** « 2026-03 » → « mars 26 ». */
    private libelleMois(mois: string): string {
        const [annee, m] = mois.split('-');
        const noms = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin',
            'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
        return `${noms[Number(m) - 1] ?? mois} ${annee?.slice(2) ?? ''}`;
    }

    libelleEtatDemande(etat: string): string {
        switch (etat) {
            case 'EN_COURS': return 'En instruction';
            case 'ACCEPTEE': return 'Acceptée';
            case 'REFUSEE': return 'Refusée';
            case 'EXECUTEE': return 'Exécutée';
            default: return etat;
        }
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
