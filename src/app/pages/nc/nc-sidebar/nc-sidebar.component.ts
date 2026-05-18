import { Component, OnDestroy } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { NavigationEnd, Router } from '@angular/router';
import { filter, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {FeaturesService} from "../../../services/feature-service";
import { NonConformiteService } from '../../../services/non-conformite.service';
import { NcStats } from '../../../models/statsNc';
import { NonConformStatus } from '../../../enums';
import { Structure } from '../../structure/structure-config/structure';
import { getCurrentUserStructure } from '../../../utils';

@Component({
    selector: 'app-nc-sidebar',
    templateUrl: './nc-sidebar.component.html',
    standalone:false
})
export class NcSidebarComponent implements OnDestroy {

    items: MenuItem[] = [];
    userStructure:Structure={};
    destroy$: Subject<boolean> = new Subject<boolean>();

    url: string = '';

    constructor(private router: Router,
                private actualityService: NonConformiteService,
                private featureService:FeaturesService) {

        this.url = this.router.url;
        this.router.events.pipe(filter((event) => event instanceof NavigationEnd))
            .pipe(takeUntil(this.destroy$))
            .subscribe((params: any) => {
                this.url = params.url;
            });


    }


    ngOnInit(){
        this.userStructure = getCurrentUserStructure();
        this.getCountStatut();
        this.featureService.reaload$.subscribe(reaload => {
            if (reaload) {
                console.log("reload"+reaload);
                this.getCountStatut();
            }
        })
    }



    navigate(item: MenuItem) {
        if (item.routerLink) {
            this.router.navigate([item.routerLink]);
        }
    }

    isActive(item: MenuItem): boolean {
        if (!this.url || this.url === '/' || this.url.endsWith('/nc') || this.url.endsWith('/nc/')) {
            return item.routerLink === '/nc/draft';
        }
        return this.url.includes(item.routerLink as string);
    }

    getCountStatut(){
        this.actualityService.getCountByStatus(this.userStructure.id)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (data) => {
                    console.log(data);
                    this.getBadgeValues(data.body!);
                }
            });
     }
    getBadgeValues(data: NcStats[]) {
        let published = 0,
            drafted = 0,
            archived = 0;

        data.forEach(stats => {
            if (stats.status === NonConformStatus.PUBLISHED) {
                published = stats.count;
            } else if (stats.status === NonConformStatus.DRAFT) {
                drafted = stats.count;
            } else if (stats.status === NonConformStatus.ARCHIVED) {
                archived = stats.count;
            }
        });

        this.updateSidebar(published, drafted, archived);
    }

    updateSidebar(published?: number, drafted?: number, archived?: number) {
        this.items = [
            {
                label: 'En attente',
                icon: 'pi pi-star',
                badge: '' + drafted,
                routerLink: '/nc/draft'
            },
            {
                label: 'Publiées',
                icon: 'pi pi-inbox',
                badge: '' + published,
                routerLink: '/nc/published'
            },
            {
                label: 'Réjétées',
                icon: 'pi pi-times',
                badge: '' + archived,
                routerLink: '/nc/archived'
            }
        ];
    }

    ngOnDestroy() {
        this.destroy$.next(true);
        this.destroy$.unsubscribe();
    }
}
