import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TraitementActionComponent } from './traitement-action.component';
import { TraiterComponent } from './traitement-action-draft/traiter.component';
import { NonTraiterComponent } from './traitement-action-published/non-traiter.component';

@NgModule({
    imports: [RouterModule.forChild([
        {
            path: '', component: TraitementActionComponent, children: [
                {path: '', redirectTo: 'non-traiter', pathMatch: 'full'},
                {path: 'traiter', data: {breadcrumb: 'Brouillons'}, component: TraiterComponent},
                {path: 'non-traiter', data: {breadcrumb: 'Publiées'}, component: NonTraiterComponent},
            ]
        }
    ])],
    exports: [RouterModule]
})
export class TraitementActionRoutingModule {
}
