import { Routes } from '@angular/router';
import { AppLayout } from './app/layout/component/app.layout';
import { Dashboard } from './app/pages/dashboard/dashboard';
import { Documentation } from './app/pages/documentation/documentation';
import { Landing } from './app/pages/landing/landing';
import { Notfound } from './app/pages/notfound/notfound';
import { AuthGuard } from './app/components/auth/auth.guard';
import { LoginComponent } from './app/pages/login/login.component';
import { ResetPasswordComponent } from './app/pages/reset-password/reset-password.component';
import { EmailVerificationComponent } from './app/pages/email-verification/email-verification.component';

export const appRoutes: Routes = [
    { path: 'login', component: LoginComponent },
    { path: 'landing', component: Landing },
    { path: 'notfound', component: Notfound },
    { path: 'verify-email', component: EmailVerificationComponent },
    { path: 'reset-password', component: ResetPasswordComponent },
    { path: 'auth', loadChildren: () => import('./app/pages/auth/auth.routes') },
    {
        path: '',
        component: AppLayout,
        canActivate: [AuthGuard],
        children: [
            { path: '', component: Dashboard, title: 'Tableau de bord' },

            { path: 'documentation', component: Documentation, title: 'Documentation' },
            {
                path: 'nc', loadChildren: () => import('./app/pages/nc/nc.module').then(m => m.NcModule)
            },
            {
                path: 'traitement-action', loadChildren: () => import('./app/pages/proc-non-conformite/traitement-actions/traitement-action.module').then(m => m.TraitementActionModule)
            },
            { path: '', loadChildren: () => import('./app/pages/pages.routes') }
        ]
    },
    { path: '**', redirectTo: '/notfound' },

];
