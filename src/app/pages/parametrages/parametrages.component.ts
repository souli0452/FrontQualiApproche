import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NgPrimeModule } from '../../../prime-ng.module';
import { MenuItem } from 'primeng/api';
import { ButtonGroupModule } from 'primeng/buttongroup';

@Component({
  selector: 'app-parametrages',
  standalone: true,
  imports: [
    CommonModule,
    NgPrimeModule, 
    ButtonGroupModule, 
    RouterModule,
  ],
  templateUrl: './parametrages.component.html',
  styleUrl: './parametrages.component.scss'
})
export class ParametragesComponent implements OnInit {
    items: MenuItem[] | undefined;

    ngOnInit() {
        this.items = [
            { label: 'Utilisateurs', icon: 'pi pi-users', routerLink: '/configurations/utilisateurs' },
            { label: 'Rôles & Permissions', icon: 'pi pi-lock', routerLink: '/configurations/roles' },
            { label: 'Processus', icon: 'pi pi-cog', routerLink: '/configurations/type-processus' },
            { label: 'Types de NC', icon: 'pi pi-list', routerLink: '/configurations/type-nc' },
            { label: 'Niveaux de NC', icon: 'pi pi-sort-amount-up', routerLink: '/configurations/niveau-nc' },
            { label: 'Types Actions', icon: 'pi pi-bolt', routerLink: '/configurations/type-action' },
            { label: 'Services', icon: 'pi pi-map-marker', routerLink: '/configurations/service' },
            { label: 'Configuration globale', icon: 'pi pi-cog', routerLink: '/configurations/config-systeme' }
        ];
    }
}
