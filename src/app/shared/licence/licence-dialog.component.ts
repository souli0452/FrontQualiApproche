import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { NgPrimeModule } from '../../../prime-ng.module';

import { EtatLicence, LicenceService } from '@core/licence';
import { hasAnyPermission } from '@core/auth';

/**
 * L'invitation à installer une licence, à la première connexion et à l'échéance.
 *
 * <p>Elle ne s'impose que dans un seul cas : <b>aucune licence posée</b>. Là, il n'y a rien
 * d'autre à faire, et la fenêtre n'a ni croix ni clic à côté pour la fermer.</p>
 *
 * <p>À l'<b>expiration</b>, elle se retire au profit d'un bandeau. Elle restait auparavant
 * modale et infermable, ce qui fermait l'application entière — tout en affichant, dans la même
 * vue, que « vos données restent consultables et exportables ». Une licence échue suspend les
 * actions, pas la consultation : couper l'accès aux données qualité d'un client transformerait
 * un retard de paiement en litige, et le pousserait à chercher comment contourner. Le bandeau
 * reste, lui, sous les yeux, et rouvre la fenêtre sur demande.</p>
 *
 * <p>Une seule issue à la première connexion : coller la licence remise par l'éditeur — essai
 * gratuit compris, car il est désormais émis et signé comme les autres. L'installation se
 * l'accordait auparavant d'un clic ; elle ne pouvait alors pas le compter, un effacement de ligne
 * en base suffisant à en obtenir un nouveau. Tant qu'un essai court, un bandeau le dit : personne
 * ne doit découvrir qu'il était en essai le jour où il s'arrête.</p>
 *
 * <p>Elle s'ouvre aussi à la demande, depuis « Configurations » : on renouvelle avant le terme,
 * ou l'on remplace un essai par la licence achetée.</p>
 */
