import {Component, OnInit} from '@angular/core';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {AuthService} from "../../services/auth-services/auth.service";
import { KcLoginRequest, KcUser } from '../../models';
import { MessageService } from 'primeng/api';
import { ActivatedRoute } from '@angular/router';
import {Subject} from 'rxjs';
import { CommonModule } from '@angular/common';
import { NgPrimeModule } from '../../../prime-ng.module';
import { isUserInRoles, USER_PROFILE_KEY, USER_STRUCTURE_KEY } from '../../utils';
import { StructureService } from '../parametrages/structure/structure-service/structure-service';

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
    userCurrentUser!: KcUser;


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
        if (this.authService.getAccessToken()) {
            if(isUserInRoles(['SUPER_ADMIN'])){
                this.router.navigate(['/non-conformite/vue-ensemble']);
            }else {
                this.router.navigate(['/non-conformite/vue-ensemble']);
            }

        }
    }

    onLogin() {
        if (this.loginForm.valid) {
            this.isLoading = true;
            const credentials: KcLoginRequest = this.loginForm.value;

            this.authService.login(credentials).subscribe({
                next: (response: any) => {
                    const { data } = response.data;
                    // console.log("Données reçues ZOOOO : ", data);

                    this.isLoading = false;
                    this.authService.setTokens(data.access_token, data.refresh_token);
                    this.authService.setUser(data.user);

                    this.user = this.authService.getUser()!;

                    this.authService.getUserRoles(data!.user.userId!).subscribe((roles) => {
                        localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(roles.body));
                    });
                    this.authService.getUserById(data!.user.userId!).subscribe((value) => {
                        this.userCurrentUser = value.body!;
                        console.log("Données reçues DDDDDDD : ", this.userCurrentUser);
                        
                        if (this.userCurrentUser as any) {
                            this.fetchStucture((this.userCurrentUser as any).data.structure);
                        } else {
                            this.messageService.add({ severity: 'info', summary: 'AVERTISSEMENT', detail: 'Votre utilisateur est mal configuré', life: 3000 });
                            this.navigateAfterLogin();
                        }
                    });
                },
                // Dans onLogin(), au niveau de la gestion d'erreur
                error: (err) => {
                    this.isLoading = false;
                    let detailMessage = '';

                    if (err.status === 403) {
                        const { data } = err.error;
                        if (data) {
                            if (!data.emailVerified) {
                                detailMessage = "Votre adresse e-mail n'a pas été vérifiée.";
                            } else if (!data.enabled) {
                                detailMessage = "Votre compte a été désactivé.";
                            } else if (data.temporaryPwd) {
                                detailMessage = "Mot de passe temporaire. Redirection...";
                                this.router.navigate(['/reset-password'], { queryParams: { username: credentials.username, oldpwd:credentials.password } });
                            }
                        } else {
                            detailMessage = err.error.message || 'Une erreur est survenue.';
                        }
                    } else {
                        detailMessage = 'Nom d’utilisateur ou mot de passe incorrect.';
                    }

                    // Affichage du Toast
                    this.messageService.add({ severity: 'error', summary: 'Erreur', detail: detailMessage, life: 5000 });
                }
            });
        } else {
            this.errorMessage = 'Veuillez remplir tous les champs correctement avant de continuer.';
        }
    }
    fetchStucture(structureId: string) {
        this.structureService.getByStructureId(structureId).subscribe({
            next: (structure) => {
                localStorage.setItem(USER_STRUCTURE_KEY, JSON.stringify(structure.data));
                this.navigateAfterLogin();
            },
            error: (err) => {
                this.messageService.add({ severity: 'warn', summary: 'Avertissement', detail: 'Impossible de charger la structure. Vérifiez votre configuration.', life: 3000 });
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
