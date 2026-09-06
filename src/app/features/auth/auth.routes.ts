import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { ResetPasswordComponent } from './pages/reset-password/reset-password.component';
import { EmailVerificationComponent } from './pages/email-verification/email-verification.component';
import { AccessDeniedComponent } from './pages/access-denied/access-denied.component';

export const authRoutes: Routes = [
    { path: 'login', component: LoginComponent, title: 'Connexion' },
    { path: 'reset-password', component: ResetPasswordComponent, title: 'Réinitialisation du mot de passe' },
    { path: 'verify-email', component: EmailVerificationComponent, title: 'Vérification de l\'email' },
    { path: 'access', component: AccessDeniedComponent, title: 'Accès refusé' },
    { path: 'access-denied', component: AccessDeniedComponent, title: 'Accès refusé' }
];

export default authRoutes;
