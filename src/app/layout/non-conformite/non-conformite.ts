import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { NgPrimeModule } from '../../../prime-ng.module';
import { MenuItem } from 'primeng/api';
import { Subject } from 'rxjs';
import { NcModule } from '../../pages/nc/nc.module';

@Component({
  selector: 'app-non-conformite-layout',
  standalone: true,
  imports: [
    CommonModule,
    NgPrimeModule, 
    RouterModule,
    NcModule
  ],
  templateUrl: './non-conformite.html',
  styleUrl: './non-conformite.scss'
})
export class NonConformiteLayoutComponent implements OnInit, OnDestroy {
    items: MenuItem[] | undefined;
    activeTab: string = '';
    routerSubscription: any;
    submitNCVisible: boolean = false;
    destroy$: Subject<boolean> = new Subject<boolean>();

    constructor(private router: Router) {
        this.routerSubscription = this.router.events.subscribe((event) => {
            if (event instanceof NavigationEnd) {
                this.activeTab = event.urlAfterRedirects.split('?')[0];
            }
        });
    }

    ngOnInit() {
        this.activeTab = this.router.url.split('?')[0];
        this.items = [
            { 
                label: "Vue d'ensemble", 
                icon: 'pi pi-chart-bar', 
                routerLink: '/non-conformite/vue-ensemble' 
            },
            { 
                label: 'Analyse et Validation', 
                icon: 'pi pi-file-edit', 
                routerLink: '/non-conformite/analyse-validation' 
            },
            { 
                label: 'Affectation et actions', 
                icon: 'pi pi-users', 
                routerLink: '/non-conformite/affectation-action' 
            },
            { 
                label: 'Suivi des NC', 
                icon: 'pi pi-clock', 
                routerLink: '/non-conformite/suivi' 
            }
        ];
    }

    openSubmitNC() {
        this.submitNCVisible = true;
    }

    ngOnDestroy() {
        if (this.routerSubscription) {
            this.routerSubscription.unsubscribe();
        }
        this.destroy$.next(true);
        this.destroy$.complete();
    }
}
