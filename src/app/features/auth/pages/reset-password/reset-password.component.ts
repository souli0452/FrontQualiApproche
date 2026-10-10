import { Component,OnDestroy,OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { CommonModule } from '@angular/common';
import { NgPrimeModule } from '../../../../../prime-ng.module';
import { AuthService } from '@core/auth/auth.service';
import { IdentifiantsTemporaires, MotDePasseTemporaireService } from '@core/auth/mot-de-passe-temporaire.service';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule, NgPrimeModule]
})

export class ResetPasswordComponent implements OnInit, OnDestroy {
    destroy$: Subject<boolean> = new Subject<boolean>();
    newPasswordForm!: FormGroup;
    errorMessage = '';
    isTemporaryPasswordReset: boolean = false;
    /** Identifiants confiés par l'écran de connexion ; absents quand on arrive par le lien du courriel. */
    private identifiantsTemporaires: IdentifiantsTemporaires | null = null;

    constructor(
        private router: Router,
        private fb: FormBuilder,
        private route: ActivatedRoute,
        private authService: AuthService,
        private motDePasseTemporaire: MotDePasseTemporaireService
    ) {}

    ngOnInit(): void {
        const token = this.route.snapshot.queryParamMap.get('token');
        const userId = this.route.snapshot.queryParamMap.get('userId');

        // Deux chemins mènent ici : le lien du courriel (jeton et identifiant dans l'URL, à usage
        // unique côté serveur) et la connexion avec un mot de passe temporaire, dont l'ancien mot
        // de passe est passé en mémoire et jamais par l'URL.
        this.identifiantsTemporaires = this.motDePasseTemporaire.reprendre();
        this.isTemporaryPasswordReset = !!this.identifiantsTemporaires && !token && !userId;
        if (!token && !userId && !this.identifiantsTemporaires) {
            this.errorMessage = 'Session expirée : reconnectez-vous avec votre mot de passe temporaire.';
        }

        this.newPasswordForm = this.fb.group(
            {
                password: ['', [Validators.required, Validators.minLength(8)]],
                confirmPassword: ['', [Validators.required]],
            },
            { validators: this.passwordMatchValidator }
        );
    }

    onResetPassword(): void {
        if (!this.newPasswordForm.valid) {
            console.error('Formulaire invalide');
            return;
        }

        const password = this.newPasswordForm.get('password')?.value;

        if (this.isTemporaryPasswordReset && this.identifiantsTemporaires) {
            const { username, motDePasse } = this.identifiantsTemporaires;
            this.handleTemporaryPasswordReset(username, password, motDePasse);
            return;
        }

        const token = this.route.snapshot.queryParamMap.get('token');
        const userId = this.route.snapshot.queryParamMap.get('userId');
        if (!token || !userId) {
            this.errorMessage = 'Session expirée : reconnectez-vous avec votre mot de passe temporaire.';
            return;
        }
        this.handleTokenPasswordReset(userId, password, token);
    }

    private handleTemporaryPasswordReset(username: string, password: string, oldPassword: string): void {
        this.authService.updateTemporaryPassword(username, password, oldPassword).pipe(
            takeUntil(this.destroy$)
        ).subscribe({
            next: () => {
                // Le backend a mis à jour le mot de passe.
                // On redirige vers la page de connexion pour qu'il se connecte avec son nouveau mot de passe.
                this.router.navigate(['/login']);
            },
            error: (error) => {
                this.handleError(error);
            }
        });
    }


    private handleTokenPasswordReset(userId: string, password: string, token: string): void {
        this.authService.reinitializePwd(userId, password, token).pipe(
            takeUntil(this.destroy$)
        ).subscribe({
            next: () => {
                this.router.navigate(['/login']);
            },
            error: (error) => {
                this.handleError(error);
            }
        });
    }

    private handleError(error: any): void {
        if (error.status === 400) {
            this.errorMessage = 'Les informations fournies sont incorrectes.';
        } else if (error.status === 404) {
            this.errorMessage = 'Token invalide ou expiré.';
        } else {
            this.errorMessage = 'Une erreur est survenue. Veuillez réessayer.';
        }
        console.error('Erreur : ', this.errorMessage);
    }

    passwordMatchValidator(group: FormGroup) {
        const password = group.get('password')?.value;
        const confirmPassword = group.get('confirmPassword')?.value;
        return password === confirmPassword ? null : { passwordMismatch: true };
    }

    ngOnDestroy(): void {
        this.destroy$.next(true);
        this.destroy$.complete();
    }
}
