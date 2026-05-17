import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterModule } from '@angular/router';
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
    submitNCVisible: boolean = false;
    destroy$: Subject<boolean> = new Subject<boolean>();

    constructor() {}

    ngOnInit() {
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
        this.destroy$.next(true);
        this.destroy$.complete();
    }
}
