import { Routes } from '@angular/router';

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
import { ModuleAbonnement, TypeStructure } from '@core/enums';
import { 
    UtilisateursListeComponent as KcUserComponent, 
    UtilisateurFormComponent as KcUserFormComponent, 
    RolesListeComponent as RoleComponent, 
    RoleDetailComponent 
} from '@features/gestion-utilisateurs';
import { ProfilComponent } from '@features/auth';
import { ConfigurationsComponent, ParametresComponent } from '../configurations';
import { RechercheGlobaleComponent } from '@shared';
import { NonConformiteLayoutComponent } from '@features/non-conformite/layout';
import { 
    NcVueEnsembleComponent, 
    NcSuiviComponent, 
    NcComposeComponent, 
    NCTraitementComponent 
} from '@features/non-conformite/pages';
// ❌ SUPPRIMÉS — Ces pages par étape sont remplacées par nc-traitement-suivi (moteur workflow).
// Les dossiers correspondants peuvent être supprimés physiquement.
// import { NCAffectationActionComponent } from './module-nc/nc-affectation-action/nc-affectation-action';
// import { AnalyseReceptionComponent } from './module-nc/nc-analyse-reception/nc-analyse-reception';
// import { NCSuiviComponent } from './module-nc/nc-suivi/nc-suivi';
// import { AnalyseValidationComponent } from './module-nc/nc-analyse-validation/nc-analyse-validation';
// import { TraitementGlobalComponent } from './module-nc/nc-action-a-mener/nc-traitement-global';
import { NiveauNonConformiteComponent, SourceNonConformite } from '@features/non-conformite/referentiel';
import { CategorieProcessusComponent, StructureComponent, StructureFormComponent } from '@features/organigramme/pages';
// import { ValidationPilote } from './module-nc/nc-validation-pilote/nc-validation-pilote';
// import { AnalyseClotureComponent } from './module-nc/nc-analyse-cloture/nc-analyse-cloture';
import { 
    QmsDocumentComponent, 
    QmsDocumentCreateComponent, 
    QmsVueEnsembleComponent, 
    QmsDocumentsPartagesComponent, 
    QmsDemandesComponent, 
    QmsDemandeCreateComponent 
} from '@features/gestion-documentaire/pages';
import { GestionDocumentaireLayoutComponent } from '@features/gestion-documentaire/layout';
import { 
    QmsDocumentTypeComponent, 
    PrioriteDocumentComponent, 
    NiveauConfidentialiteComponent, 
    DomaineApplicationComponent 
} from '@features/gestion-documentaire/referentiel';
import { 
    CircuitsListeComponent, 
    CircuitDetailPageComponent, 
    WorkflowEditorComponent,
    WorkflowStepTemplateComponent,
    EmailTemplateWorkflowComponent
} from '@features/workflow';
import { permissionGuard } from '../core/guards/permission.guard';
import { LicenceComponent } from '@core/licence';
import { PlanActionComponent } from '@features/non-conformite/pages/plan-action/plan-action.component';

