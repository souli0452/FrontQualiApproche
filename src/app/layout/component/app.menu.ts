import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { AppMenuitem } from './app.menuitem';

@Component({
    selector: 'app-menu',
    standalone: true,
    imports: [CommonModule, AppMenuitem, RouterModule],
    template: `<ul class="layout-menu">
        <ng-container *ngFor="let item of model; let i = index">
            <li app-menuitem *ngIf="!item.separator" [item]="item" [index]="i" [root]="true"></li>
            <li *ngIf="item.separator" class="menu-separator"></li>
        </ng-container>
    </ul> `
})
export class AppMenu {
    model: MenuItem[] = [];

    ngOnInit() {
        this.model = [
            {
                label: 'Accueil',
                items: [{ label: 'Dashboard', icon: 'pi pi-fw pi-home', routerLink: ['/'] }]
            },
            // {
            //     label: 'UI Components',
            //     items: [
            //         { label: 'Form Layout', icon: 'pi pi-fw pi-id-card', routerLink: ['/uikit/formlayout'] },
            //         { label: 'Input', icon: 'pi pi-fw pi-check-square', routerLink: ['/uikit/input'] },
            //         { label: 'Button', icon: 'pi pi-fw pi-mobile', class: 'rotated-icon', routerLink: ['/uikit/button'] },
            //         { label: 'Table', icon: 'pi pi-fw pi-table', routerLink: ['/uikit/table'] },
            //         { label: 'List', icon: 'pi pi-fw pi-list', routerLink: ['/uikit/list'] },
            //         { label: 'Tree', icon: 'pi pi-fw pi-share-alt', routerLink: ['/uikit/tree'] },
            //         { label: 'Panel', icon: 'pi pi-fw pi-tablet', routerLink: ['/uikit/panel'] },
            //         { label: 'Overlay', icon: 'pi pi-fw pi-clone', routerLink: ['/uikit/overlay'] },
            //         { label: 'Media', icon: 'pi pi-fw pi-image', routerLink: ['/uikit/media'] },
            //         { label: 'Menu', icon: 'pi pi-fw pi-bars', routerLink: ['/uikit/menu'] },
            //         { label: 'Message', icon: 'pi pi-fw pi-comment', routerLink: ['/uikit/message'] },
            //         { label: 'File', icon: 'pi pi-fw pi-file', routerLink: ['/uikit/file'] },
            //         { label: 'Chart', icon: 'pi pi-fw pi-chart-bar', routerLink: ['/uikit/charts'] },
            //         { label: 'Timeline', icon: 'pi pi-fw pi-calendar', routerLink: ['/uikit/timeline'] },
            //         { label: 'Misc', icon: 'pi pi-fw pi-circle', routerLink: ['/uikit/misc'] }
            //     ]
            // },
            {
                label: 'Gestion des Ressources',
                icon: 'pi pi-fw pi-briefcase',
                routerLink: ['/page'],
                items: [
                    {label: 'Directions', icon: 'pi pi-building', routerLink: ['/page/direction']},
                    {label: 'Services', icon: 'pi pi-building', routerLink: ['/page/service']},
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
                    { label: 'Audite', icon: 'pi pi-fw pi-eye', routerLink: ['/page/audite'] },
                    { label: 'Non conformité', icon: 'pi pi-fw pi-times', routerLink: ['/page/non-conformite'] },
                    { label: 'Procédure de non conformité', icon: 'pi pi-fw pi-book', routerLink: ['/page/procedure-non-conformite'] },
                    { label: 'Réglementation', icon: 'pi pi-fw pi-file-edit', routerLink: ['/page/reglementation'] },
                    { label: "Critères d'évaluation", icon: 'pi pi-fw pi-file', routerLink: ['/page/critere-evaluation'] },
                ]
            },
            {
                label: 'Gestion Documentaire',
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
                routerLink: ['/page'],
                items: [
                    { label: 'Non-conformité', icon: 'pi pi-fw pi-envelope',
                     items: [
                         {
                             label:"Réceptions chef de service",
                             icon: 'pi pi-fw pi-user-plus',
                             routerLink: ['/page/reception']
                         },
                         {
                             label:"Validations par le RS",
                             icon: 'pi pi-fw pi-check',
                             routerLink: ['/page/validation_rs']
                         },

                         {
                             label:"Imputations ",
                             icon: 'pi pi-fw pi-check',
                             routerLink: ['/page/imputation']
                         },
                         {
                             label:"Traitements",
                             icon: 'pi pi-fw pi-pencil',
                             routerLink: ['/page/traitement']
                         },
                         {
                             label:"Validations chef de service",
                             icon: 'pi pi-fw pi-check',
                             routerLink: ['/page/validation']
                         },
                         {
                             label:"Suivi par RQ",
                             icon: 'pi pi-fw pi-pencil',
                             routerLink: ['/page/cloture']
                         },
                         {
                             label:"Consultations",
                             icon: 'pi pi-fw pi-eye',
                             routerLink: ['/page/consultation']
                         }
                     ]
                    },

                ]
            },
            {
                label: 'Gestion des utilisateurs',
                icon: 'pi pi-fw pi-users',
                routerLink: ['/page'],
                items: [
                    { label: 'Comptes utilisateurs', icon: 'pi pi-fw pi-users', routerLink: ['/page/users'] },

                ]
            },
            // {
            //     label: 'Hierarchy',
            //     items: [
            //         {
            //             label: 'Submenu 1',
            //             icon: 'pi pi-fw pi-bookmark',
            //             items: [
            //                 {
            //                     label: 'Submenu 1.1',
            //                     icon: 'pi pi-fw pi-bookmark',
            //                     items: [
            //                         { label: 'Submenu 1.1.1', icon: 'pi pi-fw pi-bookmark' },
            //                         { label: 'Submenu 1.1.2', icon: 'pi pi-fw pi-bookmark' },
            //                         { label: 'Submenu 1.1.3', icon: 'pi pi-fw pi-bookmark' }
            //                     ]
            //                 },
            //                 {
            //                     label: 'Submenu 1.2',
            //                     icon: 'pi pi-fw pi-bookmark',
            //                     items: [{ label: 'Submenu 1.2.1', icon: 'pi pi-fw pi-bookmark' }]
            //                 }
            //             ]
            //         },
            //         {
            //             label: 'Submenu 2',
            //             icon: 'pi pi-fw pi-bookmark',
            //             items: [
            //                 {
            //                     label: 'Submenu 2.1',
            //                     icon: 'pi pi-fw pi-bookmark',
            //                     items: [
            //                         { label: 'Submenu 2.1.1', icon: 'pi pi-fw pi-bookmark' },
            //                         { label: 'Submenu 2.1.2', icon: 'pi pi-fw pi-bookmark' }
            //                     ]
            //                 },
            //                 {
            //                     label: 'Submenu 2.2',
            //                     icon: 'pi pi-fw pi-bookmark',
            //                     items: [{ label: 'Submenu 2.2.1', icon: 'pi pi-fw pi-bookmark' }]
            //                 }
            //             ]
            //         }
            //     ]
            // },
            // {
            //     label: 'Get Started',
            //     items: [
            //         {
            //             label: 'Documentation',
            //             icon: 'pi pi-fw pi-book',
            //             routerLink: ['/documentation']
            //         },
            //         {
            //             label: 'View Source',
            //             icon: 'pi pi-fw pi-github',
            //             url: 'https://github.com/primefaces/sakai-ng',
            //             target: '_blank'
            //         }
            //     ]
            // }
        ];
    }
}
