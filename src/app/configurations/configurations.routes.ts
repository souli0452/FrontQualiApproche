import { Routes } from '@angular/router';
import { permissionGuard } from '../core/guards/permission.guard';
import { ParametresComponent } from './pages/parametres/parametres.component';
import { 
    CircuitsListeComponent, 
    CircuitDetailPageComponent, 
    WorkflowEditorComponent, 
    WorkflowStepTemplateComponent, 
    EmailTemplateWorkflowComponent 
} from '@features/workflow';
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
                component: CircuitsListeComponent,
                title: 'Circuits de validation',
                canActivate: [permissionGuard],
                data: { permissions: ['workflow-read', 'workflow-write'] }
            },
            {
                path: 'circuits/detail/:id',
                component: CircuitDetailPageComponent,
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
