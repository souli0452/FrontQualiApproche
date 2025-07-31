import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TraitementActionRoutingModule } from './traitement-action-routing.module';
import { TraitementActionComponent } from './traitement-action.component';
import { NonTraiterComponent } from './traitement-action-published/non-traiter.component';

import { TraitementActionSidebarComponent } from './traitement-action-sidebar/traitement-action-sidebar.component';
import { TraitementActionTableComponent } from './traitement-action-table/traitement-action-table.component';
import { TraiterComponent } from './traitement-action-draft/traiter.component';
import { NgPrimeModule } from '../../../../prime-ng.module';
import { DetailTemplateComponent } from '../../../components/detail-template/detail-template.component';
import { FileUploadComponent } from '../../../components/file-upload/file-upload.component';
import { PlanActionDetailComponent } from './planAction-detail/planAction-detail.component';
import { RejeterComponent } from './traitement-action-rejete/rejeter.component';



@NgModule({
    imports: [CommonModule, FormsModule, TraitementActionRoutingModule, NgPrimeModule, DetailTemplateComponent, FileUploadComponent],
    declarations: [RejeterComponent,TraitementActionComponent,PlanActionDetailComponent, NonTraiterComponent, TraitementActionSidebarComponent, TraitementActionTableComponent, TraiterComponent]
})
export class TraitementActionModule {}

