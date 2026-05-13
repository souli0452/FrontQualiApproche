import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TraitementActionComponent } from './traitement-action.component';
import { TraiterComponent } from './traitement-action-draft/traiter.component';
import { NonTraiterComponent } from './traitement-action-published/non-traiter.component';
import { NcDetailComponent } from '../../nc/nc-detail/nc-detail.component';
import { PlanActionDetailComponent } from './planAction-detail/planAction-detail.component';
import { RejeterComponent } from './traitement-action-rejete/rejeter.component';

@NgModule({
    imports: [RouterModule.forChild([
        {
            path: '', component: TraitementActionComponent, children: [
                { path: '', redirectTo: 'non-traiter', pathMatch: 'full' },
                { path: 'detail/:id', data: { breadcrumb: 'Détail' }, component: PlanActionDetailComponent },
                { path: 'traiter', data: { breadcrumb: 'Brouillons' }, component: TraiterComponent },
                { path: 'rejeter', data: { breadcrumb: 'Réjétés' }, component: RejeterComponent },
                { path: 'non-traiter', data: { breadcrumb: 'Publiées' }, component: NonTraiterComponent, title: 'Mise en oeuvre des plans d\'action' },
            ]
        }
    ])],
    exports: [RouterModule]
})
export class TraitementActionRoutingModule {
}
