import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { NgPrimeModule } from '../../../../prime-ng.module';

import { ModuleAbonnement } from '@core/enums';
import { HeaderPage } from '../../../shared/header-page/header-page';
import { hasAnyPermission } from '@core/auth';
import { EtatLicence } from '../models/etat-licence.model';
import { LicenceService } from '../services/licence.service';

/** Un module de l'abonnement, et son sort sous la licence en cours. */
interface LigneModule {
    nom: string;
    libelle: string;
    ouvert: boolean;
}

/**
 * L'écran de la licence : ce qu'elle couvre, jusqu'à quand, et quoi faire ensuite.
 *
 * <p>Les modules ouverts étaient jusqu'ici énumérés dans le bandeau d'échéance, qui devenait une
 * ligne de deux cents caractères que personne ne lisait. Un bandeau doit tenir en une phrase ;
 * une liste demande un écran. Celui-ci les montre <b>tous</b>, ouverts comme fermés : savoir ce
 * dont on ne dispose pas est ce qui donne envie de le demander, alors qu'une liste des seuls
 * modules ouverts laisse croire qu'il n'existe rien d'autre.</p>
 *
 * <p>L'action porte le nom de ce qu'elle fait : « Renouveler » sous une licence commerciale en
 * cours, « Installer une licence » sous un essai ou après le terme. Sous les deux, c'est la même
 * fenêtre — mais quelqu'un en essai ne cherche pas à « renouveler », et ne cliquerait pas.</p>
 */
@Component({
    selector: 'app-licence',
    standalone: true,
    imports: [CommonModule, NgPrimeModule, HeaderPage],
    template: `
        <app-header-page 
            [title]="'Licence de l\\'installation'" 
            [subtitle]="'Consultez les modules inclus dans votre abonnement et leur date de validité.'"
        />
        <div class="card">
            <div class="flex flex-wrap items-start justify-between gap-3 mb-5">
                <div>
                    <h5 class="m-0 font-bold text-xl">Statut de votre abonnement</h5>
                    <p class="text-surface-500 mt-1 mb-0 leading-normal">
                        Consultez ici les modules accessibles et la date de fin de votre validité actuelle. À l'échéance, une nouvelle licence vous sera accordée pour assurer la continuité de vos activités sans interruption.
                    </p>
                </div>
                @if (peutInstaller) {
                    <p-button [label]="libelleAction" icon="pi pi-shield" severity="info"
                              (onClick)="ouvrirLaFenetre()"></p-button>
                }
            </div>

            @if (etat) {
                <div class="flex flex-wrap items-center gap-2 p-3 mb-5 border-round text-sm"
                     [ngClass]="bandeauClasse">
                    <i [class]="bandeauIcone"></i>
                    <span class="flex-1 min-w-[16rem]">{{ etat.message }}</span>
                    <p-tag [value]="libelleStatut" [severity]="severiteStatut"></p-tag>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
                    <div class="p-3 border-round bg-surface-50 dark:bg-surface-800">
                        <div class="text-surface-500 text-xs uppercase tracking-wider">Type</div>
                        <div class="font-semibold mt-1">{{ libelleType }}</div>
                    </div>
                    <div class="p-3 border-round bg-surface-50 dark:bg-surface-800">
                        <div class="text-surface-500 text-xs uppercase tracking-wider">Échéance</div>
                        <div class="font-semibold mt-1">
                            {{ etat.fin ? (etat.fin | date: 'dd/MM/yyyy') : '—' }}
                        </div>
                    </div>
                    <div class="p-3 border-round bg-surface-50 dark:bg-surface-800">
                        <div class="text-surface-500 text-xs uppercase tracking-wider">Jours restants</div>
                        <div class="font-semibold mt-1">
                            {{ etat.statut === 'ABSENTE' ? '—' : etat.joursRestants }}
                        </div>
                    </div>
                    <div class="p-3 border-round bg-surface-50 dark:bg-surface-800">
                        <div class="text-surface-500 text-xs uppercase tracking-wider">Utilisateurs</div>
                        <div class="font-semibold mt-1">{{ libelleUtilisateurs }}</div>
                    </div>
                </div>

                @if (etat.reference || etat.partenaireNom) {
                    <div class="text-sm text-surface-500 mb-5">
                        <span *ngIf="etat.reference">Référence : <b>{{ etat.reference }}</b></span>
                        <span *ngIf="etat.reference && etat.partenaireNom"> · </span>
                        <span *ngIf="etat.partenaireNom">Titulaire : <b>{{ etat.partenaireNom }}</b></span>
                    </div>
                }
            }

            <h6 class="font-bold mb-3">Modules</h6>
            <p-table [value]="modules" [tableStyle]="{ 'min-width': '30rem' }" styleClass="p-datatable-sm">
                <ng-template pTemplate="header">
                    <tr>
                        <th>Module</th>
                        <th style="width: 12rem">État</th>
                    </tr>
                </ng-template>
                <ng-template pTemplate="body" let-module>
                    <tr>
                        <td>{{ module.libelle }}</td>
                        <td>
                            <p-tag [value]="module.ouvert ? 'Ouvert' : 'Non souscrit'"
                                   [severity]="module.ouvert ? 'success' : 'secondary'"></p-tag>
                        </td>
                    </tr>
                </ng-template>
            </p-table>

            <p class="text-surface-500 text-sm mt-4 mb-0">
                Un module non souscrit reste consultable si des données y existent : seules les
                actions y sont refusées. Pour en ouvrir un, contactez l'éditeur.
            </p>
        </div>
    `
})
export class LicenceComponent implements OnInit, OnDestroy {

