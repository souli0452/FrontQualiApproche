import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, UntypedFormBuilder, UntypedFormGroup, ValidationErrors, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Subject, takeUntil } from 'rxjs';

import { NgPrimeModule } from '../../../../../prime-ng.module';
import { HeaderPage } from '../../../../shared/header-page/header-page';
import { AuthService } from '@core/auth/auth.service';
import { currentUserState } from '@core/auth/auth.state';
import { getCurrentUserStructure } from '@core/auth/auth-utils';
import { UserResponse } from '@features/auth/models/auth.model';
import { Structure } from '@features/organigramme/models/structure.model';

/** Même forme que celle qu'accepte le back : indicatif, espaces et ponctuation usuelle. */
const FORME_TELEPHONE = /^[+()./\-\s0-9]{6,25}$/;

/**
 * Longueur minimale du mot de passe.
 *
 * <p>Alignée sur l'écran de réinitialisation, qui exige huit caractères : deux seuils différents
 * selon la porte empruntée feraient refuser ici un mot de passe accepté là, sans que rien ne
 * l'explique. La règle affichée et celle qui valide sortent de cette même constante, pour qu'elles
 * ne puissent pas diverger.</p>
 */
const LONGUEUR_MINIMALE = 8;

@Component({
    selector: 'app-profil',
    standalone: true,
    imports: [CommonModule, NgPrimeModule, HeaderPage],
    providers: [MessageService],
    templateUrl: './profil.component.html',
    styleUrl: './profil.component.scss'
})
export class ProfilComponent implements OnInit, OnDestroy {
    user: UserResponse | null = null;
    userStructure: Structure | null = null;

    identiteForm!: UntypedFormGroup;
    motDePasseForm!: UntypedFormGroup;

    enregistrementIdentite = false;
    enregistrementMotDePasse = false;

    private destroy$ = new Subject<boolean>();

    constructor(
        private fb: UntypedFormBuilder,
        private authService: AuthService,
        private messageService: MessageService
    ) {}

    breadcrumbs = [
        { label: 'Tableau de bord', url: '' },
        { label: 'Mon profil', url: '/profil' },
    ];

    ngOnInit() {
        this.construireFormulaires();

        // L'état en mémoire répond tout de suite : l'écran s'affiche rempli plutôt que vide le
        // temps d'un aller-retour. La relecture qui suit corrige au besoin — le téléphone, en
        // particulier, peut avoir été changé depuis l'ouverture de session.
        this.appliquer(currentUserState.value as UserResponse | null);
        this.userStructure = getCurrentUserStructure();

        this.authService.getMe()
            .pipe(takeUntil(this.destroy$))
            .subscribe((reponse) => this.appliquer((reponse?.data ?? null) as unknown as UserResponse | null));
    }

    ngOnDestroy() {
        this.destroy$.next(true);
        this.destroy$.complete();
    }

    // ----------------------------------------------------------------- affichage

    get initiales(): string {
        const prenom = this.user?.firstName?.trim()?.charAt(0) ?? '';
        const nom = this.user?.lastName?.trim()?.charAt(0) ?? '';
        return (prenom + nom).toUpperCase() || '?';
    }

    get nomComplet(): string {
        const complet = `${this.user?.firstName ?? ''} ${this.user?.lastName ?? ''}`.trim();
        return complet || (this.user?.username ?? 'Utilisateur');
    }

    /** Les rôles applicatifs, sous une forme lisible : SUPER_ADMIN devient « Super admin ». */
    get roles(): string[] {
        const bruts = this.user?.appRoles?.length ? this.user.appRoles : (this.user?.roles ?? []);
        return bruts.map((role) => {
            const mots = role.replace(/[_-]+/g, ' ').toLowerCase().trim();
            return mots.charAt(0).toUpperCase() + mots.slice(1);
        });
    }

    /** Vrai tant que l'utilisateur n'a rien changé : le bouton d'enregistrement reste alors inerte. */
    get identiteInchangee(): boolean {
        return this.identiteForm.pristine;
    }

    // ----------------------------------------------------------------- identité

