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
import { KcUserComponent } from './kc-user/kc-user.component';

export default [
    { path: 'documentation', component: Documentation },
    { path: 'crud', component: Crud },
    { path: 'formation', component: FormationComponent },
    { path: 'fournisseur', component: FournisseurComponent },
    { path: 'prestataire', component: PrestataireComponent },
    { path: 'produit', component: ProduitComponent },
    { path: 'action-corrective-preventive', component: ActionCorrectivePreventiveComponent },
    { path: 'reclamation', component: ReclamationComponent },
    { path: 'risque', component: RisqueComponent },
    { path: 'audite', component: AuditeComponent },
    { path: 'non-conformite', component: NonConformiteComponent },
    { path: 'procedure-non-conformite', component: ProcedureNonConformiteComponent },
    { path: 'reglementation', component: reglementationComponent },
    { path: 'critere-evaluation', component: CritereEvaluationComponent },
    { path: 'users', data: {breadcrumb: 'Utilisateurs'}, component: KcUserComponent },
    { path: 'login', data: {breadcrumb: 'Connexion'}, component: LoginComponent },
    { path: 'empty', component: Empty },
    { path: '**', redirectTo: '/notfound' }
] as Routes;
