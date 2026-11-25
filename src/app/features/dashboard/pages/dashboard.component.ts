import { CommonModule } from '@angular/common';
import { Component, ViewChild, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { currentUserState } from '@core/auth/auth.state';
import { accesAutorise, getCurrentUserStructure } from '@core/auth/auth-utils';
import { ModuleAbonnement } from '@core/enums/module-abonnement.enum';
import { LicenceOuverteDirective } from '@shared/licence/licence-ouverte.directive';
import { ElementVentilation, EtatDeLaListe, Famille, MesDecisionsComponent } from '../components/mes-decisions/mes-decisions.component';
import { ActionsRapidesComponent } from '../components/actions-rapide/actions-rapides.component';
import { IndicateursComponent } from '../components/indicateurs/indicateurs.component';

/**
 * Accueil : ce qu'on attend de vous, et ce que vous pouvez entreprendre.
 */
@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [
        CommonModule,
        ButtonModule,
        TooltipModule,
        LicenceOuverteDirective,
        MesDecisionsComponent,
        ActionsRapidesComponent,
        IndicateursComponent
    ],
    templateUrl: 'dashboard.component.html'
})
export class Dashboard {

    @ViewChild(MesDecisionsComponent) private mesDecisions?: MesDecisionsComponent;
    @ViewChild(IndicateursComponent) private indicateursComp?: IndicateursComponent;

    private readonly router = inject(Router);

    /** État de rafraîchissement manuel */
    isRefreshing = false;

    /** Onglet actuellement actif dans la bannette (pour synchroniser la carte Charge par module). */
    filtreModuleActif: 'all' | Famille['cle'] = 'all';

    /** Date du jour formatée en français */
    readonly dateDuJour: string = (() => {
        const d = new Date();
        const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
        const texte = d.toLocaleDateString('fr-FR', options);
        return texte.charAt(0).toUpperCase() + texte.slice(1);
    })();

    /** Ce que la liste de travail a trouvé. */
    etat?: EtatDeLaListe;

    /** Les nombres veulent-ils déjà dire quelque chose ? */
    get connu(): boolean {
        return !!this.etat && !this.etat.chargement;
    }

    /** Vrai si l'utilisateur dispose d'au moins un module suivi par un circuit de décisions. */
    get aDesDecisionsSuivies(): boolean {
        return (this.etat?.repartition?.length ?? 0) > 0;
    }

    /** Nom de la personne connectée, initiales et structure. */
    readonly nom: string;
    readonly initiales: string;
    readonly structure: string;
    readonly canDeclareNc: boolean;
    readonly canCreateDoc: boolean;

    constructor() {
        const racine: any = currentUserState.value ?? {};
        const utilisateur: any = racine.user ?? {};
        const prenom = racine.firstName || utilisateur.firstName || '';
        const patronyme = racine.lastName || utilisateur.lastName || '';
        this.nom = `${prenom} ${patronyme}`.trim()
            || racine.username || utilisateur.username || utilisateur.email || '';
        const parties = this.nom.split(/\s+/).filter(Boolean);
        this.initiales = parties.length >= 2
            ? `${parties[0][0]}${parties[parties.length - 1][0]}`.toUpperCase()
            : (parties[0]?.slice(0, 2).toUpperCase() || 'QS');
        const structure = getCurrentUserStructure();
        this.structure = structure?.libelleCourt || structure?.libelleLong || '';

        this.canDeclareNc = accesAutorise(['nc-write', 'SUBMIT_NC'], ModuleAbonnement.NON_CONFORMITE);
        this.canCreateDoc = accesAutorise(['document-write'], ModuleAbonnement.DOCUMENTAIRE);
    }

    /** Phrase de synthèse contextuelle. */
    get synthese(): string {
        if (!this.etat) {
            return 'Voici votre journée.';
        }
        if (this.etat.chargement) {
            return 'Recherche des dossiers qui vous attendent…';
        }
        const total = this.etat.total;
        if (total === 0) {
            return 'Aucun dossier n\'attend votre décision.';
        }
        return total === 1
            ? 'Un dossier attend votre décision.'
            : `${total} dossiers attendent votre décision.`;
    }

    pourcentageCharge(count: number): number {
        const total = this.etat?.total ?? 0;
        if (!total || !count) return 0;
        return Math.round((count / total) * 100);
    }

    largeurBarreCharge(count: number): number {
        const pct = this.pourcentageCharge(count);
        if (count > 0 && pct < 5) return 5;
        return pct;
    }

    couleurBarreCharge(cle: string): string {
        switch (cle) {
            case 'nonConformites':
                return 'bg-amber-500';
            case 'demandes':
                return 'bg-violet-500';
            case 'documents':
                return 'bg-[#0084ca]';
            case 'plansAction':
                return 'bg-emerald-500';
            default:
                return 'bg-[#0084ca]';
        }
    }

    couleurTexteCharge(cle: string): string {
        switch (cle) {
            case 'nonConformites':
                return 'text-amber-600 dark:text-amber-400';
            case 'demandes':
                return 'text-violet-600 dark:text-violet-400';
            case 'documents':
                return 'text-[#0084ca] dark:text-sky-400';
            case 'plansAction':
                return 'text-emerald-600 dark:text-emerald-400';
            default:
                return 'text-[var(--heading-color)]';
        }
    }

    filtrerBannette(cle: string, depuisBarre = false): void {
        const cible = cle as Famille['cle'];
        const suivant = (depuisBarre && this.filtreModuleActif === cible) ? 'all' : cible;
        this.filtreModuleActif = suivant;
        this.mesDecisions?.selectionnerOnglet(suivant);
    }

    ouvrirRaccourciPrincipal(): void {
        if (this.canDeclareNc) {
            this.router.navigate(['/non-conformite/create']);
        } else if (this.canCreateDoc) {
            this.router.navigate(['/gestion-documentaire/create']);
        }
    }

    trackByCharge(_index: number, item: ElementVentilation): string {
        return item.cle;
    }

    /** Déclenche un rafraîchissement manuel de l'ensemble des données de l'accueil. */
    actualiser(): void {
        this.isRefreshing = true;
        this.mesDecisions?.charger();
        this.indicateursComp?.charger();
        setTimeout(() => {
            this.isRefreshing = false;
        }, 600);
    }
}

export { Dashboard as DashboardComponent };
