import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { AppMenuitem } from './app.menuitem';
import { AuthService } from '../../services/auth-services/auth.service';
import { isUserInRoles, hasAnyPermission, isLicenseActive, isModuleSubscribed } from '../../utils';
import { app_roles } from '../../app-roles-utils';

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
constructor(private  authService: AuthService) {

}
    ngOnInit() {
        this.model = [
            {
                label: 'Accueil',
                items: [{ label: 'Tableau de bord', icon: 'pi pi-fw pi-home', routerLink: ['/'] }]
            },

            {
                label: 'Qualité & Conformité',
                icon: 'pi pi-fw pi-briefcase',
                routerLink: ['/page'],
                items: [
                    { label: 'Audite', icon: 'pi pi-fw pi-eye', visible: isLicenseActive() && isModuleSubscribed('AUTRE_MODULE') && hasAnyPermission(['AUDITE_READ']), routerLink: ['/page/audite'] },
                    { label: 'Non conformité', icon: 'pi pi-fw pi-times', visible: isLicenseActive() && isModuleSubscribed('NON_CONFORMITE') && hasAnyPermission(['SUBMIT_NC']), routerLink: ['/nc'] },
                    { label: 'Réglementation', visible: isLicenseActive() && isModuleSubscribed('AUTRE_MODULE') && hasAnyPermission(['REGLEMENTATION_READ']), icon: 'pi pi-fw pi-file-edit', routerLink: ['/page/reglementation'] },
                    { label: "Critères d'évaluation", visible: isLicenseActive() && isModuleSubscribed('AUTRE_MODULE') && hasAnyPermission(['CRITERE_EVAL_READ']), icon: 'pi pi-fw pi-file', routerLink: ['/page/critere-evaluation'] }
                ]
            },
            {
                label: 'Gestion Documentaire',
                visible: isLicenseActive() && isModuleSubscribed('DOCUMENT') && hasAnyPermission(['DOC_READ']),
                icon: 'pi pi-fw pi-briefcase',
                routerLink: ['/page'],
                items: [
                    { label: 'Catégorie de fichiers', icon: 'pi pi-fw pi-users', routerLink: ['/pages/'] },
                    { label: 'Exigence', icon: 'pi pi-fw pi-user-plus', routerLink: ['/pages/'] }
                ]
            },
            {
                label: 'TRAITEMENTS DES DEMANDES',
                icon: 'pi pi-fw pi-envelope',
                visible: isLicenseActive() && isModuleSubscribed('NON_CONFORMITE'),
                routerLink: ['/page'],
                items: [
                    {
                        label: 'Non-conformité',
                        icon: 'pi pi-fw pi-envelope',
                        visible: isModuleSubscribed('NON_CONFORMITE') && hasAnyPermission(['TRAITEMENT_NC']),
                        items: [
                            {
                                label: 'Analyse initiale du pilote ',
                                icon: 'pi pi-fw pi-user-plus',
                                routerLink: ['/page/reception'],
                                visible: hasAnyPermission(['RECEPTION_NC'])
                            },

                            {
                                label: 'Validation par  RQ ',
                                icon: 'pi pi-fw pi-check',
                                routerLink: ['/page/validation_rs'],
                                visible: hasAnyPermission(['VALIDATION_RQ'])
                            },

                            {
                                label: 'Affectation des responsables ',
                                icon: 'pi pi-fw pi-arrow-up-right',
                                routerLink: ['/page/imputation'],
                                visible: hasAnyPermission(['IMPUTATION_NC'])
                            },
                            {
                                label: 'Proposition d’actions correctives',
                                icon: 'pi pi-fw pi-cog',
                                routerLink: ['/page/traitement'],
                                visible: hasAnyPermission(['TRAITEMENT_NC'])
                            },
                            {
                                label: 'Validation des actions',
                                icon: 'pi pi-fw pi-check',
                                routerLink: ['/page/validation'],
                                visible: isUserInRoles(['VALIDATION_CHEF'])
                            },
                            {
                                label: 'Suivi par RQ',
                                icon: 'pi pi-fw pi-bullseye',
                                routerLink: ['/page/cloture'],
                                visible: hasAnyPermission(['RQ_NC'])
                            },
                            {
                                label: 'Suivi des non-conformités',
                                icon: 'pi pi-fw pi-eye',
                                routerLink: ['/page/consultation'],
                                visible: hasAnyPermission(['CONSULTATION_NC'])
                            }
                        ]
                    },
                    {
                        label: "Traitement des plans d'actions",
                        icon: 'pi pi-fw pi-cog',
                        visible: hasAnyPermission(['TRAITEMENT_PLAN']) && isModuleSubscribed('NON_CONFORMITE'),
                        routerLink: ['/traitement-action']
                    }
                ]
            },
            {
                label: 'Gestion des Ressources',
                icon: 'pi pi-fw pi-briefcase',
                visible: isLicenseActive() && isModuleSubscribed('AUTRE_MODULE') && hasAnyPermission(['RESOURCES_READ']),
                routerLink: ['/page'],
                items: [
                    { label: 'Formation', icon: 'pi pi-fw pi-book', routerLink: ['/page/formation'] },
                    { label: 'Fournisseur', icon: 'pi pi-fw pi-users', routerLink: ['/page/fournisseur'] },
                    { label: 'Prestataire', icon: 'pi pi-fw pi-user-plus', routerLink: ['/page/prestataire'] },
                    { label: 'Produit', icon: 'pi pi-fw pi-box', routerLink: ['/page/produit'] }
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
                routerLink: ['/page'],
                items: [
                    { label: 'Action corrective et préventive', icon: 'pi pi-fw pi-list-check', routerLink: ['/page/action-corrective-preventive'] },
                    { label: 'Réclamation', visible: isModuleSubscribed('RECLAMATION'), icon: 'pi pi-fw pi-exclamation-triangle', routerLink: ['/page/reclamation'] },
                    { label: 'Risque', visible: isModuleSubscribed('RISQUE'), icon: 'pi pi-fw pi-ban', routerLink: ['/page/risque'] }
                ]
            },
            {
                label: 'Configurations',
                icon: 'pi pi-fw pi-briefcase',
                visible: isLicenseActive() && hasAnyPermission(['CONFIG_READ']),
                routerLink: ['/page'],
                items: [
                    { label: 'Services (Processus)', visible: isLicenseActive() && hasAnyPermission(['SERVICE_MANAGE']), icon: 'pi pi-building', routerLink: ['/page/service'] },
                    { label: 'Type  processus', visible: isLicenseActive() && hasAnyPermission(['TYPE_PROC_MANAGE']), icon: 'pi pi-fw pi-cog', routerLink: ['/page/type-processus'] },
                    { label: 'Config global', visible: isLicenseActive() && hasAnyPermission(['CONFIG_GLOBAL_MANAGE']), icon: 'pi pi-cog', routerLink: ['/page/config-global'] }
                ]
            },
            {
                label: 'Paramétrage Non-Conformité',
                icon: 'pi pi-fw pi-cog',
                visible: isLicenseActive() && isModuleSubscribed('NON_CONFORMITE') && hasAnyPermission(['CONFIG_READ']),
                items: [
                    { label: 'Origine non-conformité', visible: isLicenseActive() && hasAnyPermission(['NC_ORIGIN_MANAGE']), icon: 'pi pi-fw pi-cog', routerLink: ['/page/type-nc'] },
                    { label: 'Niveau  non-conformité', visible: isLicenseActive() && hasAnyPermission(['NC_LEVEL_MANAGE']), icon: 'pi pi-fw pi-cog', routerLink: ['/page/niveau-nc'] },
                    { label: 'Type action entreprise', visible: isLicenseActive() && hasAnyPermission(['ACTION_TYPE_MANAGE']), icon: 'pi pi-fw pi-cog', routerLink: ['/page/type-action'] }
                ]
            },
            {
                label: 'Gestion des utilisateurs',
                icon: 'pi pi-fw pi-users',
                visible: isLicenseActive() && hasAnyPermission(['MANAGE_USER']),
                routerLink: ['/page'],
                items: [
                    { label: 'Comptes utilisateurs', icon: 'pi pi-fw pi-users', routerLink: ['/page/users'] },
                    { label: 'Gestion des Rôles', icon: 'pi pi-fw pi-lock', routerLink: ['/page/roles'] }
                ]
            }
        ];
    }
}
