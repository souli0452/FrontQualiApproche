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
import { StructureComponent } from './structure/structure.component';
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

export default [
    { path: 'documentation', component: Documentation },
    { path: 'crud', component: Crud },
    { path: 'config-global', component: ConfigGComponent },
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

    {path: 'reception', data: {breadcrumb: 'Réception'}, component: ReceptionComponent},
    {path: 'validation', data: {breadcrumb: 'Validation'}, component: ValidationComponent},
    {path: 'traitement', data: {breadcrumb: 'Traitement'}, component: TraitementComponent},
    {path: 'cloture', data: {breadcrumb: 'Cloture'}, component: ClotureComponent},
    {path: 'consultation', data: {breadcrumb: 'Consultations'}, component: ConsultationsComponent},
    {path: 'validation_rs', data: {breadcrumb: 'validation'}, component: ValidationRSComponent},
    {path: 'imputation', data: {breadcrumb: 'imputations'}, component: ImputationComponent},
    {path: 'plan-action', data: {breadcrumb: 'Traitements plan action'}, component: PlanActionComponent},

    {
        path: 'direction',
        component: StructureComponent,
        data: {
            breadcrumb: 'Direction',
            typeStructure: TypeStructure.DIRECTION
        }
    },
    {
        path: 'service',
        component: StructureComponent,
        data: {
            breadcrumb: 'service',
            typeStructure: TypeStructure.SERVICE
        }
    },
    { path: 'profil', component: ProfilComponent },
    { path: 'type-nc', component: TypeNonConformiteComponent },
    { path: 'type-processus', component: TypeProcessusComponent },
    { path: 'niveau-nc', component: NiveauNonConformiteComponent },
    { path: 'type-action', component: ActionNonConformiteComponent },
    { path: 'empty', component: Empty },
    { path: '**', redirectTo: '/notfound' },
] as Routes;
