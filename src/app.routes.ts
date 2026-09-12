import { Routes } from '@angular/router';
import { AppLayout } from '@core/layout/component/app.layout';
import { AuthGuard } from '@core/guards/auth.guard';
import { LoginComponent } from '@features/auth/pages/login/login.component';
import { EmailVerificationComponent } from '@features/auth/pages/email-verification/email-verification.component';
import { ResetPasswordComponent } from '@features/auth/pages/reset-password/reset-password.component';
import { Dashboard } from '@features/dashboard/pages/dashboard.component';
import { Notfound } from '@features/errors/pages/notfound/notfound.component';

export const appRoutes: Routes = [
    { path: 'login', component: LoginComponent, title: 'Connexion' },
    { path: 'notfound', component: Notfound },
    { path: 'verify-email', component: EmailVerificationComponent, title: 'Vérification email' },
    { path: 'reset-password', component: ResetPasswordComponent, title: 'Réinitialisation mot de passe' },
    { path: 'auth', loadChildren: () => import('./app/features/auth/auth.routes') },
    {
        path: '',
        component: AppLayout,
        canActivate: [AuthGuard],
        children: [
            { path: '', component: Dashboard, title: 'Tableau de bord' },
            { path: '', loadChildren: () => import('./app/pages/pages.routes') }
        ]
    },
    { path: '**', redirectTo: '/notfound' },
];
