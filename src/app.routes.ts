import { Routes } from '@angular/router';
import { AppLayout } from '@core';
import { Dashboard } from '@features/dashboard';
import { NotFoundComponent as Notfound } from '@features/errors';
import { AuthGuard } from '@core';
import { LoginComponent, ResetPasswordComponent, EmailVerificationComponent } from '@features/auth';

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
