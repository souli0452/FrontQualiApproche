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
                path: 'programme/:id/plan',
                loadComponent: () => import('./pages/plan-audit/plan-audit.component').then(m => m.PlanAuditComponent),
                title: "Plan d'audit"
            },
            {
                path: 'programme/:id/signatures',
                loadComponent: () => import('./pages/signatures/signatures.component').then(m => m.AuditSignaturesComponent),
                title: 'Signatures'
            },
            {
                path: 'programme/:id/rapport',
                loadComponent: () => import('./pages/rapport/rapport-audit.component').then(m => m.RapportAuditComponent),
                title: "Rapport d'audit"
            },
            {
                path: 'programme/:id/resultats-rqapbf',
                loadComponent: () => import('./pages/resultats-rqapbf/resultats-rqapbf.component').then(m => m.ResultatsRQAPBFComponent),
                title: 'Résultats RQAP-BF'
            },
            {
                path: 'programme/:id/evaluation-auditeurs',
                loadComponent: () => import('./pages/evaluation-auditeurs/evaluation-auditeurs.component').then(m => m.EvaluationAuditeursComponent),
                title: 'Évaluation des auditeurs'
            },
            {
                path: 'suivi',
                loadComponent: () => import('./pages/suivi/suivi-programme.component').then(m => m.SuiviProgrammeComponent),
                title: 'Suivi du programme'
            },
            {
                path: 'programme/:id/evaluation-rqapbf',
                loadComponent: () => import('./pages/evaluation-rqapbf/evaluation-rqapbf.component').then(m => m.EvaluationRQAPBFComponent),
                title: 'Évaluation RQAP-BF'
            },
            {
                path: 'constatations',
                loadComponent: () => import('./pages/constatations/constatations.component').then(m => m.AuditConstatationsComponent),
                title: 'Constatations'
            },
            {
                path: 'checklists',
                loadComponent: () => import('./pages/checklists/checklists.component').then(m => m.AuditChecklistsComponent),
                title: 'Checklists'
            },
            {
                path: 'auditeurs',
                loadComponent: () => import('./pages/auditeurs/auditeurs.component').then(m => m.AuditAuditeursComponent),
                title: 'Auditeurs'
            },
            {
                path: 'referentiel-rqapbf',
                loadComponent: () => import('./pages/referentiel-rqapbf/referentiel-rqapbf.component').then(m => m.ReferentielRQAPBFComponent),
                title: 'Référentiel RQAP-BF'
            }
        ]
    }
];
