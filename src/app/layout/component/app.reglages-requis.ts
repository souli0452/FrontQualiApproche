import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Observable, Subject, forkJoin, of, takeUntil } from 'rxjs';

import { NgPrimeModule } from '../../../prime-ng.module';
import { LicenceService } from '../../services/licence.service';
import { Parametre, ParametreService } from '../../services/parametre.service';
import { hasAnyPermission } from '../../utils/auth/auth-utils';
import { showToast, StatusEnum } from '../../utils/global/global-utils';

/** Réglage exigé au lancement, avec ce qu'il faut pour le créer s'il manque. */
interface ReglageRequis {
    cle: string;
    libelle: string;
    description: string;
    type: 'TEXTE' | 'COURRIEL';
}

/**
 * Réglages exigés au lancement de la plateforme : le responsable qualité.
 *
 * <p>Son adresse commande la mise en copie de <b>tout</b> courriel de non-conformité. Non renseignée,
 * les messages partent sans copie et rien ne le montre à l'écran : le défaut ne se découvrirait qu'en
 * cherchant pourquoi le responsable qualité n'a jamais rien reçu. D'où ce dialogue, qui ne se ferme
 * qu'une fois les deux réglages saisis.</p>
 *
 * <p>Présenté au seul administrateur : lui seul peut y répondre. Bloquer un agent sur un formulaire
 * que le serveur lui refuserait l'enfermerait sans recours.</p>
 */
@Component({
    selector: 'app-reglages-requis',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, NgPrimeModule],
    providers: [MessageService],
    template: `
        <p-toast></p-toast>
        <p-dialog [(visible)]="ouvert" [modal]="true" [closable]="false" [draggable]="false"
                  [resizable]="false" [closeOnEscape]="false" [style]="{ width: '34rem' }"
                  maskStyleClass="qs-mask-flou"
                  header="Responsable qualité à renseigner">
            <div class="flex flex-col gap-4">
                <p-message severity="warn" [closable]="false">
                    Tant que ces informations manquent, le responsable qualité n'est pas mis en copie
                    des courriels de non-conformité.
                </p-message>

                <p class="text-sm text-gray-600 m-0">
                    Le responsable qualité pilote le traitement des non-conformités : il est mis en
                    copie de tous les courriels qui en sortent. Ces deux informations sont
                    modifiables ensuite depuis les réglages de l'organisation.
                </p>

                <form [formGroup]="formulaire" class="flex flex-col gap-4">
                    <div class="flex flex-col gap-1">
                        <label for="rqNom" class="font-semibold text-sm">
                            Nom complet <span class="text-red-500">*</span>
                        </label>
                        <input pInputText id="rqNom" formControlName="nom" class="w-full"
                               placeholder="Prénom et nom du responsable qualité" autocomplete="off" />
                    </div>

                    <div class="flex flex-col gap-1">
                        <label for="rqEmail" class="font-semibold text-sm">
                            Adresse de courriel <span class="text-red-500">*</span>
                        </label>
                        <input pInputText id="rqEmail" formControlName="email" class="w-full"
                               placeholder="responsable.qualite@exemple.fr" autocomplete="off" />
                        @if (formulaire.get('email')?.touched && formulaire.get('email')?.invalid) {
                            <small class="text-red-500">
                                Une adresse valide est attendue : c'est à elle que partiront les copies.
                            </small>
                        }
                    </div>
                </form>
            </div>

            <ng-template pTemplate="footer">
                <!-- Aucun bouton d'abandon : une copie manquante ne se voit nulle part ensuite. -->
                <p-button label="Enregistrer" icon="pi pi-check" [loading]="enregistrement"
                          [disabled]="formulaire.invalid" (click)="enregistrer()"></p-button>
            </ng-template>
        </p-dialog>
    `
})
export class AppReglagesRequis implements OnInit, OnDestroy {

    private static readonly REQUIS: ReglageRequis[] = [
        {
            cle: 'RESPONSABLE_QUALITE_NOM', libelle: 'Nom du responsable qualité',
            description: 'Nom complet du responsable qualité de l\'organisation.', type: 'TEXTE'
        },
        {
            cle: 'RESPONSABLE_QUALITE_EMAIL', libelle: 'Courriel du responsable qualité',
            description: 'Mis en copie des courriels de non-conformité.', type: 'COURRIEL'
        }
    ];

    ouvert = false;
    enregistrement = false;
    formulaire: FormGroup;

    private existants: Record<string, Parametre> = {};
    /** Les réglages ont déjà été lus : l'état de licence est réémis, la vérification ne l'est pas. */
    private verifie = false;
    private readonly destroy$ = new Subject<boolean>();

    constructor(
        private readonly fb: FormBuilder,
        private readonly service: ParametreService,
        private readonly messageService: MessageService,
        private readonly licence: LicenceService
    ) {
        this.formulaire = this.fb.group({
            nom: ['', [Validators.required]],
            email: ['', [Validators.required, Validators.email]]
        });
    }

