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
import { TypeStructure } from '../enums/enums';
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
import { QmsDocumentTypeComponent } from './module-gestion-documentaire/qms-document-type/qms-document-type';


export default [
    { path: 'recherche', component: SearchResultsComponent, title: 'Résultats de recherche' },
    { path: 'documentation', component: Documentation },
    { path: 'crud', component: Crud },
    { path: 'formation', component: FormationComponent, title: 'Formations' },
    { path: 'fournisseur', component: FournisseurComponent, title: 'Liste des Fournisseurs' },
    { path: 'prestataire', component: PrestataireComponent, title: 'Liste des Prestataires' },
    { path: 'produit', component: ProduitComponent, title: 'Liste des Produits' },
    { path: 'action-corrective-preventive', component: ActionCorrectivePreventiveComponent, title: 'Actions Correctives et Préventives' },
    { path: 'reclamation', component: ReclamationComponent, title: 'Liste des Réclamations' },
    { path: 'risque', component: RisqueComponent, title: 'Liste des Risques' },
    { path: 'audite', component: AuditeComponent, title: 'Liste des Audites' },
    { path: 'reglementation', component: reglementationComponent, title: 'Liste des Réglementations' },
    { path: 'critere-evaluation', component: CritereEvaluationComponent, title: 'Critères d\'évaluation' },
    {
        path: 'configurations', 
        component: ParametragesComponent, 
        data: { breadcrumb: 'Configurations Globales' },
        children: [
            { path: '', redirectTo: 'config-systeme', pathMatch: 'full' },
            { path: 'config-systeme', component: ConfigGComponent, title: 'Configuration Système' },
            { path: 'utilisateurs', component: KcUserComponent, title: 'Utilisateurs' },
            { path: 'roles', component: RoleComponent, title: 'Rôles' },
            { path: 'roles/:id', component: RoleDetailComponent, title: 'Détail Rôle' },
            { path: 'type-processus', component: CategorieProcessusComponent, title: 'Processus' },
            { path: 'type-nc', component: SourceNonConformite, title: 'Types NC' },
            { path: 'niveau-nc', component: NiveauNonConformiteComponent, title: 'Niveaux NC' },
            { path: 'type-action', component: ActionNonConformiteComponent, title: 'Actions' },
            { path: 'direction', component: StructureComponent, title: 'Liste des Directions', data: { typeStructure: TypeStructure.DIRECTION } },
            { path: 'service', component: StructureComponent, title: 'Services', data: { typeStructure: TypeStructure.SERVICE } },
        ]
    },

    {
        path: 'non-conformite',
        component: NonConformiteLayoutComponent,
        data: { breadcrumb: 'Gestion des non-conformités' },
        children: [
            { path: '', redirectTo: 'vue-ensemble', pathMatch: 'full' },
            { path: 'declaration', component: NcComposeComponent, title: 'Declaration d\'une Non-Conformité' },
            { path: 'declaration/:id', component: NcComposeComponent, title: 'Modification d\'une Non-Conformité' },
            { path: 'vue-ensemble', component: NcVueEnsembleComponent, title: 'Vue d\'ensemble' },
            { path: 'affectation-action', component: NCAffectationActionComponent, title: 'Affectations' },
            { path: 'analyse-reception', component: AnalyseReceptionComponent, title: 'Analyse et Réception' },
            { path: 'analyse-validation', component: AnalyseValidationComponent, title: 'Analyse et Validation' },
            { path: 'validation-pilote', component: ValidationPilote, title: 'Validation Pilote' },
            { path: 'analyse-cloture', component: AnalyseClotureComponent, title: 'Analyse et clôture' },
            { path: 'suivi', component: NCSuiviComponent, title: 'Suivi' },
            { path: 'publiees', component: NcPublieesComponent, title: 'Mes Non-Conformitées publiées' },
            { path: 'actions', component: TraitementGlobalComponent, title: 'Mes actions à mener' },
        ]
    },
    { path: 'profil', component: ProfilComponent, title: 'Liste des Profils' },
    { path: 'type-nc', component: SourceNonConformite, title: 'Types de non conformité' },
    { path: 'type-processus', component: CategorieProcessusComponent, title: 'Types de processus' },
    { path: 'niveau-nc', component: NiveauNonConformiteComponent, title: 'Niveaux des non-conformités' },
    { path: 'type-action', component: ActionNonConformiteComponent, title: 'Types d\'actions' },
    { path: 'qms-documents', data: { breadcrumb: 'Documents QMS' }, component: QmsDocumentComponent, title: 'Gestion Documentaire QMS' },
    { path: 'qms-document-create', data: { breadcrumb: 'Nouveau Document' }, component: QmsDocumentCreateComponent, title: 'Créer un Document QMS' },
    { path: 'qms-document-types', data: { breadcrumb: 'Types de Document QMS' }, component: QmsDocumentTypeComponent, title: 'Configuration des Types de Document' },
    { path: 'empty', component: Empty },
    { path: '**', redirectTo: '/notfound' },
] as Routes;
