import { Routes } from '@angular/router';
import { Documentation } from './documentation/documentation';
import { Crud } from './crud/crud';
import { Empty } from './empty/empty';
import { FormationComponent } from './formation/formation';
import { FournisseurComponent } from './fournisseur/fournisseur';
import { PrestataireComponent } from './prestataire/prestataire';
import { ProduitComponent } from './produit/produit';
import { ActionCorrectivePreventiveComponent } from './action-corrective-preventive/action-corrective-preventive';
import { ReclamationComponent } from './reclamation/reclamation';
import { RisqueComponent } from './risque/risque';
import { AuditeComponent } from './audite/audite';
import { reglementationComponent } from './reglementation/reglementation';
import { CritereEvaluationComponent } from './critere-evaluation/critere-evaluation';
import { ModuleAbonnement, TypeStructure } from '../enums/enums';
import { KcUserComponent } from './kc-user/kc-user.component';
import { ProfilComponent } from './profil/profil.component';
import { ConfigGComponent } from './config-g/config-g.component';
import { SearchResultsComponent } from './recherche/search-results';
import { RoleComponent } from './role/role-table/role.component';
import { RoleDetailComponent } from './role/role-detail/role-detail.component';
import { NonConformiteLayoutComponent } from '../layout/non-conformite/non-conformite';
import { NcVueEnsembleComponent } from './module-nc/nc-vue-ensemble/vue-ensemble';
import { NCAffectationActionComponent } from './module-nc/nc-affectation-action/nc-affectation-action';
import { AnalyseReceptionComponent } from './module-nc/nc-analyse-reception/nc-analyse-reception';
import { NCSuiviComponent } from './module-nc/nc-suivi/nc-suivi';
import { ParametragesComponent } from './parametrages/parametrages.component';
import { NcPublieesComponent } from './module-nc/nc-publiees/nc-publiees';
import { AnalyseValidationComponent } from './module-nc/nc-analyse-validation/nc-analyse-validation';
import { TraitementGlobalComponent } from './module-nc/nc-action-a-mener/nc-traitement-global';
import { ActionNonConformiteComponent } from './parametrages/parametrage-non-conformite/action-nc/action';
import { NiveauNonConformiteComponent } from './parametrages/parametrage-non-conformite/niveau-nc/niveau';
import { SourceNonConformite } from './parametrages/parametrage-non-conformite/origine-nc/origine';
import { CategorieProcessusComponent } from './parametrages/categorie-processus/categorie-processus';
import { StructureComponent } from './parametrages/structure/structure-view/structure.component';
import { NcComposeComponent } from './module-nc/nc-compose/nc-compose.component';
import { ValidationPilote } from './module-nc/nc-validation-pilote/nc-validation-pilote';
import { AnalyseClotureComponent } from './module-nc/nc-analyse-cloture/nc-analyse-cloture';
import { QmsDocumentComponent } from './module-gestion-documentaire/qms-document/qms-document.component';
import { QmsDocumentCreateComponent } from './module-gestion-documentaire/qms-document-create/qms-document-create.component';
import { QmsDocumentTypeComponent } from './module-gestion-documentaire/qms-document-type/qms-document-type.component';
import { WorkflowStepTemplateComponent } from './module-gestion-documentaire/workflow-step-template/workflow-step-template.component';
import { QmsVueEnsembleComponent } from './module-gestion-documentaire/qms-vue-ensemble/qms-vue-ensemble.component';
import { QmsDocumentsPartagesComponent } from './module-gestion-documentaire/qms-documents-partages/qms-documents-partages.component';
import { QmsDemandesComponent } from './module-gestion-documentaire/qms-demandes/qms-demandes.component';
import { QmsDemandeCreateComponent } from './module-gestion-documentaire/qms-demande-create/qms-demande-create.component';
import { GestionDocumentaireLayoutComponent } from '../layout/gestion-documentaire/gestion-documentaire';
import { DomaineApplicationComponent } from './parametrage-document/domaine-application/domaine-application.component';
import { PrioriteDocumentComponent } from './parametrage-document/priorite-document/priorite-document.component';
import { NiveauConfidentialiteComponent } from './parametrage-document/niveau-confidentialite/niveau-confidentialite.component';
import { EmailTemplateWorkflowComponent } from './configuration-workflow/email-template/email-template.component';
import { WorkflowEditorComponent } from './configuration-workflow/circuits/workflow-editor.component';
import { permissionGuard } from '../components/auth/permission.guard';