// Les permissions déclarées ici reprennent celles du menu (app.menu.ts) : une entrée masquée
// correspond à une route fermée. Les noms en majuscules sont les anciennes permissions, encore
// acceptées le temps de la migration — mêmes couples que côté back.
//
// Angular n'hérite pas le `data` d'une route parente porteuse de composant : chaque route
// restreinte déclare donc le sien. Le garde posé sur un parent couvre en revanche tous ses
// enfants, et ceux-ci ne font qu'affiner.
export default [
    { path: 'recherche', component: RechercheGlobaleComponent, title: 'Résultats de recherche' },
    {
        // Aucun module exigé : la licence se consulte et se pose quel que soit l'abonnement —
        // en exiger un fermerait l'écran qui sert précisément à en ouvrir.
        path: 'licence', component: LicenceComponent, title: "Licence de l'installation",
        canActivate: [permissionGuard],
        data: { permissions: ['licence-write', 'config-global-write', 'CONFIG_GLOBAL_MANAGE'] }
    },

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
        path: 'utilisateurs/create', component: KcUserFormComponent, title: 'Nouvel Utilisateur',
        canActivate: [permissionGuard],
        data: { permissions: ['MANAGE_USER'] }
    },
    {
        path: 'utilisateurs/edit/:id', component: KcUserFormComponent, title: 'Modifier Utilisateur',
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
        path: 'direction/create', component: StructureFormComponent, title: 'Nouvelle Direction',
        canActivate: [permissionGuard],
        data: {
            typeStructure: TypeStructure.DIRECTION,
            permissions: ['structure-write', 'STRUCT_MANAGE']
        }
    },
    {
        path: 'direction/edit/:id', component: StructureFormComponent, title: 'Modifier Direction',
        canActivate: [permissionGuard],
        data: {
            typeStructure: TypeStructure.DIRECTION,
            permissions: ['structure-write', 'STRUCT_MANAGE']
        }
    },
    {
        path: 'parametrage-organigramme/processus', component: StructureComponent, title: 'Processus',
        canActivate: [permissionGuard],
        data: {
            typeStructure: TypeStructure.SERVICE,
            permissions: ['structure-read', 'structure-write', 'STRUCT_MANAGE', 'SERVICE_MANAGE']
        }
    },
    {
        path: 'parametrage-organigramme/processus/create', component: StructureFormComponent, title: 'Nouveau Processus',
        canActivate: [permissionGuard],
        data: {
            typeStructure: TypeStructure.SERVICE,
            permissions: ['structure-write', 'SERVICE_MANAGE']
        }
    },
    {
        path: 'parametrage-organigramme/processus/edit/:id', component: StructureFormComponent, title: 'Modification de Processus',
        canActivate: [permissionGuard],
        data: {
            typeStructure: TypeStructure.SERVICE,
            permissions: ['structure-write', 'SERVICE_MANAGE']
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
                path: 'config-systeme', component: ParametresComponent,
                title: 'Réglages de l\'organisation',
                canActivate: [permissionGuard],
                data: { permissions: ['config-global-read', 'config-global-write', 'CONFIG_READ', 'CONFIG_GLOBAL_MANAGE'] }
            },
            {
                path: 'circuits', component: CircuitsListeComponent, title: 'Circuits de validation',
                canActivate: [permissionGuard],
                data: { permissions: ['workflow-read', 'workflow-write'] }
            },
            {
                path: 'circuits/detail/:id', component: CircuitDetailPageComponent, title: 'Détail du circuit',
                canActivate: [permissionGuard],
                data: { permissions: ['workflow-read', 'workflow-write'] }
            },
            {
                path: 'circuits/edition/:id', component: WorkflowEditorComponent, title: 'Édition du circuit',
                canActivate: [permissionGuard],
                data: { permissions: ['workflow-write'] }
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
                path: 'create', component: NcComposeComponent, title: 'Déclaration d\'une Non-Conformité',
                canActivate: [permissionGuard],
                data: { permissions: ['nc-write', 'SUBMIT_NC'] }
            },
            {
                path: 'edit/:id', component: NcComposeComponent, title: 'Modification d\'une Non-Conformité',
                canActivate: [permissionGuard],
                data: { permissions: ['nc-write', 'SUBMIT_NC'] }
            },
            { path: 'declaration', redirectTo: 'create', pathMatch: 'full' },
            { path: 'declaration/:id', redirectTo: 'edit/:id', pathMatch: 'full' },
            {
                path: 'vue-ensemble', component: NcVueEnsembleComponent, title: 'Vue d\'ensemble',
                canActivate: [permissionGuard],
                data: { permissions: ['nc-read', 'NC_READ', 'CONSULTATION_NC'] }
            },
            // Les quatre écrans de décision : chacun exige la permission de l'étape qu'il porte,
            // et non la simple lecture des non-conformités.
            // ❌ ROUTES SUPPRIMÉES — Anciennes pages dédiées à chaque étape du workflow NC.
            // Toutes absorbées par /traitement-suivi (NCTraitementSuiviComponent) depuis
            // la mise en place du moteur workflow. Les dossiers peuvent être supprimés :
            //   nc-affectation-action, nc-analyse-reception, nc-analyse-validation,
            //   nc-validation-pilote (top-level), nc-analyse-cloture, nc-suivi
            //
            // { path: 'affectation-action', component: NCAffectationActionComponent, ... },
            // { path: 'analyse-reception', component: AnalyseReceptionComponent, ... },
            // { path: 'analyse-validation', component: AnalyseValidationComponent, ... },
            // { path: 'validation-pilote', component: ValidationPilote, ... },
            // { path: 'analyse-cloture', component: AnalyseClotureComponent, ... },
            // { path: 'suivi', component: NCSuiviComponent, ... },
            {
                path: 'traitement', component: NCTraitementComponent, title: 'Traitement',
                canActivate: [permissionGuard],
                data: { 
                    permissions: [
                        'nc-read', 'NC_READ', 'CONSULTATION_NC', 
                        'nc-impute', 'IMPUTATION_NC', 
                        'nc-receive', 'RECEPTION_NC', 
                        'nc-validate', 'VALIDATION_RQ', 'VALIDATION_CHEF', 
                        'nc-close', 'RQ_NC', 
                        'plan-action-read', 'plan-action-write', 'TRAITEMENT_PLAN'
                    ] 
                }
            },
                        {
                path: 'plan-action', component: PlanActionComponent, title: 'Plan d\'action',
                canActivate: [permissionGuard],
                data: { 
                    permissions: [
                        'nc-read', 'NC_READ', 'CONSULTATION_NC', 
                        'nc-impute', 'IMPUTATION_NC', 
                        'nc-receive', 'RECEPTION_NC', 
                        'nc-validate', 'VALIDATION_RQ', 'VALIDATION_CHEF', 
                        'nc-close', 'RQ_NC', 
                        'plan-action-read', 'plan-action-write', 'TRAITEMENT_PLAN'
                    ] 
                }
            },
            {
                path: 'suivi', component: NcSuiviComponent, title: 'Suivi des non-conformités',
                canActivate: [permissionGuard],
                data: { permissions: ['nc-read', 'NC_READ', 'CONSULTATION_NC'] }
            },
            // { path: 'suivi', redirectTo: 'suivi', pathMatch: 'full' },
            // { path: 'actions', component: TraitementGlobalComponent, ... }, // ❌ Absorbé par /traitement-suivi
        ]
    },
    { path: 'profil', component: ProfilComponent, title: 'Mon profil' },
    {
        path: 'type-nc', component: SourceNonConformite, title: 'Types de non conformité',
        canActivate: [permissionGuard],
        data: { permissions: ['type-nc-read', 'type-nc-write', 'NC_ORIGIN_MANAGE'], module: ModuleAbonnement.NON_CONFORMITE }
    },
    {
        path: 'parametrage-organigramme/categorie-processus', component: CategorieProcessusComponent, title: 'Categorie de processus',
        canActivate: [permissionGuard],
        data: { permissions: ['type-processus-read', 'type-processus-write', 'TYPE_PROC_MANAGE'] }
    },
    {
        path: 'niveau-nc', component: NiveauNonConformiteComponent, title: 'Niveaux des non-conformités',
        canActivate: [permissionGuard],
        data: { permissions: ['niveau-nc-read', 'niveau-nc-write', 'NC_LEVEL_MANAGE'], module: ModuleAbonnement.NON_CONFORMITE }
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
                path: 'create',
                component: QmsDocumentCreateComponent,
                title: 'Créer un Document QMS',
                canActivate: [permissionGuard],
                data: { permissions: ['document-write'], module: ModuleAbonnement.DOCUMENTAIRE }
            },
            { path: 'nouveau', redirectTo: 'create', pathMatch: 'full' },
        ]
    },

    { path: '**', redirectTo: '/notfound' },
] as Routes;