    /**
     * Intitulés lisibles des modules. Les clés sont celles de `ModuleAbonnement` — ces noms
     * voyagent dans la licence, et un écart d'une lettre fermerait un module en silence.
     */
    private static readonly LIBELLES: Record<string, string> = {
        [ModuleAbonnement.NON_CONFORMITE]: 'Non-conformités',
        [ModuleAbonnement.DOCUMENTAIRE]: 'Gestion documentaire',
        [ModuleAbonnement.RECLAMATION]: 'Réclamations',
        [ModuleAbonnement.RISQUE]: 'Risques',
        [ModuleAbonnement.AUDIT]: 'Audits',
        [ModuleAbonnement.FORMATION]: 'Ressources et formations',
        [ModuleAbonnement.REGLEMENTATION]: 'Réglementation',
        [ModuleAbonnement.EVALUATION]: "Critères d'évaluation",
        [ModuleAbonnement.CONTEXTE]: 'Contexte'
    };

    private readonly service = inject(LicenceService);
    private readonly destroy$ = new Subject<void>();

    etat: EtatLicence | null = null;
    modules: LigneModule[] = [];
    peutInstaller = false;

    ngOnInit(): void {
        this.peutInstaller = hasAnyPermission(
            ['SUPER_ADMIN', 'licence-write', 'CONFIG_GLOBAL_MANAGE', 'config-global-write']);

        this.service.etat$.pipe(takeUntil(this.destroy$)).subscribe((etat) => {
            this.etat = etat;
            this.modules = this.lignes(etat);
        });
        // Relu à l'ouverture de l'écran : c'est ici qu'on vient vérifier une échéance, la valeur
        // gardée depuis la connexion ne suffit pas.
        this.service.charger().subscribe({ error: () => undefined });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Tous les modules de l'abonnement, ouverts en premier.
     *
     * <p>Un module inconnu de l'énumération mais présent dans la licence est ajouté à la fin
     * plutôt qu'écarté : c'est le signe d'un front en retard sur une licence récente, et le
     * masquer ferait croire à un module qui manque.</p>
     */
    private lignes(etat: EtatLicence | null): LigneModule[] {
        const ouverts = etat?.modules ?? [];
        const connus = Object.values(ModuleAbonnement) as string[];
        const inconnus = ouverts.filter((module) => !connus.includes(module));

        return [...connus, ...inconnus]
            .map((nom) => ({
                nom,
                libelle: LicenceComponent.LIBELLES[nom] ?? nom,
                ouvert: ouverts.includes(nom)
            }))
            .sort((a, b) => Number(b.ouvert) - Number(a.ouvert));
    }

    get libelleAction(): string {
        // « Renouveler » n'a de sens que sous une licence commerciale qui court encore. En essai
        // ou après le terme, il n'y a rien à renouveler : il y a une licence à poser.
        return this.etat?.statut === 'ACTIVE' && this.etat.type === 'COMMERCIALE'
            ? 'Renouveler la licence'
            : 'Installer une licence';
    }

    /** « 3 comptes actifs » plutôt qu'un nombre nu ; « sans limite » quand la licence n'en pose pas. */
    get libelleUtilisateurs(): string {
        if (!this.etat || this.etat.statut === 'ABSENTE') return '—';
        return this.etat.utilisateursMax > 0
            ? `${this.etat.utilisateursMax} compte(s) actif(s) au plus`
            : 'Sans limite';
    }

    get libelleType(): string {
        if (!this.etat || this.etat.statut === 'ABSENTE') return 'Aucune licence';
        return this.etat.type === 'ESSAI' ? 'Essai gratuit' : 'Licence commerciale';
    }

    get libelleStatut(): string {
        switch (this.etat?.statut) {
            case 'ACTIVE': return 'Active';
            case 'EXPIREE': return 'Expirée';
            default: return 'Absente';
        }
    }

    get severiteStatut(): string {
        if (this.etat?.statut !== 'ACTIVE') return 'danger';
        return this.etat.type === 'ESSAI' ? 'warn' : 'success';
    }

    get bandeauClasse(): string {
        if (this.etat?.statut === 'EXPIREE' || this.etat?.statut === 'ABSENTE') {
            return 'bg-red-50 text-red-900';
        }
        return this.etat?.type === 'ESSAI'
            ? 'bg-orange-50 text-orange-900'
            : 'bg-blue-50 text-blue-900';
    }

    get bandeauIcone(): string {
        if (this.etat?.statut === 'EXPIREE' || this.etat?.statut === 'ABSENTE') {
            return 'pi pi-times-circle';
        }
        return this.etat?.type === 'ESSAI' ? 'pi pi-clock' : 'pi pi-check-circle';
    }

    ouvrirLaFenetre(): void {
        this.service.demanderOuverture();
    }
}
