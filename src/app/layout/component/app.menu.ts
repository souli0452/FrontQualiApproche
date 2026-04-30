import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { AppMenuitem } from './app.menuitem';
import { AuthService } from '../../services/auth-services/auth.service';
import { isUserInRoles } from '../../utils';
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
                label: 'Configurations',
                icon: 'pi pi-fw pi-briefcase',
                visible:  isUserInRoles(['SUPER_ADMIN']),
                routerLink: ['/page'],
                items: [
                    {label: 'Directions (Processus)', icon: 'pi pi-building', routerLink: ['/page/direction']},
                    {label: 'Services (Processus)', icon: 'pi pi-building', routerLink: ['/page/service']},
                    {label: 'Origine non-conformité', icon: 'pi pi-fw pi-cog', routerLink: ['/page/type-nc']},
                    {label: 'Niveau  non-conformité', icon: 'pi pi-fw pi-cog', routerLink: ['/page/niveau-nc']},
                    {label: 'Type  processus', icon: 'pi pi-fw pi-cog', routerLink: ['/page/type-processus']},
                    {label: 'Type action entreprise', icon: 'pi pi-fw pi-cog', routerLink: ['/page/type-action']},
                    {label: 'Config global', icon: 'pi pi-cog', routerLink: ['/page/config-global']},
                ]
            },
            {
                label: 'Gestion des Ressources',
                icon: 'pi pi-fw pi-briefcase',
                visible:  isUserInRoles(['SUPER_ADMIN']),
                routerLink: ['/page'],
                items: [
                    { label: 'Formation', icon: 'pi pi-fw pi-book', routerLink: ['/page/formation'] },
                    { label: 'Fournisseur', icon: 'pi pi-fw pi-users', routerLink: ['/page/fournisseur'] },
                    { label: 'Prestataire', icon: 'pi pi-fw pi-user-plus', routerLink: ['/page/prestataire'] },
                    { label: 'Produit', icon: 'pi pi-fw pi-box', routerLink: ['/page/produit'] },
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
                visible:  isUserInRoles(['SUPER_ADMIN']),
                routerLink: ['/page'],
                items: [
                    { label: 'Action corrective et préventive', icon: 'pi pi-fw pi-list-check', routerLink: ['/page/action-corrective-preventive'] },
                    { label: 'Réclamation', icon: 'pi pi-fw pi-exclamation-triangle', routerLink: ['/page/reclamation'] },
                    { label: 'Risque', icon: 'pi pi-fw pi-ban', routerLink: ['/page/risque'] },
                ]
            },
            {
                label: 'Qualité & Conformité',
                icon: 'pi pi-fw pi-briefcase',
                routerLink: ['/page'],
                items: [
                    { label: 'Audite', icon: 'pi pi-fw pi-eye',
                        visible:  isUserInRoles(['SUPER_ADMIN']),
                        routerLink: ['/page/audite'] },
                    { label: 'Non conformité', icon: 'pi pi-fw pi-times',
                        visible:  isUserInRoles(['SUBMIT_NC','SUPER_ADMIN']),
                        routerLink: ['/nc'] },
                    { label: 'Réglementation',
                        visible:  isUserInRoles(['SUPER_ADMIN']),
                        icon: 'pi pi-fw pi-file-edit', routerLink: ['/page/reglementation'] },
                    { label: "Critères d'évaluation",
                        visible:  isUserInRoles(['SUPER_ADMIN']),
                        icon: 'pi pi-fw pi-file', routerLink: ['/page/critere-evaluation'] },
                ]
            },
            {
                label: 'Gestion Documentaire',
                visible:  isUserInRoles(['SUPER_ADMIN']),
                icon: 'pi pi-fw pi-briefcase',
                routerLink: ['/page'],
                items: [
                    { label: 'Catégorie de fichiers', icon: 'pi pi-fw pi-users', routerLink: ['/pages/'] },
                    { label: 'Exigence', icon: 'pi pi-fw pi-user-plus', routerLink: ['/pages/'] },
                ]
            },
            {
                label: 'TRAITEMENTS DES DEMANDES',
                icon: 'pi pi-fw pi-envelope',
                visible:  isUserInRoles(app_roles.NC),
                routerLink: ['/page'],
                items: [
                    { label: 'Non-conformité', icon: 'pi pi-fw pi-envelope',
                        visible:  isUserInRoles(app_roles.NC),
                     items: [
                         {
                             label:"Réception par le pilote du processus ",
                             icon: 'pi pi-fw pi-user-plus',
                             routerLink: ['/page/reception'],
                             visible:  isUserInRoles(['RECEPTION_NC','SUPER_ADMIN'])
                         },

                         {
                             label:"Validation par  RQ ",
                             icon: 'pi pi-fw pi-check',
                             routerLink: ['/page/validation_rs'],
                             visible:  isUserInRoles(['VALIDATION_RQ','SUPER_ADMIN'])
                         },

                         {
                             label:"Imputations ",
                             icon: 'pi pi-fw pi-arrow-up-right',
                             routerLink: ['/page/imputation'],
                             visible:  isUserInRoles(['IMPUTATION_NC','SUPER_ADMIN'])
                         },
                         {
                             label:"Traitements",
                             icon: 'pi pi-fw pi-cog',
                             routerLink: ['/page/traitement'],
                             visible:  isUserInRoles(['TRAITEMENT_NC','SUPER_ADMIN'])
                         },
                         {
                             label:"Validations par le pilote du processus",
                             icon: 'pi pi-fw pi-check',
                             routerLink: ['/page/validation'],
                             visible:  isUserInRoles(['VALIDATION_CHEF','SUPER_ADMIN'])
                         },
                         {
                             label:"Suivi par RQ",
                             icon: 'pi pi-fw pi-bullseye',
                             routerLink: ['/page/cloture'],
                             visible:  isUserInRoles(['RQ_NC','SUPER_ADMIN'])
                         },
                         {
                             label:"Consultations",
                             icon: 'pi pi-fw pi-eye',
                             routerLink: ['/page/consultation'],

                         }
                     ]
                    },
                    {
                        label: "Traitement des plans d'actions",
                        icon: 'pi pi-fw pi-cog',
                        visible:  isUserInRoles(['TRAITEMENT_PLAN']),
                        routerLink: ['/traitement-action'],
                    },
                ]
            },
            {
                label: 'Gestion des utilisateurs',
                icon: 'pi pi-fw pi-users',
                visible:  isUserInRoles(['SUPER_ADMIN']),
                routerLink: ['/page'],
                items: [
                    { label: 'Comptes utilisateurs', icon: 'pi pi-fw pi-users', routerLink: ['/page/users'] },

                ]
            },

        ];
    }
}
