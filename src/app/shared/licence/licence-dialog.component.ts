import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { NgPrimeModule } from '../../../prime-ng.module';

import { EtatLicence, LicenceService } from '../../services/licence.service';
import { hasAnyPermission } from '../../utils/auth/auth-utils';

/**
 * L'invitation à installer une licence, à la première connexion et à l'échéance.
 *
 * <p>Elle s'impose — sans croix ni clic à côté pour la fermer — tant qu'aucune licence valide
 * n'est posée : c'est la seule chose à faire, et l'application n'ouvrirait rien d'autre. Une
 * licence valide la fait disparaître ; un terme proche la remplace par un simple bandeau.</p>
 *
 * <p>Deux issues à la première connexion : coller la licence remise par l'éditeur, ou démarrer un
 * essai gratuit de quelques jours, tous modules ouverts. L'essai n'est proposé qu'une fois par
 * installation — sans quoi il suffirait d'en redemander un à chaque échéance.</p>
 *
 * <p>À l'expiration, les données restent <b>consultables</b> : seules les actions sont suspendues.
 * Couper l'accès aux données qualité d'un client transformerait un retard de paiement en litige.</p>
 */
@Component({
    selector: 'app-licence-dialog',
    standalone: true,
    imports: [CommonModule, FormsModule, NgPrimeModule],
    template: `
        @if (etat && doitSAfficher) {
            <p-dialog [visible]="true" [modal]="true" [closable]="false" [draggable]="false"
                      [style]="{ width: '38rem' }" styleClass="licence-dialog">

                <ng-template pTemplate="header">
                    <div class="flex items-center gap-3">
                        <i class="pi pi-shield text-2xl"
                           [ngClass]="etat.statut === 'EXPIREE' ? 'text-orange-500' : 'text-primary'"></i>
                        <span class="text-xl font-bold">
                            {{ etat.statut === 'ABSENTE' ? 'Activer QualiSira' : 'Licence expirée' }}
                        </span>
                    </div>
                </ng-template>

                <p class="text-surface-600 m-0 mb-4 leading-relaxed">{{ etat.message }}</p>

                @if (etat.statut === 'EXPIREE') {
                    <!-- Dire ce qui reste possible évite l'appel au support qui commence par
                         « nous avons tout perdu ». -->
                    <div class="flex items-start gap-2 mb-4 p-3 border-round bg-blue-50 text-blue-900 text-sm">
                        <i class="pi pi-info-circle mt-1"></i>
                        <span>Vos données restent consultables et exportables. Seules les créations
                              et les décisions sont suspendues, jusqu'à l'installation d'une
                              licence.</span>
                    </div>
                }

                @if (!peutInstaller) {
                    <div class="flex items-start gap-2 p-3 border-round bg-surface-100 text-surface-700 text-sm">
                        <i class="pi pi-lock mt-1"></i>
                        <span>Seul un administrateur peut installer une licence. Rapprochez-vous de
                              lui pour qu'il la pose.</span>
                    </div>
                } @else {
                    <div class="flex flex-col gap-2">
                        <label class="text-sm font-medium">Licence remise par l'éditeur</label>
                        <textarea pTextarea [(ngModel)]="licence" rows="4"
                                  placeholder="QSL1...." class="w-full font-mono text-xs"></textarea>
                        <small class="text-surface-400">
                            Collez le contenu du fichier <code>.lic</code> reçu par courriel, d'un
                            seul tenant. Les retours à la ligne ajoutés par la messagerie sont sans
                            conséquence.
                        </small>
                    </div>

                    @if (erreur) {
                        <div class="flex items-start gap-2 mt-3 p-3 border-round bg-red-50 text-red-800 text-sm">
                            <i class="pi pi-times-circle mt-1"></i>
                            <span>{{ erreur }}</span>
                        </div>
                    }
                }

                <ng-template pTemplate="footer">
                    @if (peutInstaller) {
                        @if (etat.essaiDisponible) {
                            <!-- L'essai n'est proposé qu'une fois : le rappeler ici évite qu'on le
                                 consomme sans le savoir. -->
                            <p-button label="Essayer 7 jours gratuitement" icon="pi pi-clock"
                                      severity="secondary" [outlined]="true" [loading]="enCours"
                                      (onClick)="essayer()"></p-button>
                        }
                        <p-button label="Installer la licence" icon="pi pi-check"
                                  [loading]="enCours" [disabled]="!licence.trim()"
                                  (onClick)="installer()"></p-button>
                    } @else {
                        <p-button label="Se déconnecter" icon="pi pi-sign-out" severity="secondary"
                                  [text]="true" (onClick)="deconnexionDemandee()"></p-button>
                    }
                </ng-template>
            </p-dialog>
        }

        <!-- Échéance proche : un bandeau, pas une fenêtre. Le travail n'a pas à s'interrompre
             pour une licence qui court encore. -->
        @if (etat && bandeauEcheance) {
            <div class="flex items-center gap-2 mb-3 p-3 border-round bg-orange-50 text-orange-900 text-sm">
                <i class="pi pi-exclamation-triangle"></i>
                <span class="flex-1">{{ etat.message }}</span>
                @if (peutInstaller) {
                    <p-button label="Installer une licence" size="small" [text]="true"
                              (onClick)="forcerOuverture()"></p-button>
                }
            </div>
        }
    `
})
export class LicenceDialogComponent implements OnInit {

