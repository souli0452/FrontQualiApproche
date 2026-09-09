import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { AppMenuitem } from './app.menuitem';
import { AuthService, accesAutorise, hasAnyPermission, hasMenuProfile } from '../../auth';
import { ChangeDetectorRef } from '@angular/core';
import { ModuleAbonnement } from '../../enums';
import { AppNotificationService } from '@core/notifications/app-notification.service';

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
    roles: any[] = [];

    constructor(
        private cdr: ChangeDetectorRef,
        private readonly appNotificationService: AppNotificationService,

    ) {}

    /**
     * Une entrée de menu ne s'affiche que si deux conditions sont réunies : module souscrit par la
     * direction, et permission détenue par l'utilisateur.
     *
     * Le module est facultatif : toutes les rubriques ne relèvent pas d'un abonnement (l'accueil,
     * la configuration). En exiger un là où il n'existe pas revenait à masquer l'entrée pour tout
     * le monde — c'est ce que faisait le module fictif « AUTRE_MODULE », absent de l'énumération
     * ModuleAbonnement du back : aucune direction ne pouvait y avoir souscrit.
     *
     * <p>L'échéance de la licence n'entre pas dans le calcul. Elle a longtemps vidé le menu entier
     * — jusqu'au tableau de bord — alors que la fenêtre d'activation promet, dans la même vue, que
     * « vos données restent consultables et exportables ». Une licence expirée suspend les
     * <b>actions</b>, et c'est la passerelle qui les refuse ; la consultation, elle, ne se ferme
     * jamais.</p>
     */
    private peutVoir(permissions: string[], module?: string): boolean {
        return accesAutorise(permissions, module);
    }

    /**
     * Visibilité d'une rubrique de premier niveau.
     *
     * Les permissions `menu-*` permettent de fermer une rubrique entière à un rôle, même s'il
     * détient des permissions fonctionnelles à l'intérieur. Elles ne s'appliquent toutefois qu'aux
     * profils qui en possèdent au moins une : un rôle créé sur mesure avant leur introduction n'en
     * a aucune, et se verrait sinon privé de tout le menu du jour au lendemain. Pour ceux-là, la
     * règle reste l'ancienne — la rubrique suit ses entrées.
     */
    private rubriqueVisible(permissionMenu: string, items: MenuItem[]): boolean {
        const auMoinsUneEntree = items.some(item => item.visible !== false);
        if (!auMoinsUneEntree) return false;
        return hasMenuProfile() ? hasAnyPermission([permissionMenu]) : true;
    }

    /**
     * Groupe d'entrées à l'intérieur d'une rubrique, masqué dès lors qu'aucune de ses entrées
     * n'est visible — sans quoi l'utilisateur ouvrirait un intitulé pour n'y rien trouver.
     */
    private sousGroupe(label: string, icon: string, items: MenuItem[]): MenuItem {
        const visibles = items.filter(item => item.visible !== false);
        return { label, icon, visible: visibles.length > 0, items: visibles };
    }

    /** Rubrique dont le libellé, l'icône et les entrées sont déjà arrêtés. */
    private rubrique(label: string, icon: string, permissionMenu: string, items: MenuItem[]): MenuItem {
        return {
            label,
            icon,
            visible: this.rubriqueVisible(permissionMenu, items),
            items: items.filter(item => item.visible !== false)
        };
    }

        /** Met à jour la pastille d'un élément de menu de façon réactive et universelle */
    private updateMenuBadge(itemLabel: string, count: number): void {
        for (const rubric of this.model) {
            if (!rubric.items) continue;
            const index = rubric.items.findIndex(i => i.label === itemLabel);
            if (index !== -1) {
                rubric.items[index] = {
                    ...rubric.items[index],
                    badge: count > 0 ? count.toString() : undefined,
                    badgeStyleClass: 'bg-red-500 text-white font-bold'
                };
                this.model = [...this.model];
                this.cdr.markForCheck();
                break;
            }
        }
    }


    ngOnInit() {
        const accueil = [
            { label: 'Tableau de bord', icon: 'pi pi-fw pi-home', routerLink: ['/'] }
        ];

        const documentaire = [
            {
                label: 'Gestion documentaire',
                icon: 'pi pi-fw pi-briefcase',
                routerLink: ['/gestion-documentaire'],
                visible: this.peutVoir(['document-read', 'document-write', 'DOC_READ'], ModuleAbonnement.DOCUMENTAIRE)
            }
        ];

        const qualite = [
            {
                label: 'Audite', icon: 'pi pi-fw pi-eye', routerLink: ['/audite'],
                visible: this.peutVoir(['AUDITE_READ'], ModuleAbonnement.AUDIT)
            },
            {
                label: 'Non-Conformités', icon: 'pi pi-fw pi-briefcase', routerLink: ['/non-conformite'],
                visible: this.peutVoir(['nc-read', 'nc-write', 'NC_READ', 'SUBMIT_NC'], ModuleAbonnement.NON_CONFORMITE)
            },
            {
                label: 'Réglementation', icon: 'pi pi-fw pi-file-edit', routerLink: ['/reglementation'],
                visible: this.peutVoir(['reglementation-read', 'REGLEMENTATION_READ'], ModuleAbonnement.REGLEMENTATION)
            },
            {
                label: "Critères d'évaluation", icon: 'pi pi-fw pi-file', routerLink: ['/critere-evaluation'],
                visible: this.peutVoir(['exigence-read', 'CRITERE_EVAL_READ'], ModuleAbonnement.EVALUATION)
            }
        ];

        const ressources = [
            {
                label: 'Formation', icon: 'pi pi-fw pi-book', routerLink: ['/formation'],
                visible: this.peutVoir(['formation-read', 'RESOURCES_READ'], ModuleAbonnement.FORMATION)
            },
            {
                label: 'Fournisseur', icon: 'pi pi-fw pi-users', routerLink: ['/fournisseur'],
                visible: this.peutVoir(['fournisseur-read', 'RESOURCES_READ'],ModuleAbonnement.FORMATION)
            },
            {
                label: 'Prestataire', icon: 'pi pi-fw pi-user-plus', routerLink: ['/prestataire'],
                visible: this.peutVoir(['prestataire-read', 'RESOURCES_READ'],ModuleAbonnement.FORMATION)
            },
            {
                label: 'Produit', icon: 'pi pi-fw pi-box', routerLink: ['/produit'],
                visible: this.peutVoir(['produit-read', 'RESOURCES_READ'],ModuleAbonnement.FORMATION)
            }
        ];

        const actions = [
            {
                label: 'Action corrective et préventive', icon: 'pi pi-fw pi-list-check',
                routerLink: ['/action-corrective-preventive'],
                visible: this.peutVoir(['action-corrective-read', 'action-read', 'ACTIONS_READ'], ModuleAbonnement.AUDIT)
            },
            {
                label: 'Réclamation', icon: 'pi pi-fw pi-exclamation-triangle', routerLink: ['/reclamation'],
                visible: this.peutVoir(['reclamation-read', 'RECLAMATION_READ'], ModuleAbonnement.RECLAMATION)
            },
            {
                label: 'Risque', icon: 'pi pi-fw pi-ban', routerLink: ['/risque'],
                visible: this.peutVoir(['risque-read', 'RISQUE_READ'], ModuleAbonnement.RISQUE)
            }
        ];

        // La gestion des comptes est une rubrique de premier niveau, non plus un sous-groupe de
        // « Configurations » : administrer les personnes est un geste quotidien, configurer
        // l'application un geste d'installation. La rubrique reprend la permission de menu
        // `menu-configuration` — celle qui la gouvernait déjà — plutôt que d'en inventer une que
        // le dictionnaire du back ne connaît pas : une permission inconnue masquerait la rubrique
        // pour tous les profils de menu, SUPER_ADMIN compris.
        const comptes = [
            {
                label: 'Gestion des utilisateurs', icon: 'pi pi-fw pi-users', routerLink: ['/utilisateurs'],
                visible: this.peutVoir(['MANAGE_USER'])
            },
            {
                label: 'Gestion des rôles', icon: 'pi pi-fw pi-id-card', routerLink: ['/roles'],
                visible: this.peutVoir(['ROLE_MANAGE'])
            }
        ];

        // Les sous-groupes (non-conformités, organigramme, documentation) reprennent le
        // découpage du menu remanié sur develop, mais chaque entrée passe par `peutVoir` : la
        // version d'origine n'en soumettait aucune à une permission, et gardait trois entrées
        // derrière le module fictif « AUTRE_MODULE », absent de l'énumération du back — donc
        // invisibles pour tout le monde, faute d'une direction pouvant y souscrire.
        const configurations = [
            {
                label: 'Configurations globales', icon: 'pi pi-sliders-h', routerLink: ['/configurations'],
                visible: this.peutVoir(['config-global-read', 'config-global-write', 'CONFIG_READ', 'CONFIG_GLOBAL_MANAGE'])
            },
            this.sousGroupe('Non-Conformités', 'pi pi-fw pi-exclamation-triangle', [
                {
                    label: 'Niveau de Non-Conformité', routerLink: ['/niveau-non-conformite'],
                    visible: this.peutVoir(['niveau-nc-read', 'niveau-nc-write', 'NC_LEVEL_MANAGE'], ModuleAbonnement.NON_CONFORMITE)
                },
                {
                    label: 'Origine de Non-Conformité', routerLink: ['/origine-non-conformite'],
                    visible: this.peutVoir(['type-nc-read', 'type-nc-write', 'NC_ORIGIN_MANAGE'], ModuleAbonnement.NON_CONFORMITE)
                }
            ]),
            this.sousGroupe('Organigramme', 'pi pi-fw pi-sitemap', [
                {
                    label: 'Catégorie de processus', routerLink: ['/parametrage-organigramme/categorie-processus'],
                    visible: this.peutVoir(['type-processus-read', 'type-processus-write', 'TYPE_PROC_MANAGE', 'CONFIG_READ'])
                },
                {
                    label: 'Processus', routerLink: ['/parametrage-organigramme/processus'],
                    visible: this.peutVoir(['structure-read', 'structure-write', 'STRUCT_MANAGE', 'SERVICE_MANAGE'])
                }
            ]),
            // La configuration des circuits n'est plus une entrée de menu : elle est servie par les
            // onglets du centre de configuration, avec le catalogue d'étapes et les modèles
            // d'e-mail. « Configurations Globales » ci-dessus y mène.
            this.sousGroupe('Documentation', 'pi pi-fw pi-print', [
                {
                    label: 'Type de document', routerLink: ['/parametrage-document/types'],
                    visible: this.peutVoir(['document-type-read', 'document-type-write'], ModuleAbonnement.DOCUMENTAIRE)
                },
                {
                    label: 'Priorités', routerLink: ['/parametrage-document/priorites'],
                    visible: this.peutVoir(
                        ['priorite-document-read', 'priorite-document-write', 'CONFIG_READ'],
                        ModuleAbonnement.DOCUMENTAIRE)
                },
                {
                    label: "Domaines d'application", routerLink: ['/parametrage-document/domaines'],
                    visible: this.peutVoir(
                        ['domaine-application-read', 'domaine-application-write', 'CONFIG_READ'],
                        ModuleAbonnement.DOCUMENTAIRE)
                },
                {
                    label: 'Niveaux de confidentialité', routerLink: ['/parametrage-document/confidentialite'],
                    visible: this.peutVoir(
                        ['niveau-confidentialite-read', 'niveau-confidentialite-write', 'CONFIG_READ'],
                        ModuleAbonnement.DOCUMENTAIRE)
                }
            ])
        ];

        this.model = [
            this.rubrique('Accueil', 'pi pi-fw pi-home', 'menu-accueil', accueil),
            this.rubrique('Gestion documentaire', 'pi pi-fw pi-briefcase', 'menu-gestion-documentaire', documentaire),
            this.rubrique('Qualité & Conformité', 'pi pi-fw pi-verified', 'menu-qualite', qualite),
            this.rubrique('Gestion des Ressources', 'pi pi-fw pi-database', 'menu-ressources', ressources),
            this.rubrique('Gestion des Actions', 'pi pi-fw pi-list-check', 'menu-actions', actions),
            this.rubrique('Comptes utilisateurs', 'pi pi-fw pi-user', 'menu-configuration', comptes),
            this.rubrique('Configurations', 'pi pi-sliders-h', 'menu-configuration', configurations)
        ].filter(rubrique => rubrique.visible);


        // 🚀 Écoute réactive et centralisée de tous les badges de l'application
        this.appNotificationService.moduleBadges$.subscribe(badges => {
            if (badges['NC'] !== undefined) {
                this.updateMenuBadge('Non-Conformités', badges['NC']);
            }
            if (badges['DOC'] !== undefined) {
                this.updateMenuBadge('Gestion documentaire', badges['DOC']);
            }
            if (badges['ACTIONS'] !== undefined) {
                this.updateMenuBadge('Action corrective et préventive', badges['ACTIONS']);
            }
        });

    }
}