@Component({
    selector: 'app-licence-dialog',
    standalone: true,
    imports: [CommonModule, FormsModule, NgPrimeModule],
    template: `
        @if (etat) {
            <p-dialog [(visible)]="visible" [modal]="true" [closable]="estFermable" [draggable]="false"
                      [closeOnEscape]="estFermable" (onHide)="fermer()"
                      [style]="{ width: '38rem' }" styleClass="licence-dialog"
                      maskStyleClass="qs-mask-flou">

                <ng-template pTemplate="header">
                    <div class="flex items-center gap-3">
                        <i class="pi pi-shield text-2xl"
                           [ngClass]="etat.statut === 'EXPIREE' ? 'text-orange-500' : 'text-primary'"></i>
                        <span class="text-xl font-bold">{{ titre }}</span>
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

                    @if (etat.statut === 'ABSENTE') {
                        <!-- L'essai était auparavant accordé par l'installation elle-même, d'un
                             clic. Il est désormais émis et signé par l'éditeur, seul en mesure de
                             le compter : une installation ne pouvait pas le faire pour elle-même,
                             effacer une ligne suffisait à en obtenir un nouveau. -->
                        <div class="flex items-start gap-2 mt-3 p-3 border-round bg-surface-100 text-surface-700 text-sm">
                            <i class="pi pi-clock mt-1"></i>
                            <span>Pas encore de licence ? Demandez-en une à l'éditeur, essai gratuit
                                  compris : elle vous sera remise sous la même forme, à coller
                                  ci-dessus.</span>
                        </div>
                    }
                }

                <ng-template pTemplate="footer">
                    @if (peutInstaller) {
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

        <!-- Un bandeau, pas une fenêtre : le travail n'a pas à s'interrompre pour une licence,
             qu'elle coure encore, qu'elle soit un essai ou qu'elle ait pris fin. Le serveur rédige
             la phrase — elle dit l'échéance et ce qu'il reste à faire. -->
        @if (etat && bandeau) {
            <div class="flex items-center gap-2 mb-3 p-3 border-round text-sm" [ngClass]="bandeauClasse">
                <i [class]="bandeauIcone"></i>
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

    /**
     * Visibilité réelle de la fenêtre, tenue en champ et non calculée dans le gabarit.
     *
     * <p>Elle était pilotée par un {@code @if} sur un {@code [visible]="true"} figé : PrimeNG
     * refermait la fenêtre de son côté sans qu'Angular en sache rien, et la condition du
     * {@code @if} la rouvrait dans la foulée. Le bouton de fermeture restait donc sans effet.
     * Avec une liaison à deux sens, c'est le même état des deux côtés.</p>
     */
    visible = false;

    /** Ouverture demandée depuis le bandeau ou l'écran de licence, alors qu'elle court encore. */
    private ouvertureForcee = false;

    peutInstaller = false;

    ngOnInit(): void {
        // Même liste que le contrôleur, l'entrée de menu et l'écran de licence : quatre endroits
        // qui doivent dire la même chose, sans quoi le menu proposerait une fenêtre que le serveur
        // refuserait.
        this.peutInstaller = hasAnyPermission(
            ['SUPER_ADMIN', 'licence-write', 'CONFIG_GLOBAL_MANAGE', 'config-global-write']);

        this.service.etat$.subscribe((etat) => {
            this.etat = etat;
            this.visible = this.doitSAfficher;
        });

        // Ouverture demandée depuis l'écran « Licence de l'installation ». L'état est relu au
        // passage : celui qui vient renouveler doit voir l'échéance réelle, pas celle de sa
        // connexion.
        this.service.ouvertureDemandee$.subscribe(() => {
            this.erreur = '';
            this.forcerOuverture();
            this.service.charger().subscribe({ error: () => undefined });
        });
        // Une lecture en échec — service indisponible — laisse l'application se comporter comme
        // avant : mieux vaut un écran utilisable qu'une fenêtre bloquante due à une panne.
        this.service.charger().subscribe({ error: () => undefined });
    }

    /**
     * La fenêtre ne s'ouvre d'elle-même que faute de licence installée. Une licence expirée la
     * déclenchait aussi, et l'utilisateur ne pouvait plus rien consulter derrière.
     */
    get doitSAfficher(): boolean {
        return !!this.etat && (this.etat.statut === 'ABSENTE' || this.ouvertureForcee);
    }

    /**
     * La fenêtre s'ouvre désormais aussi sur demande, licence en cours — pour renouveler avant le
     * terme, ou remplacer un essai. « Licence expirée » y serait faux.
     */
    get titre(): string {
        if (this.etat?.statut === 'ABSENTE') return 'Activer QualiSira';
        if (this.etat?.statut === 'EXPIREE') return 'Licence expirée';
        return this.etat?.type === 'ESSAI' ? 'Essai gratuit en cours' : 'Licence de cette installation';
    }

    /** Infermable tant que rien n'est posé : il n'y a rien d'autre à faire dans l'application. */
    get estFermable(): boolean {
        return this.ouvertureForcee;
    }

    /** Un bandeau dès que la licence appelle une décision : essai en cours, terme proche, ou échu. */
    get bandeau(): boolean {
        if (!this.etat || this.ouvertureForcee || this.etat.statut === 'ABSENTE') return false;
        return this.etat.statut === 'EXPIREE'
            || this.etat.type === 'ESSAI'
            || this.etat.joursRestants <= 30;
    }

    get bandeauClasse(): string {
        if (this.etat?.statut === 'EXPIREE') return 'bg-red-50 text-red-900';
        // Orange pour l'essai comme pour un terme proche : dans les deux cas une échéance
        // approche et appelle une décision. Le bleu, lui, se lit comme une information sans
        // conséquence, et l'essai s'arrêtait sans que personne ne s'en soit soucié.
        return 'bg-orange-50 text-orange-900';
    }

    get bandeauIcone(): string {
        if (this.etat?.statut === 'EXPIREE') return 'pi pi-times-circle';
        return this.etat?.type === 'ESSAI' ? 'pi pi-clock' : 'pi pi-exclamation-triangle';
    }

    forcerOuverture(): void {
        this.ouvertureForcee = true;
        this.visible = true;
    }

    /**
     * Appelée par {@code onHide} : la fenêtre est déjà refermée côté PrimeNG, on remet l'état
     * d'accord avec elle. Sans licence posée, elle n'est pas fermable et ne passe jamais ici.
     */
    fermer(): void {
        this.ouvertureForcee = false;
        this.erreur = '';
        this.visible = this.doitSAfficher;
    }

    installer(): void {
        this.erreur = '';
        this.enCours = true;
        this.service.installer(this.licence).subscribe({
            next: (etat) => {
                this.enCours = false;
                this.ouvertureForcee = false;
                this.visible = this.doitSAfficher;
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

    deconnexionDemandee(): void {
        // Sans licence et sans droit de l'installer, il n'y a rien à faire ici : la déconnexion
        // est la seule issue offerte, plutôt qu'une fenêtre dont on ne sort pas.
        window.location.href = '/auth/login';
    }
}
