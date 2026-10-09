import { Routes } from '@angular/router';
import { permissionGuard } from '../core/guards/permission.guard';
import { ParametresComponent } from './pages/parametres/parametres.component';
import { WorkflowStepTemplateComponent } from '@features/workflow/referentiel/etapes/workflow-step-template.component';
import { EmailTemplateWorkflowComponent } from '@features/workflow/referentiel/modeles-email/email-template.component';
import { CircuitsListeComponent } from '@features/workflow/pages/circuits/circuits-liste.component';
import { CircuitDetailPageComponent} from '@features/workflow/pages/circuits/circuit-detail-page.component';
import { WorkflowEditorComponent } from '@features/workflow/pages/editor/workflow-editor.component';
import { ConfigurationsComponent } from './configurations.component';

export const CONFIGURATIONS_ROUTES: Routes = [
    {
        path: '',
        component: ConfigurationsComponent,
        canActivate: [permissionGuard],
        data: {
            breadcrumb: 'Configurations Globales',
            permissions: [
                'config-global-read', 'config-global-write',
                'CONFIG_READ', 'CONFIG_GLOBAL_MANAGE',
                'workflow-read', 'workflow-write'
            ]
        },
        children: [
            { path: '', redirectTo: 'config-systeme', pathMatch: 'full' },
            {
                path: 'config-systeme',
                component: ParametresComponent,
                title: "Réglages de l'organisation",
                canActivate: [permissionGuard],
                data: { permissions: ['config-global-read', 'config-global-write', 'CONFIG_READ', 'CONFIG_GLOBAL_MANAGE'] }
            },
            {
                path: 'circuits',
                loadChildren: () => import('@features/workflow/pages/circuits/circuits-liste.component').then(m => m.CircuitsListeComponent),
                title: 'Circuits de validation',
                canActivate: [permissionGuard],
                data: { permissions: ['workflow-read', 'workflow-write'] }
            },
            {
                path: 'circuits/detail/:id',
                loadChildren: () => import('@features/workflow/pages/circuits/circuit-detail-page.component').then(m => m.CircuitDetailPageComponent),
                title: 'Détail du circuit',
                canActivate: [permissionGuard],
                data: { permissions: ['workflow-read', 'workflow-write'] }
            },
            {
                path: 'circuits/edition/:id',
                component: WorkflowEditorComponent,
                title: 'Édition du circuit',
                canActivate: [permissionGuard],
                data: { permissions: ['workflow-write'] }
            },
            {
                path: 'etapes-circuit',
                component: WorkflowStepTemplateComponent,
                title: "Catalogue des Étapes",
                canActivate: [permissionGuard],
                data: { breadcrumb: "Catalogue d'Étapes", permissions: ['workflow-write'] }
            },
            {
                path: 'modeles-email',
                component: EmailTemplateWorkflowComponent,
                title: 'Modèles d’e-mail',
                canActivate: [permissionGuard],
                data: { permissions: ['workflow-write'] }
            }
        ]
    }
];
