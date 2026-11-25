import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { PopoverModule } from 'primeng/popover';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { catchError, of } from 'rxjs';
import { accesAutorise } from '@core/auth/auth-utils';
import { ModuleAbonnement } from '@core/enums/module-abonnement.enum';
import { QmsDocumentService } from '@features/gestion-documentaire/services/document.service';
import { ElementVentilation } from '../mes-decisions/mes-decisions.component';

/** Un indicateur affiché en tuile. */
interface Indicateur {
    cle: string;
    libelle: string;
    /** Ce que le nombre compte, dit sans ambiguïté : un indicateur mal défini ne sert à rien. */
    precision: string;
    valeur: number | null;
    icone: string;
    /** Couleur : elle ne décore pas, elle dit s'il y a lieu d'agir. */
    ton: 'neutre' | 'attention' | 'alerte' | 'primaire';
    /** Écran où l'on va voir ce que le nombre recouvre. */
    route?: string;
}

/**
 * Indicateurs de l'accueil : quatre nombres essentiels et actionnables.
 */
@Component({
    selector: 'app-indicateurs',
    standalone: true,
    imports: [CommonModule, PopoverModule, ButtonModule, TagModule, TooltipModule],
    templateUrl: 'indicateurs.component.html'
})
export class IndicateursComponent implements OnInit {

    /** Dossiers en attente d'une décision de l'utilisateur, ou null tant qu'on ne sait pas. */
    @Input() enAttente: number | null = null;

    /** Actions correctives dont l'échéance est passée. */
    @Input() plansEnRetard: number | null = null;

    /** Actions correctives à échéance dans la semaine. */
    @Input() plansEcheanceProche: number | null = null;

    /** Vrai si l'utilisateur voit des actions correctives : sinon leurs deux tuiles n'ont pas lieu. */
    @Input() suitDesActions = false;

    /** Répartition détaillée des dossiers en attente par module pour le popover interactif et la jauge. */
    @Input() repartition: ElementVentilation[] = [];

    /** Émis lorsqu'on choisit de filtrer la bannette sur un module depuis la ventilation. */
    @Output() filtrerFamille = new EventEmitter<string>();

    private readonly documentService = inject(QmsDocumentService);
    private readonly router = inject(Router);

    /** Retard de révision documentaire, lu auprès du module. */
    revisionEnRetard: number | null = null;
    private fondsDocumentaire: number | null = null;
    private accesDocumentaire = false;

    ngOnInit(): void {
        this.accesDocumentaire = accesAutorise(['document-read', 'document-write', 'DOC_READ'],
            ModuleAbonnement.DOCUMENTAIRE);
        if (!this.accesDocumentaire) {
            return;
        }
        this.charger();
    }

    charger(): void {
        if (!this.accesDocumentaire) {
            return;
        }
        this.documentService.getDocumentStats()
            .pipe(catchError(() => of(null)))
            .subscribe((reponse: any) => {
                const stats = reponse?.data ?? reponse;
                this.revisionEnRetard = stats?.documentsEnRetardRevision ?? null;
                this.fondsDocumentaire = stats?.totalDocuments ?? null;
            });
    }

    /** Total consolidé des dépassements d'échéances (actions correctives + révisions documentaires). */
    get totalRetards(): number | null {
        if (this.plansEnRetard === null && this.revisionEnRetard === null) {
            return null;
        }
        return (this.plansEnRetard ?? 0) + (this.revisionEnRetard ?? 0);
    }

    /** Segments pour la mini-jauge horizontale de la carte « À traiter par vous ». */
    get segmentsRepartition(): { cle: string; libelle: string; pct: number; color: string; count: number }[] {
        const total = this.enAttente ?? 0;
        if (!total || !this.repartition.length) {
            return [];
        }
        const palette: Record<string, string> = {
            nonConformites: '#ffffff',
            demandes: '#fcd34d',
            documents: '#6ee7b7',
            plansAction: '#bae6fd'
        };
        return this.repartition
            .filter((item) => item.count > 0)
            .map((item) => ({
                cle: item.cle,
                libelle: item.libelleCourt,
                count: item.count,
                pct: Math.max(4, Math.round((item.count / total) * 100)),
                color: palette[item.cle] || '#ffffff'
            }));
    }

    /** Synthèse textuelle courte en pied de carte « À traiter par vous ». */
    get resumeRepartition(): string {
        const nonVides = this.repartition.filter((item) => item.count > 0);
        if (!nonVides.length) {
            return 'Ventilation par module';
        }
        const labelsCourts: Record<string, string> = {
            nonConformites: 'NC',
            demandes: 'Demande(s)',
            documents: 'Doc(s)',
            plansAction: 'Action(s)'
        };
        return nonVides
            .slice(0, 3)
            .map((item) => `${item.count} ${labelsCourts[item.cle] || item.libelleCourt}`)
            .join(' · ');
    }