    /**
     * Le dialogue attend que la licence ouvre les actions, puis s'impose aussitôt.
     *
     * <p>Le responsable qualité s'écrit dans les réglages de l'organisation, et la passerelle
     * refuse toute écriture tant que la licence n'est pas valide — {@code /parametres} ne figure
     * pas parmi ses exemptions, contrairement à l'installation d'une licence. Présenter cette
     * saisie en premier sur une installation sans licence enfermerait donc l'administrateur devant
     * une fenêtre infermable dont l'unique bouton répond 402.</p>
     *
     * <p>Les deux fenêtres s'ouvraient jusqu'ici en même temps, l'une par-dessus l'autre, et
     * l'enregistrement du responsable qualité échouait sans que la raison soit lisible. Elles se
     * suivent désormais : la licence d'abord si rien n'est posé — il n'y a de toute façon rien
     * d'autre à faire —, le responsable qualité dès que les actions sont ouvertes, avant toute
     * autre configuration.</p>
     */
    ngOnInit(): void {
        if (!hasAnyPermission(['config-global-write', 'CONFIG_GLOBAL_MANAGE'])) {
            return;
        }

        this.licence.etat$.pipe(takeUntil(this.destroy$)).subscribe((etat) => {
            if (!etat?.actionsOuvertes || this.verifie) {
                return;
            }
            // Une seule fois : l'état de licence est réémis à chaque installation ou
            // renouvellement, et rouvrir le dialogue après coup reviendrait à redemander une
            // saisie déjà faite.
            this.verifie = true;
            this.verifier();
        });

        // Le dialogue de licence charge le même état de son côté ; ne pas s'y fier permet à ce
        // composant de rester juste s'il venait à être monté seul.
        if (!this.licence.etat) {
            this.licence.charger().subscribe({ error: () => undefined });
        }
    }

    ngOnDestroy(): void {
        this.destroy$.next(true);
        this.destroy$.complete();
    }

    /**
     * Lit les réglages et ouvre le dialogue si l'un des deux manque.
     *
     * <p>Une lecture impossible ne déclenche rien : mieux vaut ne pas exiger une saisie qu'on ne
     * pourrait de toute façon pas enregistrer, et le référentiel indisponible se signale ailleurs.</p>
     */
    private verifier(): void {
        this.service.liste().pipe(takeUntil(this.destroy$)).subscribe({
            next: (reglages) => {
                this.existants = {};
                (reglages ?? []).forEach(reglage => this.existants[reglage.cle] = reglage);

                const nom = this.valeurDe('RESPONSABLE_QUALITE_NOM');
                const email = this.valeurDe('RESPONSABLE_QUALITE_EMAIL');
                if (nom && email) {
                    return;
                }

                // Ce qui est déjà là est repris : l'administrateur n'a que le champ manquant à saisir.
                this.formulaire.patchValue({ nom: nom ?? '', email: email ?? '' });
                this.ouvert = true;
            },
            error: () => { /* Rien à exiger si les réglages ne sont pas lisibles. */ }
        });
    }

    enregistrer(): void {
        if (this.formulaire.invalid) {
            this.formulaire.markAllAsTouched();
            return;
        }

        const saisie = this.formulaire.getRawValue();
        const valeurs: Record<string, string> = {
            RESPONSABLE_QUALITE_NOM: String(saisie.nom).trim(),
            RESPONSABLE_QUALITE_EMAIL: String(saisie.email).trim()
        };

        this.enregistrement = true;
        forkJoin(AppReglagesRequis.REQUIS.map(requis => this.ecrire(requis, valeurs[requis.cle])))
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: () => {
                    this.enregistrement = false;
                    this.ouvert = false;
                    this.messageService.add({
                        severity: 'success', summary: 'Enregistré',
                        detail: 'Responsable qualité enregistré. Il sera en copie des courriels de '
                            + 'non-conformité.'
                    });
                },
                error: (error) => {
                    this.enregistrement = false;
                    showToast(StatusEnum.error, error.status, 'Enregistrement impossible',
                        this.messageService, error);
                }
            });
    }

    /** Modifie le réglage s'il existe, le crée sinon — la base peut n'avoir jamais été semée. */
    private ecrire(requis: ReglageRequis, valeur: string): Observable<Parametre | null> {
        const existant = this.existants[requis.cle];
        if (existant?.id) {
            return this.service.modifier(existant.id, { ...existant, valeur });
        }
        if (existant) {
            // Réglage connu mais sans identifiant : rien de sûr à écrire, et rien à créer non plus.
            return of(null);
        }
        return this.service.creer({
            cle: requis.cle,
            libelle: requis.libelle,
            description: requis.description,
            type: requis.type,
            valeur,
            // Lu par les services pour composer les courriels, hors de toute connexion utilisateur.
            lisibleSansHabilitation: true
        });
    }

    private valeurDe(cle: string): string | null {
        const valeur = this.existants[cle]?.valeur;
        return valeur && valeur.trim().length > 0 ? valeur.trim() : null;
    }
}
