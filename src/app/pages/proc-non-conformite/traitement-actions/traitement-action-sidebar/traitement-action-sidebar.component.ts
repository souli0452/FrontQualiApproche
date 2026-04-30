import { Component, OnDestroy, OnInit } from '@angular/core';
import { filter, Subject } from 'rxjs';

import { takeUntil } from 'rxjs/operators';

import { NonConformiteService } from '../../../../services/non-conformite.service';
import { FeaturesService } from '../../../../services/feature-service';
import { NonConformStatus } from '../../../../enums';
import { MenuItem } from 'primeng/api';
import { NavigationEnd, Router } from '@angular/router';
import { NcStats } from '../../../../models/statsNc';
import { ProcNonConformiteService } from '../../proc-non-conformite.service';
import { AuthService } from '../../../../services/auth-services/auth.service';
import { transformerEnStats } from '../../../../utils';


@Component({
    selector: 'app-traitement-action-sidebar',
    templateUrl: './traitement-action-sidebar.component.html',
    standalone:false
})
export class TraitementActionSidebarComponent implements OnDestroy {

    items: MenuItem[] = [];
    loading: boolean = false;
    destroy$: Subject<boolean> = new Subject<boolean>();

    url: string = '';
user: any = {};
    constructor(private router: Router,
                private actualityService: ProcNonConformiteService,
                private authService: AuthService,
                private featureService:FeaturesService) {

        this.router.events.pipe(filter((event) => event instanceof NavigationEnd))
            .pipe(takeUntil(this.destroy$))
            .subscribe((params: any) => {
                this.url = params.url;
            });


    }


    ngOnInit(){

        this.user = this.authService.getUser();
        this.fetchPlanActions()
        this.featureService.reaload$.pipe(takeUntil(this.destroy$)).subscribe(reaload => {
            if (reaload) {
                this.fetchPlanActions()
            }
        })
    }



    navigate(item: MenuItem) {
        if (item.routerLink) {
            this.router.navigate([item.routerLink]);
        }
    }

    fetchPlanActions() {
        this.loading = true;
        this.actualityService
            .getPlanActionsAll(this.user.email)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (data) => {
                    this.loading = false;
                    this.getBadgeValues(transformerEnStats(data.body!));

                }
            });
    }
    getBadgeValues(data: NcStats[]) {
        let published = 0,
            drafted = 0,
            archived = 0;

        data.forEach(stats => {
            if (stats.status === NonConformStatus.TRAITER) {
                published = stats.count;
            } if (stats.status === NonConformStatus.NON_TRAITER) {
                drafted = stats.count;
            }
            if (stats.status === NonConformStatus.ARCHIVED) {
                archived = stats.count;
            }
        });

        this.updateSidebar(published, drafted, archived);
    }

    updateSidebar(published?: number, drafted?: number, archived?: number) {
        this.items = [
            {
                label: 'Non traités',
                icon: 'pi pi-star',
                badge: '' + drafted,
                routerLink: '/traitement-action/non-traiter'
            },
            {
                label: 'Traités',
                icon: 'pi pi-inbox',
                badge: '' + published,
                routerLink: '/traitement-action/traiter'
            },
            {
                label: 'Réjétés',
                icon: 'pi pi-inbox',
                badge: '' + archived,
                routerLink: '/traitement-action/rejeter'
            },

        ];
    }

    ngOnDestroy() {
        this.destroy$.next(true);
        this.destroy$.unsubscribe();
    }
}