// Les permissions déclarées ici reprennent celles du menu (app.menu.ts) : une entrée masquée
// correspond à une route fermée. Les noms en majuscules sont les anciennes permissions, encore
// acceptées le temps de la migration — mêmes couples que côté back.
//
// Angular n'hérite pas le `data` d'une route parente porteuse de composant : chaque route
// restreinte déclare donc le sien. Le garde posé sur un parent couvre en revanche tous ses
// enfants, et ceux-ci ne font qu'affiner.
export default [
    { path: 'recherche', component: SearchResultsComponent, title: 'Résultats de recherche' },
    { path: 'documentation', component: Documentation },
    { path: 'crud', component: Crud },
    {
        path: 'formation', component: FormationComponent, title: 'Formations',
        canActivate: [permissionGuard],
        data: { permissions: ['formation-read', 'formation-write', 'RESOURCES_READ'], module: ModuleAbonnement.FORMATION }
    },
    {
        path: 'fournisseur', component: FournisseurComponent, title: 'Liste des Fournisseurs',
        canActivate: [permissionGuard],
        data: { permissions: ['fournisseur-read', 'fournisseur-write', 'RESOURCES_READ'] }
    },
    {
        path: 'prestataire', component: PrestataireComponent, title: 'Liste des Prestataires',
        canActivate: [permissionGuard],
        data: { permissions: ['prestataire-read', 'prestataire-write', 'RESOURCES_READ'] }
    },
    {
        path: 'produit', component: ProduitComponent, title: 'Liste des Produits',
        canActivate: [permissionGuard],
        data: { permissions: ['produit-read', 'produit-write', 'RESOURCES_READ'] }
    },
    {
        path: 'action-corrective-preventive', component: ActionCorrectivePreventiveComponent,
        title: 'Actions Correctives et Préventives',
        canActivate: [permissionGuard],
        data: { permissions: ['action-corrective-read', 'action-read', 'ACTIONS_READ'], module: ModuleAbonnement.NON_CONFORMITE }
    },
    {
        path: 'reclamation', component: ReclamationComponent, title: 'Liste des Réclamations',
        canActivate: [permissionGuard],
        data: { permissions: ['reclamation-read', 'reclamation-write', 'RECLAMATION_READ'], module: ModuleAbonnement.RECLAMATION }
    },
    {
        path: 'risque', component: RisqueComponent, title: 'Liste des Risques',
        canActivate: [permissionGuard],
        data: { permissions: ['risque-read', 'risque-write', 'RISQUE_READ'], module: ModuleAbonnement.RISQUE }
    },
    {
        path: 'audite', component: AuditeComponent, title: 'Liste des Audites',
        canActivate: [permissionGuard],
        data: { permissions: ['AUDITE_READ'], module: ModuleAbonnement.AUDIT }
    },
    {
        path: 'reglementation', component: reglementationComponent, title: 'Liste des Réglementations',
        canActivate: [permissionGuard],
        data: { permissions: ['reglementation-read', 'reglementation-write', 'REGLEMENTATION_READ'], module: ModuleAbonnement.REGLEMENTATION }
    },
    {
        path: 'critere-evaluation', component: CritereEvaluationComponent, title: 'Critères d\'évaluation',
        canActivate: [permissionGuard],
        data: { permissions: ['exigence-read', 'exigence-write', 'CRITERE_EVAL_READ'], module: ModuleAbonnement.EVALUATION }
    },

    // ------------------------------------------------------------------ adresses à plat
    //
    // Le menu remanié désigne ces écrans à la racine plutôt que sous `configurations` ou
    // `parametrage-document`. Les adresses imbriquées sont conservées telles quelles plus bas :
    // elles restent atteignables, et des liens comme des favoris pointent encore dessus.
    //
    // Chacune reçoit la garde et les permissions de son équivalent imbriqué — une route ouverte
    // ici alors que son entrée de menu est masquée ailleurs s'ouvrirait à la simple saisie de
    // l'URL.
    {
        path: 'utilisateurs', component: KcUserComponent, title: 'Gestion des utilisateurs',
        canActivate: [permissionGuard],
        data: { permissions: ['MANAGE_USER'] }
    },
    {
        path: 'roles', component: RoleComponent, title: 'Gestion des rôles',
        canActivate: [permissionGuard],
        data: { permissions: ['ROLE_MANAGE'] }
    },
    {
        path: 'roles/:id', component: RoleDetailComponent, title: 'Détail Rôle',
        canActivate: [permissionGuard],
        data: { permissions: ['ROLE_MANAGE'] }
    },
    {
        path: 'origine-non-conformite', component: SourceNonConformite, title: 'Origine de Non-Conformité',
        canActivate: [permissionGuard],
        data: { permissions: ['type-nc-read', 'type-nc-write', 'NC_ORIGIN_MANAGE'], module: ModuleAbonnement.NON_CONFORMITE }
    },
    {
        path: 'niveau-non-conformite', component: NiveauNonConformiteComponent, title: 'Niveau de Non-Conformité',
        canActivate: [permissionGuard],
        data: { permissions: ['niveau-nc-read', 'niveau-nc-write', 'NC_LEVEL_MANAGE'], module: ModuleAbonnement.NON_CONFORMITE }
    },
    // `type-processus` figure déjà plus bas à la racine : ne pas le redéclarer ici, la première
    // déclaration l'emporterait et la seconde deviendrait du code mort.
    {
        path: 'direction', component: StructureComponent, title: 'Liste des Directions',
        canActivate: [permissionGuard],
        data: {
            typeStructure: TypeStructure.DIRECTION,
            permissions: ['structure-read', 'structure-write', 'STRUCT_MANAGE', 'SERVICE_MANAGE']
        }
    },
    {
        path: 'service', component: StructureComponent, title: 'Services',
        canActivate: [permissionGuard],
        data: {
            typeStructure: TypeStructure.SERVICE,
            permissions: ['structure-read', 'structure-write', 'STRUCT_MANAGE', 'SERVICE_MANAGE']
        }
    },
    {
        path: 'type-document',
        component: QmsDocumentTypeComponent,
        title: 'Types de documents',
        canActivate: [permissionGuard],
        data: {
            breadcrumb: 'Types de Document QMS',
            permissions: ['document-type-read', 'document-type-write'],
            module: ModuleAbonnement.DOCUMENTAIRE
        }
    },
    {
        path: 'etapes-gestion-documentaire',
        component: WorkflowStepTemplateComponent,
        title: 'Étapes',
        canActivate: [permissionGuard],
        data: { breadcrumb: "Catalogue d'Étapes", permissions: ['workflow-read', 'workflow-write'] }
    },
    // Les deux écrans de circuits propres au documentaire (`workflow-config`, `workflow-detail`)
    // n'existent plus : l'éditeur unique couvre les trois types de ressource. L'adresse est
    // conservée — le menu et d'anciens liens la désignent — mais elle mène désormais à cet
    // éditeur, et la consultation d'un circuit s'y fait sans écran séparé.
    { path: 'workflows-gestion-documentaire', redirectTo: '/configurations/circuits', pathMatch: 'full' },
    { path: 'workflows-gestion-documentaire/detail/:id', redirectTo: '/configurations/circuits', pathMatch: 'full' },
    {
        path: 'configurations',
        component: ParametragesComponent,
        canActivate: [permissionGuard],
        // Le parent laisse passer qui détient l'une quelconque des configurations ; chaque enfant
        // restreint ensuite à la sienne.
        data: {
            breadcrumb: 'Configurations Globales',
            permissions: [
                'config-global-read', 'config-global-write', 'structure-read', 'structure-write',
                'type-processus-read', 'type-processus-write', 'type-nc-read', 'type-nc-write',
                'niveau-nc-read', 'niveau-nc-write', 'action-read', 'action-write',
                'CONFIG_READ', 'CONFIG_GLOBAL_MANAGE', 'MANAGE_USER', 'ROLE_MANAGE',
                'STRUCT_MANAGE', 'SERVICE_MANAGE', 'TYPE_PROC_MANAGE', 'NC_ORIGIN_MANAGE',
                'NC_LEVEL_MANAGE', 'ACTION_TYPE_MANAGE',
                // Sans ces deux-là, le garde du parent fermerait la porte à qui ne détient que la
                // configuration des circuits — et ses onglets avec.
                'workflow-read', 'workflow-write'
            ]
        },
        children: [
            { path: '', redirectTo: 'config-systeme', pathMatch: 'full' },
            {
                path: 'config-systeme', component: ConfigGComponent, title: 'Configuration Système',
                canActivate: [permissionGuard],
                data: { permissions: ['config-global-read', 'config-global-write', 'CONFIG_READ', 'CONFIG_GLOBAL_MANAGE'] }
            },
            {
                path: 'utilisateurs', component: KcUserComponent, title: 'Utilisateurs',
                canActivate: [permissionGuard],
                data: { permissions: ['MANAGE_USER'] }
            },
            {
                path: 'roles', component: RoleComponent, title: 'Rôles',
                canActivate: [permissionGuard],
                data: { permissions: ['ROLE_MANAGE'] }
            },
            {
                path: 'roles/:id', component: RoleDetailComponent, title: 'Détail Rôle',
                canActivate: [permissionGuard],
                data: { permissions: ['ROLE_MANAGE'] }
            },
            {
                path: 'type-processus', component: CategorieProcessusComponent, title: 'Processus',
                canActivate: [permissionGuard],
                data: { permissions: ['type-processus-read', 'type-processus-write', 'TYPE_PROC_MANAGE', 'CONFIG_READ'] }
            },
            {
                path: 'type-nc', component: SourceNonConformite, title: 'Types NC',
                canActivate: [permissionGuard],
                data: { permissions: ['type-nc-read', 'type-nc-write', 'NC_ORIGIN_MANAGE'], module: ModuleAbonnement.NON_CONFORMITE }
            },
            {
                path: 'niveau-nc', component: NiveauNonConformiteComponent, title: 'Niveaux NC',
                canActivate: [permissionGuard],
                data: { permissions: ['niveau-nc-read', 'niveau-nc-write', 'NC_LEVEL_MANAGE'], module: ModuleAbonnement.NON_CONFORMITE }
            },
            {
                path: 'type-action', component: ActionNonConformiteComponent, title: 'Actions',
                canActivate: [permissionGuard],
                data: { permissions: ['action-read', 'action-write', 'ACTION_TYPE_MANAGE'], module: ModuleAbonnement.NON_CONFORMITE }
            },
            {
                path: 'direction', component: StructureComponent, title: 'Liste des Directions',
                canActivate: [permissionGuard],
                data: {
                    typeStructure: TypeStructure.DIRECTION,
                    permissions: ['structure-read', 'structure-write', 'STRUCT_MANAGE', 'SERVICE_MANAGE']
                }
            },
            {
                path: 'service', component: StructureComponent, title: 'Services',
                canActivate: [permissionGuard],
                data: {
                    typeStructure: TypeStructure.SERVICE,
                    permissions: ['structure-read', 'structure-write', 'STRUCT_MANAGE', 'SERVICE_MANAGE']
                }
            },

            // Configuration des circuits de validation, désormais servie par les onglets du centre
            // de configuration. Les trois écrans y sont repris ensemble : n'y déplacer que les
            // circuits aurait laissé le catalogue d'étapes et les modèles d'e-mail sans aucun
            // chemin depuis le menu.
            {
                path: 'circuits', component: WorkflowEditorComponent, title: 'Circuits de validation',
                canActivate: [permissionGuard],
                data: { permissions: ['workflow-read', 'workflow-write'] }
            },
            {
                path: 'etapes-circuit', component: WorkflowStepTemplateComponent, title: "Catalogue des Étapes",
                canActivate: [permissionGuard],
                data: { breadcrumb: "Catalogue d'Étapes", permissions: ['workflow-write'] }
            },
            {
                path: 'modeles-email', component: EmailTemplateWorkflowComponent, title: 'Modèles d’e-mail',
                canActivate: [permissionGuard],
                data: { permissions: ['workflow-write'] }
            },
        ]
    },

    // Paramétrage documentaire : trois écrans, trois pages.
    //
    // Ils étaient réunis sous une barre d'onglets, qui n'apportait rien ici — chacun est un
    // référentiel complet, avec sa liste, sa saisie et ses conseils, et l'on n'y navigue pas d'un
    // onglet à l'autre en cours de travail. L'ancienne adresse redirige vers les types de
    // document, pour les liens et les favoris.
    { path: 'parametrage-document', redirectTo: '/parametrage-document/types', pathMatch: 'full' },
    {
        path: 'parametrage-document/types',
        component: QmsDocumentTypeComponent,
        title: 'Types de documents',
        canActivate: [permissionGuard],
        data: {
            breadcrumb: 'Types de Document QMS',
            permissions: ['document-type-read', 'document-type-write'],
            module: ModuleAbonnement.DOCUMENTAIRE
        }
    },
    {
        path: 'parametrage-document/priorites',
        component: PrioriteDocumentComponent,
        title: 'Priorités de document',
        canActivate: [permissionGuard],
        data: {
            breadcrumb: 'Priorités',
            permissions: ['priorite-document-read', 'priorite-document-write', 'CONFIG_READ'],
            module: ModuleAbonnement.DOCUMENTAIRE
        }
    },
    {
        path: 'parametrage-document/domaines',
        component: DomaineApplicationComponent,
        title: "Domaines d'application",
        canActivate: [permissionGuard],
        data: {
            breadcrumb: 'Domaines',
            permissions: ['domaine-application-read', 'domaine-application-write', 'CONFIG_READ'],
            module: ModuleAbonnement.DOCUMENTAIRE
        }
    },
    {
        path: 'parametrage-document/confidentialite',
        component: NiveauConfidentialiteComponent,
        title: 'Niveaux de confidentialité',
        canActivate: [permissionGuard],
        data: {
            breadcrumb: 'Confidentialité',
            permissions: ['niveau-confidentialite-read', 'niveau-confidentialite-write', 'CONFIG_READ'],
            module: ModuleAbonnement.DOCUMENTAIRE
        }
    },

    // Ancienne section « Configuration Workflow », absorbée par les onglets du centre de
    // configuration. Ses adresses sont conservées en redirections : des liens et des favoris
    // pointent encore dessus, y compris ceux d'avant l'éditeur unique, propres à un type de
    // ressource.
    { path: 'configuration-workflow', redirectTo: '/configurations/circuits', pathMatch: 'full' },
    { path: 'configuration-workflow/circuits', redirectTo: '/configurations/circuits', pathMatch: 'full' },
    { path: 'configuration-workflow/etapes', redirectTo: '/configurations/etapes-circuit', pathMatch: 'full' },
    { path: 'configuration-workflow/email-template', redirectTo: '/configurations/modeles-email', pathMatch: 'full' },
    { path: 'configuration-workflow/non-conformite', redirectTo: '/configurations/circuits', pathMatch: 'full' },
    { path: 'configuration-workflow/non-conformite/new', redirectTo: '/configurations/circuits', pathMatch: 'full' },
    { path: 'configuration-workflow/non-conformite/edit/:id', redirectTo: '/configurations/circuits', pathMatch: 'full' },
    { path: 'configuration-workflow/non-conformite/detail/:id', redirectTo: '/configurations/circuits', pathMatch: 'full' },
    { path: 'configuration-workflow/document', redirectTo: '/configurations/circuits', pathMatch: 'full' },
    { path: 'configuration-workflow/document/detail/:id', redirectTo: '/configurations/circuits', pathMatch: 'full' },

    {
        path: 'non-conformite',
        component: NonConformiteLayoutComponent,
        canActivate: [permissionGuard],
        data: {
            breadcrumb: 'Gestion des non-conformités',
            permissions: ['nc-read', 'nc-write', 'NC_READ', 'SUBMIT_NC', 'CONSULTATION_NC'],
            module: ModuleAbonnement.NON_CONFORMITE
        },
        children: [
            { path: '', redirectTo: 'vue-ensemble', pathMatch: 'full' },
            {
                path: 'declaration', component: NcComposeComponent, title: 'Declaration d\'une Non-Conformité',
                canActivate: [permissionGuard],
                data: { permissions: ['nc-write', 'SUBMIT_NC'] }
            },
            {
                path: 'declaration/:id', component: NcComposeComponent, title: 'Modification d\'une Non-Conformité',
                canActivate: [permissionGuard],
                data: { permissions: ['nc-write', 'SUBMIT_NC'] }
            },
            {
                path: 'vue-ensemble', component: NcVueEnsembleComponent, title: 'Vue d\'ensemble',
                canActivate: [permissionGuard],
                data: { permissions: ['nc-read', 'NC_READ', 'CONSULTATION_NC'] }
            },
            // Les quatre écrans de décision : chacun exige la permission de l'étape qu'il porte,
            // et non la simple lecture des non-conformités.
            {
                path: 'affectation-action', component: NCAffectationActionComponent, title: 'Affectations',
                canActivate: [permissionGuard],
                data: { permissions: ['nc-impute', 'IMPUTATION_NC'] }
            },
            {
                path: 'analyse-reception', component: AnalyseReceptionComponent, title: 'Analyse et Réception',
                canActivate: [permissionGuard],
                data: { permissions: ['nc-receive', 'RECEPTION_NC'] }
            },
            {
                path: 'analyse-validation', component: AnalyseValidationComponent, title: 'Analyse et Validation',
                canActivate: [permissionGuard],
                data: { permissions: ['nc-validate', 'VALIDATION_RQ'] }
            },
            {
                path: 'validation-pilote', component: ValidationPilote, title: 'Validation Pilote',
                canActivate: [permissionGuard],
                data: { permissions: ['nc-validate', 'VALIDATION_CHEF'] }
            },
            {
                path: 'analyse-cloture', component: AnalyseClotureComponent, title: 'Analyse et clôture',
                canActivate: [permissionGuard],
                data: { permissions: ['nc-close', 'RQ_NC'] }
            },
            {
                path: 'suivi', component: NCSuiviComponent, title: 'Suivi',
                canActivate: [permissionGuard],
                data: { permissions: ['nc-read', 'NC_READ', 'CONSULTATION_NC'] }
            },
            {
                path: 'publiees', component: NcPublieesComponent, title: 'Mes Non-Conformitées publiées',
                canActivate: [permissionGuard],
                data: { permissions: ['nc-read', 'NC_READ', 'CONSULTATION_NC'] }
            },
            {
                path: 'actions', component: TraitementGlobalComponent, title: 'Mes actions à mener',
                canActivate: [permissionGuard],
                data: { permissions: ['plan-action-read', 'plan-action-write', 'TRAITEMENT_PLAN'] }
            },
        ]
    },
    { path: 'profil', component: ProfilComponent, title: 'Liste des Profils' },
    {
        path: 'type-nc', component: SourceNonConformite, title: 'Types de non conformité',
        canActivate: [permissionGuard],
        data: { permissions: ['type-nc-read', 'type-nc-write', 'NC_ORIGIN_MANAGE'], module: ModuleAbonnement.NON_CONFORMITE }
    },
    {
        path: 'type-processus', component: CategorieProcessusComponent, title: 'Types de processus',
        canActivate: [permissionGuard],
        data: { permissions: ['type-processus-read', 'type-processus-write', 'TYPE_PROC_MANAGE'] }
    },
    {
        path: 'niveau-nc', component: NiveauNonConformiteComponent, title: 'Niveaux des non-conformités',
        canActivate: [permissionGuard],
        data: { permissions: ['niveau-nc-read', 'niveau-nc-write', 'NC_LEVEL_MANAGE'], module: ModuleAbonnement.NON_CONFORMITE }
    },
    {
        path: 'type-action', component: ActionNonConformiteComponent, title: 'Types d\'actions',
        canActivate: [permissionGuard],
        data: { permissions: ['action-read', 'action-write', 'ACTION_TYPE_MANAGE'], module: ModuleAbonnement.NON_CONFORMITE }
    },
    {
        path: 'gestion-documentaire',
        component: GestionDocumentaireLayoutComponent,
        canActivate: [permissionGuard],
        data: {
            breadcrumb: 'Gestion Documentaire',
            permissions: ['document-read', 'document-write', 'DOC_READ'],
            module: ModuleAbonnement.DOCUMENTAIRE
        },
        children: [
            { path: '', redirectTo: 'vue-ensemble', pathMatch: 'full' },
            {
                path: 'vue-ensemble',
                component: QmsVueEnsembleComponent,
                title: "Vue d'ensemble Documentaire",
                canActivate: [permissionGuard],
                data: { permissions: ['document-read', 'document-write', 'DOC_READ'], module: ModuleAbonnement.DOCUMENTAIRE }
            },
            {
                path: 'documents',
                component: QmsDocumentComponent,
                title: 'Gestion Documentaire QMS',
                canActivate: [permissionGuard],
                data: { permissions: ['document-read', 'document-write', 'DOC_READ'], module: ModuleAbonnement.DOCUMENTAIRE }
            },
            {
                path: 'partages',
                component: QmsDocumentsPartagesComponent,
                title: 'Documents partagés',
                canActivate: [permissionGuard],
                data: { permissions: ['document-read', 'document-write', 'DOC_READ'], module: ModuleAbonnement.DOCUMENTAIRE }
            },
            {
                path: 'demandes',
                component: QmsDemandesComponent,
                title: 'Demandes sur les documents',
                canActivate: [permissionGuard],
                // Déposer une demande relève de la lecture : c'est parce qu'on ne peut pas modifier
                // soi-même qu'on en fait la demande.
                data: { permissions: ['document-read', 'document-write', 'DOC_READ'], module: ModuleAbonnement.DOCUMENTAIRE }
            },
            {
                path: 'demandes/nouvelle',
                component: QmsDemandeCreateComponent,
                title: 'Nouvelle demande sur un document',
                canActivate: [permissionGuard],
                data: { permissions: ['document-read', 'document-write', 'DOC_READ'], module: ModuleAbonnement.DOCUMENTAIRE }
            },
            {
                path: 'nouveau',
                component: QmsDocumentCreateComponent,
                title: 'Créer un Document QMS',
                canActivate: [permissionGuard],
                data: { permissions: ['document-write'], module: ModuleAbonnement.DOCUMENTAIRE }
            },
        ]
    },
    { path: 'empty', component: Empty },
    { path: '**', redirectTo: '/notfound' },
] as Routes;
