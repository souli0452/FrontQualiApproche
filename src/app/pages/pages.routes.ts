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
import { NonConformiteComponent } from './non-conformite/non-conformite';
import { ProcedureNonConformiteComponent } from './procedure-non-conformite/procedure-non-conformite';
import { reglementationComponent } from './reglementation/reglementation';
import { CritereEvaluationComponent } from './critere-evaluation/critere-evaluation';
import { LoginComponent } from './login/login.component';
import { ReceptionComponent } from './proc-non-conformite/reception/reception.component';
import { ValidationComponent } from './proc-non-conformite/validation/validation.component';
import { TraitementComponent } from './proc-non-conformite/traitement/traitement.component';
import { ClotureComponent } from './proc-non-conformite/cloture/cloture.component';
import { StructureComponent } from './structure/structure-view/structure.component';
import { TypeStructure } from '../enums';
import { ConsultationsComponent } from './proc-non-conformite/consultations/consultations.component';
import { ValidationRSComponent } from './proc-non-conformite/validation-rs/validation-rs.component';
import { ImputationComponent } from './proc-non-conformite/imputation/imputation.component';
import { KcUserComponent } from './kc-user/kc-user.component';
import { ProfilComponent } from './profil/profil.component';
import { TypeNonConformiteComponent } from './procedure-non-conformite/types/type-non-conformite';
import { TypeProcessusComponent } from './procedure-non-conformite/types/type-processus';
import { NiveauNonConformiteComponent } from './procedure-non-conformite/niveau/niveau';
import { ActionNonConformiteComponent } from './procedure-non-conformite/action/action';
import { PlanActionComponent } from './proc-non-conformite/plan-action/plan-action.component';
import { ConfigGComponent } from './config-g/config-g.component';
import { SearchResultsComponent } from './recherche/search-results';
import { RoleComponent } from './role/role-table/role.component';
import { RoleDetailComponent } from './role/role-detail/role-detail.component';
import { NonConformiteLayoutComponent } from '../layout/non-conformite/non-conformite';
import { NcVueEnsembleComponent } from './nc/nc-vue-ensemble/vue-ensemble';
import { NCAffectationActionComponent } from './nc/nc-affectation-action/nc-affectation-action';
import { NCAnalyseValidationComponent } from './nc/nc-analyse-validation/nc-analyse-validation';
import { NCSuiviComponent } from './nc/nc-suivi/nc-suivi';


export default [
    { path: 'roles', data: { breadcrumb: 'Rôles' }, component: RoleComponent, title: 'Gestion des Rôles' },
    { path: 'roles/:id', data: { breadcrumb: 'Détail du Rôle' }, component: RoleDetailComponent, title: 'Gestion des Rôles' },
    { path: 'recherche', component: SearchResultsComponent, title: 'Résultats de recherche' },
    { path: 'documentation', component: Documentation },
    { path: 'crud', component: Crud },
    { path: 'config-global', component: ConfigGComponent, title: 'Configuration Globale' },
    { path: 'formation', component: FormationComponent, title: 'Formations' },
    { path: 'fournisseur', component: FournisseurComponent, title: 'Liste des Fournisseurs' },
    { path: 'prestataire', component: PrestataireComponent, title: 'Liste des Prestataires' },
    { path: 'produit', component: ProduitComponent, title: 'Liste des Produits' },
    { path: 'action-corrective-preventive', component: ActionCorrectivePreventiveComponent, title: 'Actions Correctives et Préventives' },
    { path: 'reclamation', component: ReclamationComponent, title: 'Liste des Réclamations' },
    { path: 'risque', component: RisqueComponent, title: 'Liste des Risques' },
    { path: 'audite', component: AuditeComponent, title: 'Liste des Audites' },
    { path: 'procedure-non-conformite', component: ProcedureNonConformiteComponent, title: 'Liste des Procédures de Non Conformité' },
    { path: 'reglementation', component: reglementationComponent, title: 'Liste des Réglementations' },
    { path: 'critere-evaluation', component: CritereEvaluationComponent, title: 'Critères d\'évaluation' },
    { path: 'users', data: { breadcrumb: 'Utilisateurs' }, component: KcUserComponent, title: 'Gestion des Utilisateurs' },

    { path: 'reception', data: { breadcrumb: 'Réception' }, component: ReceptionComponent, title: 'Réception des non-conformités' },
    { path: 'validation', data: { breadcrumb: 'Validation' }, component: ValidationComponent, title: 'Validation des non-conformités' },
    { path: 'traitement', data: { breadcrumb: 'Traitement' }, component: TraitementComponent, title: 'Traitement des non-conformités' },
    { path: 'cloture', data: { breadcrumb: 'Cloture' }, component: ClotureComponent, title: 'Clôture des non-conformités' },
    { path: 'consultation', data: { breadcrumb: 'Consultations' }, component: ConsultationsComponent, title: 'Consultations des non-conformités' },
    { path: 'validation_rs', data: { breadcrumb: 'validation' }, component: ValidationRSComponent, title: 'Validation RS' },
    { path: 'imputation', data: { breadcrumb: 'imputations' }, component: ImputationComponent, title: 'Imputations' },
    { path: 'plan-action', data: { breadcrumb: 'Traitements plan action' }, component: PlanActionComponent, title: 'Plan d\'action' },

    {
        path: 'direction',
        component: StructureComponent,
        title: 'Liste des Directions',
        data: {
            breadcrumb: 'Direction',
            typeStructure: TypeStructure.DIRECTION
        }
    },
    {
        path: 'service',
        component: StructureComponent,
        title: 'Liste des Services',
        data: {
            breadcrumb: 'service',
            typeStructure: TypeStructure.SERVICE
        }
    },
    {
        path: 'non-conformite',
        component: NonConformiteLayoutComponent, // C'est ici qu'on utilise le nouveau layout
        data: { breadcrumb: 'Gestion des non-conformités' },
        children: [
            {
                path: '',
                redirectTo: 'vue-ensemble',
                pathMatch: 'full'
            },
            {
                path: 'vue-ensemble',
                component: NcVueEnsembleComponent, // Ta nouvelle vue d'ensemble propre
                title: 'Vue d\'ensemble',
                data: { breadcrumb: 'Vue d\'ensemble' }
            },
            {
                path: 'affectation-action',
                component: NCAffectationActionComponent,
                title: 'Affectations et Suivis des Actions',
                data: { breadcrumb: 'Affectations et Suivis des Actions' }
            },
            {
                path: 'analyse-validation',
                component: NCAnalyseValidationComponent,
                title: 'Analyse et Validation des Non-Conformités',
                data: { breadcrumb: 'Analyse et Validation' }
            },
            {
                path: 'suivi',
                component: NCSuiviComponent,
                title: 'Suivi des Non-Conformités',
                data: { breadcrumb: 'Suivi' }
            },
            // Ajoute ici les autres routes (reception, validation, etc.)
        ]
    },
    { path: 'profil', component: ProfilComponent, title: 'Liste des Profils' },
    { path: 'type-nc', component: TypeNonConformiteComponent, title: 'Types de non conformité' },
    { path: 'type-processus', component: TypeProcessusComponent, title: 'Types de processus' },
    { path: 'niveau-nc', component: NiveauNonConformiteComponent, title: 'Niveaux des non-conformités' },
    { path: 'type-action', component: ActionNonConformiteComponent, title: 'Types d\'actions' },
    { path: 'empty', component: Empty },
    { path: '**', redirectTo: '/notfound' },
] as Routes;
