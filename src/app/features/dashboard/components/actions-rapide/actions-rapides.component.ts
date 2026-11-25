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
    ton: 'amber' | 'sky' | 'violet' | 'emerald' | 'blue' | 'slate';
    /** Une seule de ces permissions suffit. */
    permissions: string[];
    /** Module dont l'organisation doit avoir souscrit, si l'action en relève. */
    module?: string;
}

/**
 * Ce que l'utilisateur peut entreprendre depuis l'accueil.
 */
@Component({
    selector: 'app-actions-rapides',
    standalone: true,
    imports: [CommonModule],
    templateUrl: 'actions-rapides.component.html'
})
export class ActionsRapidesComponent implements OnInit {

    /**
     * Toutes les actions envisageables, dans l'ordre où elles se présentent.
     */
    private static readonly CATALOGUE: ActionRapide[] = [
        {
            libelle: 'Déclarer une non-conformité',
            aide: 'Signaler un écart constaté dans le circuit de traitement.',
            icone: 'pi pi-exclamation-triangle',
            route: '/non-conformite/create',
            ton: 'amber',
            permissions: ['nc-write', 'SUBMIT_NC'],
            module: ModuleAbonnement.NON_CONFORMITE
        },
        {
            libelle: 'Déposer un document',
            aide: 'Soumettre une procédure à son circuit de validation.',
            icone: 'pi pi-file-plus',
            route: '/gestion-documentaire/create',
            ton: 'sky',
            permissions: ['document-write'],
            module: ModuleAbonnement.DOCUMENTAIRE
        },
        {
            libelle: 'Demander une modification',
            aide: 'Faire réviser ou retirer un document en vigueur.',
            icone: 'pi pi-pencil',
            route: '/gestion-documentaire/demandes/nouvelle',
            ton: 'violet',
            permissions: ['document-read', 'document-write', 'DOC_READ'],
            module: ModuleAbonnement.DOCUMENTAIRE
        },
        {
            libelle: 'Consulter la documentation',
            aide: 'Rechercher une procédure en vigueur et sa version applicable.',
            icone: 'pi pi-folder-open',
            route: '/gestion-documentaire/documents',
            ton: 'emerald',
            permissions: ['document-read', 'document-write', 'DOC_READ'],
            module: ModuleAbonnement.DOCUMENTAIRE
        },
        {
            libelle: 'Mes actions à mener',
            aide: 'Les actions correctives dont vous avez la charge, et leur échéance.',
            icone: 'pi pi-check-square',
            route: '/non-conformite/actions',
            ton: 'blue',
            permissions: ['plan-action-read', 'plan-action-write', 'TRAITEMENT_PLAN'],
            module: ModuleAbonnement.NON_CONFORMITE
        },
        {
            libelle: 'Suivi des non-conformités',
            aide: 'Où en est chaque écart déclaré, toutes étapes confondues.',
            icone: 'pi pi-chart-line',
            route: '/non-conformite/suivi',
            ton: 'slate',
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

    tonClasse(ton: ActionRapide['ton']): string {
        switch (ton) {
            case 'amber':
                return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25';
            case 'sky':
            case 'blue':
                return 'bg-[#0ea5e9]/10 text-[#0084ca] dark:text-sky-400 border-[#0ea5e9]/30';
            case 'violet':
                return 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/25';
            case 'emerald':
                return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25';
            default:
                return 'bg-surface-100 dark:bg-surface-800 text-[var(--heading-color)] border-[#dddddd] dark:border-surface-700';
        }
    }

    ouvrir(action: ActionRapide): void {
        this.router.navigate([action.route]);
    }
}
