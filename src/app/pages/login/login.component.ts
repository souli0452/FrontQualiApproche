import {Component, OnInit} from '@angular/core';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {AuthService} from "../../services/auth-services/auth.service";
import { MessageService } from 'primeng/api';
import { ActivatedRoute } from '@angular/router';
import {Subject} from 'rxjs';
import { CommonModule } from '@angular/common';
import { NgPrimeModule } from '../../../prime-ng.module';
import { USER_PROFILE_KEY, USER_STRUCTURE_KEY } from '../../utils/global/global-utils';
import { isUserInRoles } from '../../utils/auth/auth-utils';
import { StructureService } from '../parametrages/structure/structure-service/structure-service';
import { AuthData, LoginRequest } from '../../models/auth.model';
import { ApiItemResponse } from '../../models/response.model';

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
    user!: any;
    userCurrentUser!: AuthData;


    constructor(private fb: FormBuilder, private authService: AuthService,
                private router: Router
                ,private route: ActivatedRoute,
                private structureService: StructureService,
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

    ngOnInit() {
        this.authService.getMe().subscribe({
            next: (response) => {
                // response.data contient l'objet complet avec { user, permissions, ... }
                if (response) {
                    // On vérifie directement le rôle sans passer connectedUser car la fonction lit en mémoire
                    if (isUserInRoles(['SUPER_ADMIN'])) {

                        this.router.navigate(['/configurations']).then(success => {
                            console.log('Navigation réussie ?', success);
                        }).catch(err => {
                            console.error('Erreur de navigation :', err);
                        });

                        // this.router.navigate(['/configurations']);
                        // console.log("Rediriger vers configurations");
                    } else {
                        console.log("Je suis ici 2");
                        this.router.navigate(['/non-conformite/vue-ensemble']);
                    }
                }
            },
            error: (err) => {
                console.log('Aucune session active ou cookie expiré/absent.', err);
                // Optionnel : redirection vers le login si la session a expiré
                // this.router.navigate(['/login']);
            }
        });
    }

    onLogin() {
        if (this.loginForm.valid) {
            this.isLoading = true;
            const credentials: LoginRequest = this.loginForm.value;

            this.authService.login(credentials).subscribe({
                next: (response: ApiItemResponse<AuthData>) => {
                    this.isLoading = false;
                    
                    // Récupération directe des données utilisateur renvoyées par le login
                    const userCurrentUser = response.data?.user;

                    if (userCurrentUser) {
                        
                        // Récupération des rôles (si tu en as encore besoin pour les permissions)
                        // this.authService.getUserRoles(userCurrentUser.userId!).subscribe((roles) => {
                        //     localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(roles.body));
                        // });

                        // Vérification de la structure affectée à l'utilisateur
                        if (userCurrentUser.structure) {
                            this.fetchStucture(userCurrentUser.structure);
                        } else {
                            this.messageService.add({ 
                                severity: 'info', 
                                summary: 'AVERTISSEMENT', 
                                detail: 'Votre utilisateur est mal configuré (aucune structure associée)', 
                                life: 3000 
                            });
                            this.navigateAfterLogin();
                        }
                    } else {
                        this.messageService.add({ 
                            severity: 'error', 
                            summary: 'Erreur', 
                            detail: 'Impossible de récupérer les informations de session.', 
                            life: 3000 
                        });
                    }
                },
                error: (err) => {
                    this.isLoading = false;
                    let detailMessage = '';

                    if (err.status === 403) {
                        // Gestion fine des comptes non vérifiés, désactivés ou pwd temporaires
                        const data = err.error?.data;
                        if (data) {
                            if (!data.emailVerified) {
                                detailMessage = "Votre adresse e-mail n'a pas été vérifiée.";
                            } else if (!data.enabled) {
                                detailMessage = "Votre compte a été désactivé.";
                            } else if (data.temporaryPwd) {
                                detailMessage = "Mot de passe temporaire. Redirection...";
                                this.router.navigate(['/reset-password'], { 
                                    queryParams: { username: credentials.username, oldpwd: credentials.password } 
                                });
                            }
                        } else {
                            detailMessage = err.error?.message || 'Une erreur est survenue.';
                        }
                    } else {
                        detailMessage = 'Nom d’utilisateur ou mot de passe incorrect.';
                    }

                    // Affichage du Toast d'erreur
                    this.messageService.add({ severity: 'error', summary: 'Erreur', detail: detailMessage, life: 5000 });
                }
            });
        } else {
            this.errorMessage = 'Veuillez remplir tous les champs correctement avant de continuer.';
        }
    }
    
    fetchStucture(structureId: string) {
        if (!structureId) {
            this.navigateAfterLogin();
            return;
        }

        this.structureService.getByStructureId(structureId).subscribe({
            next: (structure) => {
                if (structure && structure.data) {
                    // Stockage en sessionStorage plutôt qu'en localStorage
                    sessionStorage.setItem(USER_STRUCTURE_KEY, JSON.stringify(structure.data));
                }
                this.navigateAfterLogin();
            },
            error: (err) => {
                console.error('Erreur lors du chargement de la structure:', err);
                this.messageService.add({ 
                    severity: 'warn', 
                    summary: 'Avertissement', 
                    detail: 'Impossible de charger la structure. Vérifiez votre configuration.', 
                    life: 3000 
                });
                this.navigateAfterLogin();
            }
        });
    }

    navigateAfterLogin() {
        this.router.navigate(['/non-conformite/vue-ensemble']);
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