import { Routes } from '@angular/router';
import { AuditLayoutComponent } from './layout/audit-layout.component';

export const AUDIT_ROUTES: Routes = [
    {
        path: '',
        component: AuditLayoutComponent,
        children: [
            { path: '', redirectTo: 'vue-ensemble', pathMatch: 'full' },
            {
                path: 'vue-ensemble',
                loadComponent: () => import('./pages/vue-ensemble/vue-ensemble.component').then(m => m.AuditVueEnsembleComponent),
                title: "Vue d'ensemble — Audits"
            },
            {
                path: 'programme',
                loadComponent: () => import('./pages/programme-audit/programme-audit.component').then(m => m.ProgrammeAuditComponent),
                title: "Programme d'audit"
            },
            {
                path: 'programme/create',
                loadComponent: () => import('./pages/audit-form/audit-form.component').then(m => m.AuditFormComponent),
                title: 'Planifier un audit'
            },
            {
                path: 'programme/edit/:id',
                loadComponent: () => import('./pages/audit-form/audit-form.component').then(m => m.AuditFormComponent),
                title: "Modifier l'audit"
            },
            {
                path: 'programme/:id',
                loadComponent: () => import('./pages/audit-detail/audit-detail.component').then(m => m.AuditDetailComponent),
                title: "Détail de l'audit"
            },
            {
                path: 'constatations',
                loadComponent: () => import('./pages/constatations/constatations.component').then(m => m.AuditConstatationsComponent),
                title: 'Constatations'
            }
        ]
    }
];
