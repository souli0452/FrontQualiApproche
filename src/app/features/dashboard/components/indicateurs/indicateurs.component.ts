import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, inject } from '@angular/core';
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
 * Indicateurs de l'accueil : quatre ou cinq nombres, et rien de plus.
 *
 * <p>Un tableau de bord qualité ne se juge pas au nombre de graphiques mais à ce qu'il fait faire.
 * Chaque nombre ici répond à une question qu'un responsable qualité se pose tous les jours — qu'est-ce
 * qui m'attend, qu'est-ce qui est en retard, quelle documentation n'est plus à jour — et mène à l'écran
 * qui permet d'y répondre.</p>
 *
 * <p><b>Chaque nombre a une source vérifiée.</b> Ce qui attend une décision et le retard des actions
 * viennent des listes que l'accueil charge déjà — celles du moteur de circuit, qui applique
 * l'habilitation des étapes. Le retard de révision et le fonds documentaire viennent des statistiques
 * du module documentaire, déjà bornées aux documents que l'appelant peut voir. Rien n'est estimé.</p>
 *
 * <p>Comme le reste de l'accueil : un indicateur dont le module n'est pas souscrit, ou dont la
 * permission manque, n'est pas affiché — ni à zéro, ni en tiret.</p>
 */
@Component({
    selector: 'app-indicateurs',
    standalone: true,
    imports: [CommonModule, PopoverModule, ButtonModule, TagModule, TooltipModule],
    templateUrl: 'indicateurs.component.html'
})
export class IndicateursComponent implements OnInit {

    /**
     * Dossiers en attente d'une décision de l'utilisateur, ou {@code null} tant qu'on ne sait pas.
     *
     * <p>Fourni par la liste de travail de l'accueil, qui l'a déjà demandé : le redemander ici
     * doublerait les appels et les deux nombres finiraient par différer.</p>
     */
    @Input() enAttente: number | null = null;

    /** Actions correctives dont l'échéance est passée. */
    @Input() plansEnRetard: number | null = null;

    /** Actions correctives à échéance dans la semaine. */
    @Input() plansEcheanceProche: number | null = null;

    /** Vrai si l'utilisateur voit des actions correctives : sinon leurs deux tuiles n'ont pas lieu. */
    @Input() suitDesActions = false;

    /** Répartition détaillée des dossiers en attente par module pour le popover interactif. */
    @Input() repartition: ElementVentilation[] = [];

    private readonly documentService = inject(QmsDocumentService);
    private readonly router = inject(Router);

    /** Retard de révision documentaire, lu auprès du module. */
    private revisionEnRetard: number | null = null;
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
        // Statistiques déjà bornées par le serveur aux documents que l'appelant peut voir : le
        // nombre affiché est donc celui de son périmètre, et non celui de l'organisation entière.
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
                precision: 'Dossiers attendant votre décision',
                valeur: this.enAttente, icone: 'pi pi-inbox',
                ton: 'primaire'
            });
        }

        // 2. Retards critiques (Consolidation transversale des échéances dépassées)
        if (this.suitDesActions || this.accesDocumentaire) {
            tuiles.push({
                cle: 'retards', libelle: 'Retards critiques',
                precision: 'Échéances et révisions dépassées',
                valeur: this.totalRetards, icone: 'pi pi-exclamation-triangle',
                ton: (this.totalRetards ?? 0) > 0 ? 'alerte' : 'neutre'
            });
        }

        // 3. Anticipation sous 7 jours
        if (this.suitDesActions) {
            tuiles.push({
                cle: 'proche', libelle: 'Échéance sous 7 jours',
                precision: 'Actions à solder cette semaine',
                valeur: this.plansEcheanceProche, icone: 'pi pi-calendar',
                ton: (this.plansEcheanceProche ?? 0) > 0 ? 'attention' : 'neutre',
                route: '/non-conformite/plan-action'
            });
        }

        // 4. Fonds actif / Maîtrise du référentiel
        if (this.accesDocumentaire) {
            tuiles.push({
                cle: 'fonds', libelle: 'Référentiel en vigueur',
                precision: 'Documents actifs et applicables',
                valeur: this.fondsDocumentaire, icone: 'pi pi-folder',
                ton: 'neutre',
                route: '/gestion-documentaire/documents'
            });
        }

        return tuiles;
    }

    cadre(indicateur: Indicateur): string {
        if (indicateur.ton === 'primaire') {
            return 'border-primary-200/80 dark:border-primary-800/50 hover:border-primary-400 dark:hover:border-primary-600 shadow-xs hover:shadow-sm';
        }
        if (indicateur.ton === 'alerte') {
            return 'border-red-200 dark:border-red-800/40 hover:border-red-300';
        }
        return indicateur.ton === 'attention' ? 'border-amber-200 dark:border-amber-800/40 hover:border-amber-300' : 'border-surface-200 dark:border-surface-700 hover:border-surface-300';
    }

    teinte(indicateur: Indicateur): string {
        if (indicateur.ton === 'primaire') {
            return 'text-primary-600 dark:text-primary-400';
        }
        if (indicateur.ton === 'alerte') {
            return 'text-red-600 dark:text-red-400';
        }
        return indicateur.ton === 'attention' ? 'text-amber-600 dark:text-amber-400' : 'text-surface-700 dark:text-surface-300';
    }

    ouvrir(indicateur: Indicateur): void {
        if (indicateur.route) {
            this.router.navigate([indicateur.route]);
        }
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
