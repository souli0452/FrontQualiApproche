import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { NgPrimeModule } from '../../../prime-ng.module';
import { MenuItem } from 'primeng/api';
import { NcModule } from '../../pages/module-nc/nc.module';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { LayoutService } from '../service/layout.service';
import { RoleService } from '../../services/non-conformite/role.service';
import { ProcNonConformiteService } from '../../services/non-conformite/proc-non-conformite.service';
import { NonConformiteService } from '../../services/non-conformite/non-conformite.service';
import { LicenceOuverteDirective } from '../../shared/licence/licence-ouverte.directive';


@Component({
  selector: 'app-non-conformite-layout',
  standalone: true,
  imports: [
    CommonModule,
    NgPrimeModule, 
    RouterModule,
    NcModule,
    LicenceOuverteDirective
  ],
  templateUrl: './non-conformite.html',
  styleUrl: './non-conformite.scss'
})
export class NonConformiteLayoutComponent implements OnInit, OnDestroy {
    items: MenuItem[] | undefined;
    activeTab: string = '';
    routerSubscription: any;
    destroy$: Subject<boolean> = new Subject<boolean>();

    constructor(
        private router: Router,
        public layoutService: LayoutService,
        private nonConformiteService: NonConformiteService,
        public roleService: RoleService
    ) {
        this.routerSubscription = this.router.events.subscribe((event) => {
            if (event instanceof NavigationEnd) {
                this.activeTab = event.urlAfterRedirects.split('?')[0];
            }
        });
    }

    ngOnInit() {
        this.activeTab = this.router.url.split('?')[0];
        this.nonConformiteService.notificationsNC$
            .pipe(takeUntil(this.destroy$))
            .subscribe(notifs => {
                this.buildMenu(notifs); // On reconstruit le menu à chaque changement
            });
    }
    // buildMenu(notifs: any) {
    //     // 1. Les menus communs à tout le monde (Agents, Chefs, RQ)
    //     this.items = [
    //         { 
    //             label: "Vue d'ensemble", 
    //             icon: 'pi pi-chart-bar', 
    //             routerLink: '/non-conformite/vue-ensemble' 
    //         }
    //     ];



    //     // 2. Les menus STRICTEMENT réservés au Chef (Pilote)
    //     if (this.roleService.isChef) {
    //         this.items.push({ 
    //             label: 'Analyse et Réception', 
    //             icon: 'pi pi-file-edit', 
    //             routerLink: '/non-conformite/analyse-reception',
    //             badge: notifs?.reception > 0 ? notifs.reception.toString() : undefined 
    //         });
            
    //         this.items.push({ 
    //             label: 'Affectation et actions', 
    //             icon: 'pi pi-users', 
    //             routerLink: '/non-conformite/affectation-action',
    //             badge: notifs?.affectation > 0 ? notifs.affectation.toString() : undefined
    //         });
    //     }

    //     // 3. Les menus pour les Chefs OU les RQ
    //     if (this.roleService.isChef) {
    //         const actionsCount = (notifs?.validationPilote || 0) + (notifs?.validationRQ || 0) + (notifs?.cloture || 0);
    //         this.items.push({ 
    //             label: 'Validation Pilote', 
    //             icon: 'pi pi-check-square', 
    //             routerLink: '/non-conformite/validation-pilote',
    //             badge: actionsCount > 0 ? actionsCount.toString() : undefined
    //         }
    //     );
    //     }

    //     // 3. Les menus pour les Chefs OU les RQ
    //     if (this.roleService.isRQ) {
    //         const actionsCount = (notifs?.validationPilote || 0) + (notifs?.validationRQ || 0) + (notifs?.cloture || 0);
    //         this.items.push({ 
    //             label: 'Analyse et Validation', 
    //             icon: 'pi pi-check-square', 
    //             routerLink: '/non-conformite/analyse-validation',
    //             badge: notifs?.validationRQ > 0 ? notifs.validationRQ.toString() : undefined
    //         },
    //         { 
    //             label: 'Analyse et Clôture', 
    //             icon: 'pi pi-check-square', 
    //             routerLink: '/non-conformite/analyse-cloture',
    //             badge: notifs?.cloture > 0 ? notifs.cloture.toString() : undefined  
    //         }
    //     );
    //     }

    //             // 3. Les menus pour les Chefs OU les RQ
    //     if (this.roleService.isRQ || this.roleService.isChef) {
    //         this.items.push(
    //         { 
    //             label: 'Suivi des NC', 
    //             icon: 'pi pi-clock', 
    //             routerLink: '/non-conformite/suivi',
    //         }
    //     );
    //     }

    //     if (this.roleService.isAgent) {
    //         const actionsCount = (notifs?.imputees || 0) + (notifs?.nonTraiter || 0) + (notifs?.actions || 0);
    //         this.items.push(
    //             { 
    //                 label: 'Actions à mener', 
    //                 icon: 'pi pi-clock', 
    //                 routerLink: '/non-conformite/actions',
    //                 badge: actionsCount > 0 ? actionsCount.toString() : undefined
    //             }
    //         )
    //     }

    //     // 4. On rajoute les autres menus pour tout le monde
    //     this.items.push(

    //         {
    //             label: 'Mes Non-Conformités publiées',
    //             icon: 'pi pi-calendar',
    //             routerLink: '/non-conformite/publiees'
    //         }
    //     );
    // }

        buildMenu(notifs: any) {
        // On somme toutes les tâches actives en cours de traitement (tout sauf les brouillons)
        let totalBadge = (notifs?.reception || 0) 
            + (notifs?.affectation || 0) 
            + (notifs?.validationPilote || 0) 
            + (notifs?.validationRQ || 0) 
            + (notifs?.cloture || 0) 
            + (notifs?.imputees || 0)
            + (notifs?.nonTraiter || 0)
            + (notifs?.soumission || 0);

        // 2. Déclaration des 3 onglets principaux accessibles à tous
        this.items = [
            { 
                label: "Vue d'ensemble", 
                icon: 'pi pi-chart-bar', 
                routerLink: '/non-conformite/vue-ensemble' 
            },
            {
                label: 'Traitement & Suivi',
                icon: 'pi pi-cog', // Vous pouvez utiliser 'pi pi-cog', 'pi pi-sliders-h' ou 'pi pi-list'
                routerLink: '/non-conformite/traitement-suivi',
                badge: totalBadge > 0 ? totalBadge.toString() : undefined
            },
            {
                label: 'Mes Non-Conformités publiées',
                icon: 'pi pi-calendar',
                routerLink: '/non-conformite/publiees'
            }
        ];
    }


    onTabChange(url: any) {
        if (url && typeof url === 'string') {
            this.router.navigate([url]);
        }
    }


    ngOnDestroy() {
        if (this.routerSubscription) {
            this.routerSubscription.unsubscribe();
        }
        this.destroy$.next(true);
        this.destroy$.complete();
    }
}