    enregistrerIdentite() {
        if (this.identiteForm.invalid) {
            this.identiteForm.markAllAsTouched();
            return;
        }

        this.enregistrementIdentite = true;
        const valeurs = this.identiteForm.getRawValue();

        this.authService.updateMyProfile({
            firstName: valeurs.firstName?.trim(),
            lastName: valeurs.lastName?.trim(),
            phoneNumber: valeurs.phoneNumber?.trim() || null
        })
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (reponse) => {
                    this.enregistrementIdentite = false;
                    this.appliquer(reponse?.data ?? null);
                    this.identiteForm.markAsPristine();
                    this.succes('Vos informations ont été enregistrées.');
                },
                error: (erreur) => {
                    this.enregistrementIdentite = false;
                    this.echec(erreur, "Vos informations n'ont pas pu être enregistrées.");
                }
            });
    }

    annulerIdentite() {
        this.appliquer(this.user);
    }

    // ----------------------------------------------------------------- mot de passe

    /** Règles affichées et vérifiées en direct, plutôt qu'un refus après coup. */
    get reglesMotDePasse(): { libelle: string; satisfaite: boolean }[] {
        const nouveau: string = this.motDePasseForm?.get('nouveau')?.value ?? '';
        return [
            { libelle: '8 caractères au minimum', satisfaite: nouveau.length >= LONGUEUR_MINIMALE },
            { libelle: 'une minuscule et une majuscule', satisfaite: /[a-z]/.test(nouveau) && /[A-Z]/.test(nouveau) },
            { libelle: 'un chiffre', satisfaite: /\d/.test(nouveau) },
            { libelle: 'un caractère spécial', satisfaite: /[^A-Za-z0-9]/.test(nouveau) }
        ];
    }

    changerMotDePasse() {
        if (this.motDePasseForm.invalid) {
            this.motDePasseForm.markAllAsTouched();
            return;
        }

        const username = this.user?.username;
        if (!username) {
            this.messageService.add({
                severity: 'error',
                summary: 'Compte introuvable',
                detail: "Votre identifiant n'a pas pu être lu. Reconnectez-vous, puis réessayez."
            });
            return;
        }

        this.enregistrementMotDePasse = true;
        const valeurs = this.motDePasseForm.getRawValue();

        this.authService.updateTemporaryPassword(username, valeurs.nouveau, valeurs.actuel)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: () => {
                    this.enregistrementMotDePasse = false;
                    this.motDePasseForm.reset();
                    this.succes('Votre mot de passe a été modifié.');
                },
                error: (erreur) => {
                    this.enregistrementMotDePasse = false;
                    // Le back répond 401 sur un ancien mot de passe erroné : c'est le cas courant,
                    // et le dire précisément évite de faire chercher une panne à l'utilisateur.
                    const message = erreur?.status === 401
                        ? 'Votre mot de passe actuel est incorrect.'
                        : "Votre mot de passe n'a pas pu être modifié.";
                    this.echec(erreur, message);
                }
            });
    }

    // ----------------------------------------------------------------- interne

    private construireFormulaires() {
        this.identiteForm = this.fb.group({
            firstName: [null, [Validators.required, Validators.maxLength(60)]],
            lastName: [null, [Validators.required, Validators.maxLength(60)]],
            phoneNumber: [null, [Validators.pattern(FORME_TELEPHONE)]]
        });

        this.motDePasseForm = this.fb.group(
            {
                actuel: [null, [Validators.required]],
                nouveau: [null, [Validators.required, Validators.minLength(LONGUEUR_MINIMALE), this.robustesse]],
                confirmation: [null, [Validators.required]]
            },
            { validators: [this.concordance, this.nouveauteDuMotDePasse] }
        );
    }

    private appliquer(utilisateur: UserResponse | null) {
        if (!utilisateur) {
            return;
        }
        this.user = utilisateur;
        this.identiteForm.reset({
            firstName: utilisateur.firstName ?? null,
            lastName: utilisateur.lastName ?? null,
            phoneNumber: utilisateur.phoneNumber ?? null
        });
    }

    /** Les quatre règles annoncées à l'écran, réunies en une validation. */
    private robustesse(controle: AbstractControl): ValidationErrors | null {
        const valeur: string = controle.value ?? '';
        if (!valeur) {
            return null;
        }
        const satisfaite = /[a-z]/.test(valeur) && /[A-Z]/.test(valeur)
            && /\d/.test(valeur) && /[^A-Za-z0-9]/.test(valeur);
        return satisfaite ? null : { robustesse: true };
    }

    private concordance(groupe: AbstractControl): ValidationErrors | null {
        const nouveau = groupe.get('nouveau')?.value;
        const confirmation = groupe.get('confirmation')?.value;
        if (!nouveau || !confirmation) {
            return null;
        }
        return nouveau === confirmation ? null : { discordance: true };
    }

    /** Un « changement » qui reconduit le même mot de passe n'en est pas un. */
    private nouveauteDuMotDePasse(groupe: AbstractControl): ValidationErrors | null {
        const actuel = groupe.get('actuel')?.value;
        const nouveau = groupe.get('nouveau')?.value;
        if (!actuel || !nouveau) {
            return null;
        }
        return actuel === nouveau ? { inchange: true } : null;
    }

    private succes(detail: string) {
        this.messageService.add({ severity: 'success', summary: 'Enregistré', detail });
    }

    private echec(erreur: any, repli: string) {
        // Le back motive ses refus (prénom manquant, téléphone malformé) : reprendre sa phrase
        // vaut mieux qu'un message générique qui laisserait chercher lequel des champs pèche.
        const detail = erreur?.error?.message || erreur?.error?.detail || repli;
        this.messageService.add({ severity: 'error', summary: 'Échec', detail });
    }
}
