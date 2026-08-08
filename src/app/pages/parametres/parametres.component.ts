import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Subject, takeUntil } from 'rxjs';

import { NgPrimeModule } from '../../../prime-ng.module';
import { NatureParametre, Parametre, ParametreService } from '../../services/parametre.service';
import { hasAnyPermission } from '../../utils/auth/auth-utils';
import { showToast, StatusEnum } from '../../utils/global/global-utils';
import { LicenceOuverteDirective } from '../../shared/licence/licence-ouverte.directive';

/** Nature d'un réglage, avec ce qu'elle change pour la saisie. */
interface Nature {
    label: string;
    value: NatureParametre;
    aide: string;
}

/**
 * Réglages de l'organisation : contact, logo, responsable qualité, et ce que l'organisation y ajoute.
 *
 * <p>Remplace l'écran de configuration globale, qui portait trois champs figés dans le code — nom et
 * courriel du responsable qualité, délai de rappel. Ces trois-là sont désormais trois réglages parmi
 * d'autres : en ajouter un ne demande plus de livrer une version.</p>
 *
 * <p>La <b>clé</b> est le nom sous lequel le serveur désigne un réglage : le pied des courriels
 * demande {@code CONTACT_EMAIL}, la copie au responsable qualité demande
 * {@code RESPONSABLE_QUALITE_EMAIL}. La renommer romprait en silence ce qui la lit, aussi n'est-elle
 * saisissable qu'à la création — le serveur refuse d'ailleurs un renommage.</p>
 *
 * <p>L'écran ne crée ni ne supprime : seules les clés que le code cite sont lues, et elles sont
 * semées au démarrage du référentiel. En ajouter une autre n'aurait aucun effet — rien ne la lirait.
 * En supprimer une en priverait ce qui la lit, sans moyen de la recréer ici : elle ne reviendrait
 * qu'au redémarrage du référentiel, et vide. Il n'y a donc ici qu'à renseigner des valeurs.</p>
 *
 * <p>Écrit à la main plutôt que confié au tableau générique : celui-ci propose d'office l'ajout, et
 * applique les mêmes règles de saisie en création et en modification — il n'aurait pas pu figer la
 * clé.</p>
 */
@Component({
    selector: 'app-parametres',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, NgPrimeModule, LicenceOuverteDirective],
    providers: [MessageService],
    templateUrl: './parametres.component.html'
})
export class ParametresComponent implements OnInit, OnDestroy {

    readonly natures: Nature[] = [
        { label: 'Texte', value: 'TEXTE', aide: 'Texte libre.' },
        { label: 'Courriel', value: 'COURRIEL', aide: 'Adresse de courriel.' },
        { label: 'Téléphone', value: 'TELEPHONE', aide: 'Numéro affiché tel quel.' },
        { label: 'Adresse web', value: 'URL', aide: 'Sans protocole, https:// est ajouté dans les courriels.' },
        {
            label: 'Image', value: 'IMAGE',
            aide: 'Adresse de l\'image. Elle doit être accessible depuis l\'extérieur, sinon elle '
                + 'apparaîtra vide chez le destinataire d\'un courriel.'
        },
        { label: 'Adresse postale', value: 'ADRESSE', aide: 'Plusieurs lignes acceptées.' },
        { label: 'Nombre', value: 'NOMBRE', aide: 'Nombre entier. Une valeur non numérique est refusée.' }
    ];

    reglages: Parametre[] = [];
    recherche = '';
    chargement = true;
    enregistrement = false;
    peutEcrire = false;

    dialogueOuvert = false;
    reglageEnCours: Parametre | null = null;
    formulaire: FormGroup;

    private readonly destroy$ = new Subject<boolean>();

    constructor(
        private readonly fb: FormBuilder,
        private readonly service: ParametreService,
        private readonly messageService: MessageService
    ) {
        this.formulaire = this.fb.group({
            cle: ['', [Validators.required]],
            libelle: ['', [Validators.required]],
            type: ['TEXTE' as NatureParametre, [Validators.required]],
            valeur: [''],
            description: ['']
        });
    }

