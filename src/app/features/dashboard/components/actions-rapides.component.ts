import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { accesAutorise } from '@core/auth/auth-utils';
import { ModuleAbonnement } from '@core/enums/module-abonnement.enum';

/** Une action offerte depuis l'accueil, et ce qu'il faut détenir pour qu'elle apparaisse. */
interface ActionRapide {
    libelle: string;
    /** Ce que l'action produit, dit en une ligne : le libellé seul reste abstrait. */
    aide: string;
    icone: string;
    route: string;
    /** Une seule de ces permissions suffit. */
    permissions: string[];
    /** Module dont l'organisation doit avoir souscrit, si l'action en relève. */
    module?: string;
}

/**
 * Ce que l'utilisateur peut entreprendre depuis l'accueil.
 *
 * <p>Les gestes courants d'un système qualité — déclarer un écart, déposer une procédure, demander la
 * révision d'un document — se trouvaient à deux ou trois niveaux de menu. Ils sont ici, et
 * <b>uniquement ceux que la personne peut réellement accomplir</b> : chaque tuile porte les mêmes
 * permissions et le même module que la route qu'elle ouvre. Une tuile qui mènerait à un refus serait
 * pire que son absence — elle laisse croire à un droit qu'on n'a pas, et fait chercher une panne là
 * où il n'y a qu'une habilitation manquante.</p>
 *
 * <p>Rien n'est affiché du tout si aucune action n'est ouverte : un cadre vide intitulé « Actions
 * rapides » ne rendrait service à personne.</p>
 */
@Component({
    selector: 'app-actions-rapides',
    standalone: true,
    imports: [CommonModule],
    template: `
        @if (actions.length) {
            <div class="grid grid-cols-12 gap-3">
                @for (action of actions; track action.route) {
                    <button type="button"
                            class="col-span-12 sm:col-span-6 xl:col-span-4 text-left rounded-xl border
                                   border-surface-200 bg-surface-0 p-4 flex items-start gap-3
                                   transition-colors hover:bg-surface-50 cursor-pointer"
                            (click)="ouvrir(action)">
                        <span class="flex items-center justify-center w-10 h-10 rounded-lg
                                     bg-primary-50 text-primary shrink-0">
                            <i [class]="action.icone"></i>
                        </span>
                        <span class="min-w-0">
                            <span class="block font-semibold">{{ action.libelle }}</span>
                            <span class="block text-xs text-surface-500 mt-0.5">{{ action.aide }}</span>
                        </span>
                    </button>
                }
            </div>
        }
    `
})
export class ActionsRapidesComponent implements OnInit {

    /**
     * Toutes les actions envisageables, dans l'ordre où elles se présentent.
     *
     * <p>Les permissions et le module reprennent, une à une, celles que le garde de route exige pour
     * l'écran visé : les deux listes doivent rester identiques, sans quoi la tuile promet ce que la
     * route refusera.</p>
     */
    private static readonly CATALOGUE: ActionRapide[] = [
        {
            libelle: 'Déclarer une non-conformité',
            aide: 'Signaler un écart constaté : il partira dans le circuit de traitement.',
            icone: 'pi pi-exclamation-triangle',
            route: '/non-conformite/create',
            permissions: ['nc-write', 'SUBMIT_NC'],
            module: ModuleAbonnement.NON_CONFORMITE
        },
        {
            libelle: 'Déposer un document',
            aide: 'Soumettre une procédure ou un enregistrement à son circuit de validation.',
            icone: 'pi pi-file-plus',
            route: '/gestion-documentaire/create',
            permissions: ['document-write'],
            module: ModuleAbonnement.DOCUMENTAIRE
        },
        {
            libelle: 'Demander une modification',
            aide: 'Faire réviser ou retirer un document que vous ne modifiez pas vous-même.',
            icone: 'pi pi-pencil',
            route: '/gestion-documentaire/demandes/nouvelle',
            permissions: ['document-read', 'document-write', 'DOC_READ'],
            module: ModuleAbonnement.DOCUMENTAIRE
        },
        {
            libelle: 'Consulter la documentation',
            aide: 'Rechercher une procédure en vigueur et sa version applicable.',
            icone: 'pi pi-folder-open',
            route: '/gestion-documentaire/documents',
            permissions: ['document-read', 'document-write', 'DOC_READ'],
            module: ModuleAbonnement.DOCUMENTAIRE
        },
        {
            libelle: 'Mes actions à mener',
            aide: 'Les actions correctives dont vous avez la charge, et leur échéance.',
            icone: 'pi pi-check-square',
            route: '/non-conformite/actions',
            permissions: ['plan-action-read', 'plan-action-write', 'TRAITEMENT_PLAN'],
            module: ModuleAbonnement.NON_CONFORMITE
        },
        {
            libelle: 'Suivi des non-conformités',
            aide: 'Où en est chaque écart déclaré, toutes étapes confondues.',
            icone: 'pi pi-chart-line',
            route: '/non-conformite/suivi',
            permissions: ['nc-read', 'NC_READ', 'CONSULTATION_NC'],
            module: ModuleAbonnement.NON_CONFORMITE
        }
    ];

    private readonly router = inject(Router);

    actions: ActionRapide[] = [];

    ngOnInit(): void {
        this.actions = ActionsRapidesComponent.CATALOGUE
            .filter((action) => accesAutorise(action.permissions, action.module));
    }

    ouvrir(action: ActionRapide): void {
        this.router.navigate([action.route]);
    }
}
