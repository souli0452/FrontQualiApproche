import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, of } from 'rxjs';
import { accesAutorise } from '@core/auth/auth-utils';
import { ModuleAbonnement } from '@core/enums/module-abonnement.enum';
import { QmsDocumentService } from '@features/gestion-documentaire/services/document.service';

/** Un indicateur affiché en tuile. */
interface Indicateur {
    cle: string;
    libelle: string;
    /** Ce que le nombre compte, dit sans ambiguïté : un indicateur mal défini ne sert à rien. */
    precision: string;
    valeur: number | null;
    icone: string;
    /** Couleur : elle ne décore pas, elle dit s'il y a lieu d'agir. */
    ton: 'neutre' | 'attention' | 'alerte';
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
    imports: [CommonModule],
    template: `
        @if (indicateurs.length) {
            <div class="grid grid-cols-12 gap-3">
                @for (indicateur of indicateurs; track indicateur.cle) {
                    <div class="col-span-12 sm:col-span-6 xl:col-span-3">
                        <button type="button"
                                class="w-full text-left rounded-xl border bg-surface-0 p-4
                                       transition-colors hover:bg-surface-50"
                                [class]="cadre(indicateur)"
                                [disabled]="!indicateur.route"
                                (click)="ouvrir(indicateur)">
                            <div class="flex items-start justify-between gap-2">
                                <span class="text-xs font-semibold uppercase tracking-wide text-surface-500">
                                    {{ indicateur.libelle }}
                                </span>
                                <i [class]="indicateur.icone" [ngClass]="teinte(indicateur)"></i>
                            </div>
                            <div class="text-3xl font-bold mt-2" [ngClass]="teinte(indicateur)">
                                @if (indicateur.valeur === null) {
                                    <span class="text-surface-300">—</span>
                                } @else {
                                    {{ indicateur.valeur }}
                                }
                            </div>
                            <div class="text-xs text-surface-500 mt-1">{{ indicateur.precision }}</div>
                        </button>
                    </div>
                }
            </div>
        }
    `
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

    get indicateurs(): Indicateur[] {
        const tuiles: Indicateur[] = [];

        if (this.enAttente !== null || this.suitDesActions || this.accesDocumentaire) {
            tuiles.push({
                cle: 'enAttente', libelle: 'En attente de vous',
                precision: 'Dossiers dont une étape vous est confiée',
                valeur: this.enAttente, icone: 'pi pi-inbox',
                ton: (this.enAttente ?? 0) > 0 ? 'attention' : 'neutre'
            });
        }

        if (this.suitDesActions) {
            tuiles.push({
                cle: 'retard', libelle: 'Actions en retard',
                precision: 'Échéance dépassée, action non soldée',
                valeur: this.plansEnRetard, icone: 'pi pi-clock',
                ton: (this.plansEnRetard ?? 0) > 0 ? 'alerte' : 'neutre',
                route: '/non-conformite/actions'
            });
            tuiles.push({
                cle: 'proche', libelle: 'Échéance sous 7 jours',
                precision: 'Actions encore tenables si elles sont menées maintenant',
                valeur: this.plansEcheanceProche, icone: 'pi pi-calendar',
                ton: (this.plansEcheanceProche ?? 0) > 0 ? 'attention' : 'neutre',
                route: '/non-conformite/actions'
            });
        }

        if (this.accesDocumentaire) {
            tuiles.push({
                cle: 'revision', libelle: 'Révisions en retard',
                precision: 'Documents dont la date de révision est passée',
                valeur: this.revisionEnRetard, icone: 'pi pi-history',
                ton: (this.revisionEnRetard ?? 0) > 0 ? 'alerte' : 'neutre',
                route: '/gestion-documentaire/documents'
            });
            tuiles.push({
                cle: 'fonds', libelle: 'Documents référencés',
                precision: 'Ceux auxquels vous avez accès',
                valeur: this.fondsDocumentaire, icone: 'pi pi-folder',
                ton: 'neutre',
                route: '/gestion-documentaire/documents'
            });
        }

        return tuiles;
    }

    cadre(indicateur: Indicateur): string {
        if (indicateur.ton === 'alerte') {
            return 'border-red-200';
        }
        return indicateur.ton === 'attention' ? 'border-amber-200' : 'border-surface-200';
    }

    teinte(indicateur: Indicateur): string {
        if (indicateur.ton === 'alerte') {
            return 'text-red-600';
        }
        return indicateur.ton === 'attention' ? 'text-amber-600' : 'text-surface-700';
    }

    ouvrir(indicateur: Indicateur): void {
        if (indicateur.route) {
            this.router.navigate([indicateur.route]);
        }
    }
}