    /** Largeur de jauge pour la carte Retards critiques. */
    get largeurBarreRetards(): number {
        const retards = this.totalRetards ?? 0;
        if (retards === 0) return 100;
        return Math.min(100, Math.max(20, retards * 15));
    }

    /** Synthèse textuelle des retards pour le pied de la 2ème carte. */
    get resumeRetards(): string {
        const retards = this.totalRetards;
        if (retards === null || retards === 0) {
            return 'Actions & révisions à jour';
        }
        const parts: string[] = [];
        if (this.suitDesActions && (this.plansEnRetard ?? 0) > 0) {
            parts.push(`${this.plansEnRetard} action(s)`);
        }
        if (this.accesDocumentaire && (this.revisionEnRetard ?? 0) > 0) {
            parts.push(`${this.revisionEnRetard} révision(s)`);
        }
        return parts.join(' · ') || 'Ventilation des retards';
    }

    /** Détail ventilé des retards pour le popover de la 2ème carte. */
    get repartitionRetards(): { titre: string; count: number; route: string; icone: string; aide: string }[] {
        const items: { titre: string; count: number; route: string; icone: string; aide: string }[] = [];
        if (this.suitDesActions) {
            items.push({
                titre: 'Actions correctives',
                count: this.plansEnRetard ?? 0,
                route: '/non-conformite/plan-action',
                icone: 'pi pi-clock',
                aide: 'Échéance dépassée, action non soldée'
            });
        }
        if (this.accesDocumentaire) {
            items.push({
                titre: 'Documents à réviser',
                count: this.revisionEnRetard ?? 0,
                route: '/gestion-documentaire/documents',
                icone: 'pi pi-history',
                aide: 'Date de révision périodique dépassée'
            });
        }
        return items;
    }

    get indicateurs(): Indicateur[] {
        const tuiles: Indicateur[] = [];

        // 1. À traiter par vous (Action immédiate requise)
        if (this.enAttente !== null || this.suitDesActions || this.accesDocumentaire) {
            tuiles.push({
                cle: 'enAttente', libelle: 'À traiter par vous',
                precision: 'dossiers en attente',
                valeur: this.enAttente, icone: 'pi pi-inbox',
                ton: 'primaire'
            });
        }

        // 2. Retards critiques (Consolidation transversale des échéances dépassées)
        if (this.suitDesActions || this.accesDocumentaire) {
            tuiles.push({
                cle: 'retards', libelle: 'Retards critiques',
                precision: 'échéances dépassées',
                valeur: this.totalRetards, icone: 'pi pi-exclamation-triangle',
                ton: (this.totalRetards ?? 0) > 0 ? 'alerte' : 'neutre'
            });
        }

        // 3. Anticipation sous 7 jours
        if (this.suitDesActions) {
            tuiles.push({
                cle: 'proche', libelle: 'Échéance sous 7 jours',
                precision: 'actions cette semaine',
                valeur: this.plansEcheanceProche, icone: 'pi pi-calendar',
                ton: (this.plansEcheanceProche ?? 0) > 0 ? 'attention' : 'neutre',
                route: '/non-conformite/plan-action'
            });
        }

        // 4. Fonds actif / Maîtrise du référentiel
        if (this.accesDocumentaire) {
            tuiles.push({
                cle: 'fonds', libelle: 'Référentiel en vigueur',
                precision: 'documents applicables',
                valeur: this.fondsDocumentaire, icone: 'pi pi-folder',
                ton: 'neutre',
                route: '/gestion-documentaire/documents'
            });
        }

        return tuiles;
    }

    cadre(indicateur: Indicateur): string {
        if (indicateur.ton === 'primaire') {
            return 'border-[#0084ca] hover:border-[#0070ac]';
        }
        if (indicateur.ton === 'alerte') {
            return 'border-rose-300 dark:border-rose-700/60 hover:border-rose-400';
        }
        return indicateur.ton === 'attention'
            ? 'border-amber-300 dark:border-amber-700/60 hover:border-amber-400'
            : 'border-[#dddddd] dark:border-surface-700 hover:border-[#0ea5e9]/45';
    }

    teinte(indicateur: Indicateur): string {
        if (indicateur.ton === 'primaire') {
            return 'text-[#0084ca] dark:text-sky-400';
        }
        if (indicateur.ton === 'alerte') {
            return 'text-rose-600 dark:text-rose-400';
        }
        return indicateur.ton === 'attention'
            ? 'text-amber-600 dark:text-amber-400'
            : 'text-[var(--heading-color)]';
    }

    ouvrir(indicateur: Indicateur): void {
        if (indicateur.route) {
            this.router.navigate([indicateur.route]);
        }
    }

    filtrerOuNaviguer(cle: string, route: string, op?: any): void {
        if (op) {
            op.hide();
        }
        this.filtrerFamille.emit(cle);
    }

    ouvrirRoute(route?: string, op?: any): void {
        if (op) {
            op.hide();
        }
        if (route) {
            this.router.navigate([route]);
        }
    }
}
