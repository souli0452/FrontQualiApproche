import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Subject, takeUntil } from 'rxjs';

import { NgPrimeModule } from '@prime-ng';
import { NatureParametre, Parametre, ParametreService } from '../../services/parametre.service';
import { showToast, StatusEnum } from '../../../utils/global/global-utils';
import { hasAnyPermission } from '@core/auth/auth-utils';
import { LicenceOuverteDirective } from '@shared/licence/licence-ouverte.directive';

/** Nature d'un réglage, avec ce qu'elle change pour la saisie. */
interface Nature {
    label: string;
    value: NatureParametre;
    aide: string;
}

/**
 * Réglages de l'organisation : contact, logo, responsable qualité, et ce que l'organisation y ajoute.
 * Premier onglet du centre de configurations (/configurations/config-systeme).
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

    private videEnNull(valeur: unknown): string | null {
        const texte = valeur === null || valeur === undefined ? '' : String(valeur).trim();
        return texte.length > 0 ? texte : null;
    }
}