    ngOnInit(): void {
        this.peutEcrire = hasAnyPermission(['config-global-write', 'CONFIG_GLOBAL_MANAGE']);
        this.charger();
    }

    ngOnDestroy(): void {
        this.destroy$.next(true);
        this.destroy$.complete();
    }

    charger(): void {
        this.chargement = true;
        this.service.liste(this.recherche).pipe(takeUntil(this.destroy$)).subscribe({
            next: (reglages) => {
                this.reglages = reglages ?? [];
                this.chargement = false;
            },
            error: (error) => {
                this.chargement = false;
                showToast(StatusEnum.error, error.status, 'Chargement des réglages impossible',
                    this.messageService, error);
            }
        });
    }

    // ------------------------------------------------------------------ dialogue

    ouvrirModification(reglage: Parametre): void {
        this.reglageEnCours = reglage;
        this.formulaire.reset({
            cle: reglage.cle,
            libelle: reglage.libelle,
            type: reglage.type ?? 'TEXTE',
            valeur: reglage.valeur ?? '',
            description: reglage.description ?? ''
        });
        // La clé désigne le réglage pour le code qui le lit : elle se voit, elle ne se modifie pas.
        this.formulaire.get('cle')?.disable();
        this.dialogueOuvert = true;
    }

    enregistrer(): void {
        if (this.formulaire.invalid || !this.reglageEnCours?.id) {
            this.formulaire.markAllAsTouched();
            return;
        }

        // `getRawValue` et non `value` : la clé est désactivée en modification, et le serveur exige
        // qu'elle lui soit renvoyée telle quelle.
        const saisie = this.formulaire.getRawValue();
        const reglage: Parametre = {
            ...saisie,
            valeur: this.videEnNull(saisie.valeur),
            description: this.videEnNull(saisie.description),
            // Tout réglage administré ici sert à composer des courriels, et ces envois se font hors
            // de toute connexion utilisateur. Le poser d'office évite de demander à l'administrateur
            // de trancher une question technique — et un réglage créé ici sans ce drapeau resterait
            // invisible au pied de page, sans que rien ne le dise.
            lisibleSansHabilitation: true
        };

        this.enregistrement = true;
        this.service.modifier(this.reglageEnCours.id, reglage)
            .pipe(takeUntil(this.destroy$)).subscribe({
            next: () => {
                this.enregistrement = false;
                this.dialogueOuvert = false;
                this.messageService.add({
                    severity: 'success', summary: 'Enregistré',
                    detail: 'Réglage enregistré. Il est repris dans les courriels dans les minutes '
                        + 'qui suivent.'
                });
                this.charger();
            },
            error: (error) => {
                this.enregistrement = false;
                showToast(StatusEnum.error, error.status, 'Enregistrement impossible',
                    this.messageService, error);
            }
        });
    }

    // ------------------------------------------------------------------ affichage

    get natureRetenue(): Nature | undefined {
        return this.natures.find(nature => nature.value === this.formulaire.get('type')?.value);
    }

    libelleNature(type?: NatureParametre): string {
        return this.natures.find(nature => nature.value === type)?.label ?? 'Texte';
    }

    estUneImage(reglage: Parametre): boolean {
        return reglage.type === 'IMAGE' && !!reglage.valeur?.trim();
    }

    estRenseigne(reglage: Parametre): boolean {
        return !!reglage.valeur && reglage.valeur.trim().length > 0;
    }

    /** Une chaîne vide vaut « non renseigné » : le serveur ignore un réglage sans valeur. */
    private videEnNull(valeur: unknown): string | null {
        const texte = valeur === null || valeur === undefined ? '' : String(valeur).trim();
        return texte.length > 0 ? texte : null;
    }
}
