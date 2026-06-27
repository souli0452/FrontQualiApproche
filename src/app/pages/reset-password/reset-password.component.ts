import { Component,OnDestroy,OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {AuthService} from "../../services/auth-services/auth.service";
import { Router } from '@angular/router';
import {takeUntil} from 'rxjs/operators';
import {Subject} from 'rxjs';
import { CommonModule } from '@angular/common';
import { NgPrimeModule } from '../../../prime-ng.module';

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

    constructor(
        private router: Router,
        private fb: FormBuilder,
        private route: ActivatedRoute,
        private authService: AuthService
    ) {}

    ngOnInit(): void {
        const token = this.route.snapshot.queryParamMap.get('token');
        const userId = this.route.snapshot.queryParamMap.get('userId');
        const username = this.route.snapshot.queryParamMap.get('username');

        this.isTemporaryPasswordReset = !!username && !token && !userId;

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

        // const password = this.newPasswordForm.get('password')?.value;

        // if (this.isTemporaryPasswordReset) {
        //     const username = this.route.snapshot.queryParamMap.get('username');
        //     const oldPassword = this.route.snapshot.queryParamMap.get('oldpwd');
        //     if (username && oldPassword) {
        //         console.log(username,oldPassword)
        //         this.handleTemporaryPasswordReset(username, password, oldPassword);
        //     } else {
        //         this.errorMessage = 'Les informations sont incorrectes.';
        //     }
        // } else {
        //     const token = this.authService.getAccessToken();
        //     const user = this.authService.getUser();
        //     console.log(user)
        //     if (!token || !user) {
        //         console.error('Token ou userId manquant');
        //         return;
        //     }

        //     this.handleTokenPasswordReset(user.userId!, password, token);
        // }
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
