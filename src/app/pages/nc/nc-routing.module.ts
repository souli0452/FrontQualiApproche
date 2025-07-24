import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NcComponent } from './nc.component';
import { NcPublishedComponent } from './nc-published/nc-published.component';
import { NcComposeComponent } from './nc-compose/nc-compose.component';
import { NcDetailComponent } from './nc-detail/nc-detail.component';
import { NcArchiveComponent } from './nc-archive/nc-archive.component';
import { NcDraftComponent } from './nc-draft/nc-draft.component';

@NgModule({
    imports: [RouterModule.forChild([
        {
            path: '', component: NcComponent, children: [
                {path: '', redirectTo: 'draft', pathMatch: 'full'},
                {path: 'draft', data: {breadcrumb: 'Brouillons'}, component: NcDraftComponent},
                {path: 'published', data: {breadcrumb: 'Publiées'}, component: NcPublishedComponent},
                {path: 'archived', data: {breadcrumb: 'Réjétées'}, component: NcArchiveComponent},

                {path: 'compose/:id', data: {breadcrumb: 'Ajout'}, component: NcComposeComponent},
                {path: 'detail/:id', data: {breadcrumb: 'Détail'}, component: NcDetailComponent}
            ]
        }
    ])],
    exports: [RouterModule]
})
export class NcRoutingModule {
}
