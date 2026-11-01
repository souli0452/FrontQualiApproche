import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MenuItem } from 'primeng/api';

import { NgPrimeModule } from '@prime-ng';
import { TableColumn } from '../../models/generique.model';
import { HeaderPage } from '@shared/header-page/header-page';
import { AlertService } from '@shared/alert-message/alert-message.service';
import { TableauAffichageComponent } from '@shared/tableau-affichage/tableau-affichage';
import { ClientPlateforme } from './clients.model';
import { ClientsService } from './clients.service';

/** Une ligne du tableau : le client, et ce que l'affichage en tire. */
interface LigneClient extends ClientPlateforme {
    licence: string;
    severiteLicence: string;
    echeance: string;
    modulesSouscrits: { libelle: string }[];
}

/**
 * Les clients de l'installation, pour l'administrateur de la plateforme.
 *
 * Il voit leur identité et l'état de leur licence — rien de leurs données. Chaque client est une
 * direction, avec ses comptes, son paramétrage et sa licence.
 */
@Component({
    selector: 'app-clients-liste',
    standalone: true,
    imports: [HeaderPage, CommonModule, NgPrimeModule, TableauAffichageComponent],
    template: `
        <app-header-page
            title="Clients"
            subtitle="Les organisations hébergées par la plateforme, et l'état de leur licence"
            [breadcrumbs]="breadcrumbs"
            buttonText="Nouveau client"
            buttonIcon="pi pi-plus"
            (actionClick)="nouveau()"
        />
        <div class="page-layout">
            <div class="flex items-center justify-between gap-3 mb-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                <span class="text-sm text-slate-700">
                    Données écrites avant la séparation des clients, ou paramétrage d'un service redéployé seul :
                    la synchronisation passe chaque nuit, et se relance ici.
                </span>
                <button pButton pRipple class="p-button-outlined p-button-secondary shrink-0" icon="pi pi-refresh"
                        label="Relancer le rattrapage" [loading]="rattrapageEnCours" (click)="rattraper()"></button>
            </div>

            <app-tableau-affichage
                [tableCols]="tableCols"
                [listeObject]="lignes"
                [loading]="loading"
                [showSearch]="true"
                placeholderRecherche="Rechercher un client"
                [isPagination]="false"
                [getActionMenuItems]="actionsDeLaLigne"
            ></app-tableau-affichage>
        </div>
    `
})
export class ClientsListeComponent implements OnInit {

    breadcrumbs = [{ label: 'Plateforme' }, { label: 'Clients' }];

    tableCols: TableColumn[] = [
        { field: 'libelleLong', header: 'Client', type: 'string' },
        { field: 'libelleCourt', header: 'Sigle', type: 'string' },
        { field: 'email', header: 'Courriel', type: 'string' },
        { field: 'licence', header: 'Licence', type: 'badge', severityField: 'severiteLicence' },
        { field: 'echeance', header: 'Échéance', type: 'string' },
        { field: 'modulesSouscrits', header: 'Modules', type: 'list' }
    ];

    lignes: LigneClient[] = [];
    loading = false;
    rattrapageEnCours = false;

    constructor(private service: ClientsService, private alertService: AlertService, private router: Router) {}

    ngOnInit(): void {
        this.charger();
    }

    charger(): void {
        this.loading = true;
        this.service.lister().subscribe({
            next: clients => {
                this.lignes = clients.map(c => this.ligne(c));
                this.loading = false;
            },
            error: err => {
                this.loading = false;
                this.alertService.handleHttpError(err, 'Impossible de lire la liste des clients.');
            }
        });
    }

    nouveau(): void {
        this.router.navigate(['/plateforme/clients/nouveau']);
    }

    actionsDeLaLigne = (ligne: LigneClient): MenuItem[] => [
        {
            label: 'Reposer le paramétrage par défaut',
            icon: 'pi pi-sync',
            command: () => this.amorcer(ligne)
        }
    ];

    /** Rejoue l'amorce : sans risque, ce que le client a modifié n'est jamais écrasé. */
    amorcer(ligne: LigneClient): void {
        this.service.amorcer(ligne.id).subscribe({
            next: echecs => {
                const services = Object.keys(echecs ?? {});
                if (services.length === 0) {
                    this.alertService.showSuccess(`Paramétrage de « ${ligne.libelleLong} » à jour dans tous les services.`);
                } else {
                    this.alertService.showWarning(`Paramétrage incomplet pour « ${ligne.libelleLong} » : `
                        + `${services.join(', ')}. Relancez quand ces services répondront.`);
                }
            },
            error: err => this.alertService.handleHttpError(err, 'Le paramétrage n\'a pas pu être reposé.')
        });
    }

    rattraper(): void {
        this.rattrapageEnCours = true;
        this.service.rattraper().subscribe({
            next: rapport => {
                this.rattrapageEnCours = false;
                const injoignables = Object.entries(rapport ?? {})
                    .filter(([, v]) => typeof v === 'string' && v.startsWith('injoignable'))
                    .map(([service]) => service);
                if (injoignables.length === 0) {
                    this.alertService.showSuccess('Rattrapage passé dans tous les services.');
                } else {
                    this.alertService.showWarning(`Rattrapage incomplet, services injoignables : ${injoignables.join(', ')}.`);
                }
            },
            error: err => {
                this.rattrapageEnCours = false;
                this.alertService.handleHttpError(err, 'Le rattrapage n\'a pas pu être lancé.');
            }
        });
    }

    private ligne(c: ClientPlateforme): LigneClient {
        const libelles: Record<string, string> = { ACTIVE: 'Active', EXPIREE: 'Expirée', ABSENTE: 'Aucune' };
        const severites: Record<string, string> = { ACTIVE: 'success', EXPIREE: 'danger', ABSENTE: 'warn' };
        return {
            ...c,
            licence: libelles[c.statutLicence] ?? c.statutLicence,
            severiteLicence: severites[c.statutLicence] ?? 'info',
            echeance: c.statutLicence === 'ABSENTE' || c.joursRestants === null
                ? '—'
                : c.joursRestants < 0 ? `échue depuis ${-c.joursRestants} j` : `${c.joursRestants} j restants`,
            modulesSouscrits: (c.modules ?? []).map(m => ({ libelle: m }))
        };
    }
}