    private readonly service = inject(LicenceService);
    private readonly messages = inject(MessageService);

    etat: EtatLicence | null = null;
    licence = '';
    erreur = '';
    enCours = false;

    /** Ouverture demandée depuis le bandeau, alors que la licence court encore. */
    private ouvertureForcee = false;

    peutInstaller = false;

    ngOnInit(): void {
        this.peutInstaller = hasAnyPermission(
            ['SUPER_ADMIN', 'CONFIG_GLOBAL_MANAGE', 'config-global-write']);

        this.service.etat$.subscribe((etat) => (this.etat = etat));
        // Une lecture en échec — service indisponible — laisse l'application se comporter comme
        // avant : mieux vaut un écran utilisable qu'une fenêtre bloquante due à une panne.
        this.service.charger().subscribe({ error: () => undefined });
    }

    get doitSAfficher(): boolean {
        return !!this.etat && (!this.etat.actionsOuvertes || this.ouvertureForcee);
    }

    get bandeauEcheance(): boolean {
        return !!this.etat && this.etat.actionsOuvertes && !this.ouvertureForcee
            && this.etat.joursRestants <= 30;
    }

    forcerOuverture(): void {
        this.ouvertureForcee = true;
    }

    installer(): void {
        this.erreur = '';
        this.enCours = true;
        this.service.installer(this.licence).subscribe({
            next: (etat) => {
                this.enCours = false;
                this.ouvertureForcee = false;
                this.licence = '';
                this.messages.add({
                    severity: 'success',
                    summary: 'Licence installée',
                    detail: etat.message,
                    life: 8000
                });
            },
            error: (e: Error) => {
                this.enCours = false;
                this.erreur = e.message;
            }
        });
    }

    essayer(): void {
        this.erreur = '';
        this.enCours = true;
        this.service.demarrerEssai().subscribe({
            next: (etat) => {
                this.enCours = false;
                this.messages.add({
                    severity: 'success',
                    summary: 'Essai démarré',
                    detail: etat.message,
                    life: 8000
                });
            },
            error: (e: Error) => {
                this.enCours = false;
                this.erreur = e.message;
            }
        });
    }

    deconnexionDemandee(): void {
        // Sans licence et sans droit de l'installer, il n'y a rien à faire ici : la déconnexion
        // est la seule issue offerte, plutôt qu'une fenêtre dont on ne sort pas.
        window.location.href = '/auth/login';
    }
}
