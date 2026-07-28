import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { AppMenuitem } from './app.menuitem';
import { AuthService } from '../../services/auth-services/auth.service';
import { ChangeDetectorRef } from '@angular/core';
import { ProcNonConformiteService } from '../../services/non-conformite/proc-non-conformite.service';
import { NonConformiteService } from '../../services/non-conformite/non-conformite.service';
import { hasAnyPermission, isLicenseActive, isModuleSubscribed } from '../../utils/auth/auth-utils';

@Component({
    selector: 'app-menu',
    standalone: true,
    imports: [CommonModule, AppMenuitem, RouterModule],
    template: `
    <div class="layout-menu-logo">
        <a routerLink="/">
            <img src="assets/logo-quali-sira.svg" alt="logo">
            <div class="logo-text">
                <span class="app-name">QualiSira</span>
                <span class="app-subtitle">Gestion Intégrée de la Qualité</span>
            </div>
        </a>
    </div>
    <ul class="layout-menu">
        <ng-container *ngFor="let item of model; let i = index">
            <li app-menuitem *ngIf="!item.separator" [item]="item" [index]="i" [root]="true"></li>
            <li *ngIf="item.separator" class="menu-separator"></li>
        </ng-container>
    </ul> `
})
export class AppMenu {
    model: MenuItem[] = [];
    roles:any[]=[];
    constructor(
        private readonly nonConformiteService: NonConformiteService,
        private authService: AuthService,
        private cdr: ChangeDetectorRef
    ) {}


