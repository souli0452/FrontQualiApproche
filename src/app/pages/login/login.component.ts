import {Component, OnInit} from '@angular/core';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {AuthService} from "../../services/auth-services/auth.service";
import {KcLoginRequest} from "../../models";
import { MessageService } from 'primeng/api';
import {takeUntil} from 'rxjs/operators';
import { ActivatedRoute } from '@angular/router';
import {Subject} from 'rxjs';
import { ToastModule } from 'primeng/toast';
import { CommonModule } from '@angular/common';
import { NgPrimeModule } from '../../../prime-ng.module';

@Component({
    selector: 'app-login',
    standalone: true,
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss'],
    imports: [CommonModule, FormsModule, ReactiveFormsModule, NgPrimeModule]
})
export class LoginComponent implements OnInit{
    destroy$: Subject<boolean> = new Subject<boolean>();
    loginForm: FormGroup;
    errorMessage: string | null = null;
    resetForm: FormGroup;
    showResetDialog = false;
    isLoading = false;
    isResetScreen = false;
    isConfirmationScreen: boolean = false;

    ngOnInit() {
        if (this.authService.getAccessToken()) {
            this.router.navigate(['/']);
        }
    }


    constructor(private fb: FormBuilder, private authService: AuthService,
                private router: Router
                ,private route: ActivatedRoute,
                private messageService: MessageService) {
        this.loginForm = this.fb.group({
            username: ['', Validators.required],
            password: ['', Validators.required],
            refreshToken: [''],
        });

        this.resetForm = this.fb.group({
            email: ['', [Validators.required, Validators.email]],
        });
    }

    onLogin() {
        if (this.loginForm.valid) {
            this.isLoading = true;
            const credentials: KcLoginRequest = this.loginForm.value;

            this.authService.login(credentials).subscribe({
                next: (response: any) => {
                    const { data } = response;
                    console.log('Réponse:', response);
                    this.authService.setTokens(data.access_token, data.refresh_token);
                    this.router.navigate(['/']);
                    this.isLoading = false;
                },
                error: (err) => {
                    console.log('Erreur:', err);
                    this.isLoading = false;

                    if (err.status === 403) {
                        const { data } = err.error;

                        if (data) {
                            console.log(data.emailVerified, data.enabled, data.temporaryPwd);
                            if (!data.emailVerified) {
                                this.errorMessage = 'Votre adresse e-mail n\'a pas été vérifiée. Veuillez vérifier votre e-mail avant de continuer.';
                            } else if (!data.enabled) {
                                this.errorMessage = 'Votre compte a été désactivé. Veuillez contacter l\'administrateur.';
                            } else if (data.temporaryPwd) {
                                this.errorMessage = 'Votre mot de passe est temporaire. Veuillez le réinitialiser pour continuer.';
                                this.router.navigate(['/reset-password'], {
                                    queryParams: { username: credentials.username, oldpwd:credentials.password },
                                });
                            }
                        } else {
                            this.errorMessage = err.error.message || 'Une erreur est survenue.';
                        }
                    } else {
                        this.errorMessage = 'Nom d’utilisateur ou mot de passe incorrect.';
                    }
                },
            });
        } else {
            this.errorMessage = 'Veuillez remplir tous les champs correctement avant de continuer.';
        }
    }


    initiatePasswordReset(): void {
        if (this.resetForm.valid) {
            const email = this.resetForm.get('email')?.value;
            this.authService.initiatePasswordReset(email).subscribe({
                next: () => {
                    this.isResetScreen = false;
                    this.isConfirmationScreen = true;
                },
                error: (err) => {
                    const errorMessage =
                        err.status === 404
                            ? 'Utilisateur introuvable.'
                            : 'Une erreur est survenue. Veuillez réessayer.';
                    this.errorMessage = errorMessage;
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Erreur',
                        detail: errorMessage,
                    });
                },
            });
        }
    }

    toggleScreen() {
        this.isResetScreen = true;
        this.isConfirmationScreen = false;
        this.errorMessage = null;
    }

    retour(){
        this.isResetScreen = false;
        this.isConfirmationScreen = false;
        this.errorMessage = null;
    }

}