    ngOnInit() {
        this.model = [
            {
                label: 'Accueil',
                items: [{ label: 'Tableau de bord', icon: 'pi pi-fw pi-home', routerLink: ['/'] }]
            },
            {
                label: 'Gestion documentaire',
                icon: 'pi pi-fw pi-briefcase',
                routerLink: ['/'],
                items:[
                    {
                        label: 'Gestion documentaire',
                        icon: 'pi pi-fw pi-briefcase',
                        routerLink: ['/gestion-documentaire'],
                    },
                ]
            },
            {
                label: 'Qualité & Conformité',
                icon: 'pi pi-fw pi-briefcase',
                routerLink: ['/'],
                items: [
                    { label: 'Audite', icon: 'pi pi-fw pi-eye', visible: isLicenseActive() && isModuleSubscribed('AUTRE_MODULE') && hasAnyPermission(['AUDITE_READ']), routerLink: ['/audite'] },
                    { label: 'Non-Conformités', icon: 'pi pi-fw pi-briefcase', visible: isLicenseActive() && isModuleSubscribed('NON_CONFORMITE') && hasAnyPermission(['SUBMIT_NC']), routerLink: ['/non-conformite'] },
                    // =={ label: 'Non conformité', icon: 'pi pi-fw pi-times', visible: isLicenseActive() && isModuleSubscribed('NON_CONFORMITE') && hasAnyPermission(['SUBMIT_NC']), routerLink: ['/nc'] },
                    { label: 'Réglementation', visible: isLicenseActive() && isModuleSubscribed('AUTRE_MODULE') && hasAnyPermission(['REGLEMENTATION_READ']), icon: 'pi pi-fw pi-file-edit', routerLink: ['/reglementation'] },
                    { label: "Critères d'évaluation", visible: isLicenseActive() && isModuleSubscribed('AUTRE_MODULE') && hasAnyPermission(['CRITERE_EVAL_READ']), icon: 'pi pi-fw pi-file', routerLink: ['/critere-evaluation'] }
                ]
            },
            // {
            //     label: 'TRAITEMENTS DES DEMANDES',
            //     icon: 'pi pi-fw pi-envelope',
            //     visible: isLicenseActive() && isModuleSubscribed('NON_CONFORMITE'),
            //     routerLink: ['/'],
            //     items: [
            //         {
            //             label: 'Non-conformité',
            //             icon: 'pi pi-fw pi-envelope',
            //             visible: isModuleSubscribed('NON_CONFORMITE') && hasAnyPermission(['TRAITEMENT_NC']),
            //             items: [
            //                 {
            //                     label: 'Analyse initiale du pilote ',
            //                     icon: 'pi pi-fw pi-user-plus',
            //                     routerLink: ['/reception'],
            //                     visible: hasAnyPermission(['RECEPTION_NC'])
            //                 },

            //                 {
            //                     label: 'Validation par  RQ ',
            //                     icon: 'pi pi-fw pi-check',
            //                     routerLink: ['/validation_rs'],
            //                     visible: hasAnyPermission(['VALIDATION_RQ'])
            //                 },

            //                 {
            //                     label: 'Affectation des responsables ',
            //                     icon: 'pi pi-fw pi-arrow-up-right',
            //                     routerLink: ['/imputation'],
            //                     visible: hasAnyPermission(['IMPUTATION_NC'])
            //                 },
            //                 {
            //                     label: 'Proposition d’actions correctives',
            //                     icon: 'pi pi-fw pi-cog',
            //                     routerLink: ['/traitement'],
            //                     visible: hasAnyPermission(['TRAITEMENT_NC'])
            //                 },
            //                 {
            //                     label: 'Validation des actions',
            //                     icon: 'pi pi-fw pi-check',
            //                     routerLink: ['/validation'],
            //                     visible: isUserInRoles(['VALIDATION_CHEF'])
            //                 },
            //                 {
            //                     label: 'Suivi par RQ',
            //                     icon: 'pi pi-fw pi-bullseye',
            //                     routerLink: ['/cloture'],
            //                     visible: hasAnyPermission(['RQ_NC'])
            //                 },
            //                 {
            //                     label: 'Suivi des non-conformités',
            //                     icon: 'pi pi-fw pi-eye',
            //                     routerLink: ['/consultation'],
            //                     visible: hasAnyPermission(['CONSULTATION_NC'])
            //                 }
            //             ]
            //         },
            //         {
            //             label: "Traitement des plans d'actions",
            //             icon: 'pi pi-fw pi-cog',
            //             visible: hasAnyPermission(['TRAITEMENT_PLAN']) && isModuleSubscribed('NON_CONFORMITE'),
            //             routerLink: ['/traitement-action']
            //         }
            //     ]
            // },
            {
                label: 'Gestion des Ressources',
                icon: 'pi pi-fw pi-briefcase',
                visible: isLicenseActive() && isModuleSubscribed('AUTRE_MODULE') && hasAnyPermission(['RESOURCES_READ']),
                routerLink: ['/'],
                items: [
                    { label: 'Formation', icon: 'pi pi-fw pi-book', routerLink: ['/formation'] },
                    { label: 'Fournisseur', icon: 'pi pi-fw pi-users', routerLink: ['/fournisseur'] },
                    { label: 'Prestataire', icon: 'pi pi-fw pi-user-plus', routerLink: ['/prestataire'] },
                    { label: 'Produit', icon: 'pi pi-fw pi-box', routerLink: ['/produit'] }
                    // {
                    //     label: 'Crud',
                    //     icon: 'pi pi-fw pi-pencil',
                    //     routerLink: ['/pages/crud']
                    // },
                    // {
                    //     label: 'Not Found',
                    //     icon: 'pi pi-fw pi-exclamation-circle',
                    //     routerLink: ['/pages/notfound']
                    // },
                    // {
                    //     label: 'Empty',
                    //     icon: 'pi pi-fw pi-circle-off',
                    //     routerLink: ['/pages/empty']
                    // }
                ]
            },
            {
                label: 'Gestion des Actions',
                icon: 'pi pi-fw pi-briefcase',
                visible: isLicenseActive() && isModuleSubscribed('AUTRE_MODULE') && hasAnyPermission(['ACTIONS_READ']),
                routerLink: ['/'],
                items: [
                    { label: 'Action corrective et préventive', icon: 'pi pi-fw pi-list-check', routerLink: ['/action-corrective-preventive'] },
                    { label: 'Réclamation', visible: isModuleSubscribed('RECLAMATION'), icon: 'pi pi-fw pi-exclamation-triangle', routerLink: ['/reclamation'] },
                    { label: 'Risque', visible: isModuleSubscribed('RISQUE'), icon: 'pi pi-fw pi-ban', routerLink: ['/risque'] }
                ]
            },
            // {
            //     label: 'Configurations',
            //     icon: 'pi pi-fw pi-briefcase',
            //     visible: isLicenseActive() && hasAnyPermission(['CONFIG_READ']),
            //     routerLink: ['/'],
            //     items: [
            //         { label: 'Services (Processus)', visible: isLicenseActive() && hasAnyPermission(['SERVICE_MANAGE']), icon: 'pi pi-building', routerLink: ['/service'] },
            //         { label: 'Type  processus', visible: isLicenseActive() && hasAnyPermission(['TYPE_PROC_MANAGE']), icon: 'pi pi-fw pi-cog', routerLink: ['/type-processus'] },
            //         // { label: 'Config global', visible: isLicenseActive() && hasAnyPermission(['CONFIG_GLOBAL_MANAGE']), icon: 'pi pi-cog', routerLink: ['/page/config-global'] }
            //     ]
            // },
            // {
            //     label: 'Paramétrage Non-Conformité',
            //     icon: 'pi pi-fw pi-cog',
            //     visible: isLicenseActive() && isModuleSubscribed('NON_CONFORMITE') && hasAnyPermission(['CONFIG_READ']),
            //     items: [
            //         { label: 'Origine non-conformité', visible: isLicenseActive() && hasAnyPermission(['NC_ORIGIN_MANAGE']), icon: 'pi pi-fw pi-cog', routerLink: ['/type-nc'] },
            //         // { label: 'Niveau  non-conformité', visible: isLicenseActive() && hasAnyPermission(['NC_LEVEL_MANAGE']), icon: 'pi pi-fw pi-cog', routerLink: ['/page/niveau-nc'] },
            //         { label: 'Type action entreprise', visible: isLicenseActive() && hasAnyPermission(['ACTION_TYPE_MANAGE']), icon: 'pi pi-fw pi-cog', routerLink: ['/type-action'] }
            //     ]
            {
                label: 'Configurations',
                icon: 'pi pi-sliders-h',
                visible: true,
                items: [
                    { label: 'Configurations Globales', icon: 'pi pi-sliders-h', routerLink: ['/configurations'], visible: true },
                    { label: 'Paramétrage Document', icon: 'pi pi-fw pi-file-edit', routerLink: ['/parametrage-document'] }
                ]
            }
        ];
            // On écoute les changements du badge !
    this.nonConformiteService.notificationsNC$.subscribe((notifs: any) => {
            const total = notifs.total;
            // On trouve l'élément "Non-conformité" dans l'arbre du menu
            // On trouve la rubrique "Qualité & Conformité"
            const menuQualite = this.model.find(m => m.label === 'Qualité & Conformité');
            if (menuQualite && menuQualite.items) {
                // On trouve le sous-menu "Non-Conformités" (celui qui a la valise)
                const menuNC = menuQualite.items.find(i => i.label === 'Non-Conformités');

                if (menuNC) {
                    // PrimeNG permet d'ajouter un 'badge' sur n'importe quel MenuItem
                    // On met le total (en string), ou rien s'il est à zéro
                    menuNC.badge = total > 0 ? total.toString() : undefined;

                    // Optionnel : ajouter une classe CSS pour le rendre rouge par exemple
                    menuNC.badgeStyleClass = 'bg-red-500 text-white font-bold';

                    // On force Angular à rafraîchir le composant
                    this.cdr.detectChanges();
                }
            }
        });
    }

}
