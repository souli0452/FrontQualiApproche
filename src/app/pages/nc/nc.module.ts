import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NcRoutingModule } from './nc-routing.module';
import { NgPrimeModule } from '../../../prime-ng.module';
import { NcComponent } from './nc.component';
import { NcPublishedComponent } from './nc-published/nc-published.component';
import { NcComposeComponent } from './nc-compose/nc-compose.component';
import { NcDetailComponent } from './nc-detail/nc-detail.component';
import { NcSidebarComponent } from './nc-sidebar/nc-sidebar.component';
import { NcTableComponent } from './nc-table/nc-table.component';
import { NcDraftComponent } from './nc-draft/nc-draft.component';
import { NcArchiveComponent } from './nc-archive/nc-archive.component';
import { NcPublieesComponent } from './nc-publiees/nc-publiees';
import { LightboxComponent } from '../../components/non-conformite/lightbox/lightbox';
import { FileUploadComponent } from '../../components/non-conformite/file-upload/file-upload.component';


@NgModule({
    imports: [
        CommonModule, 
        FormsModule, 
        NcRoutingModule, 
        NgPrimeModule, 
        FileUploadComponent,
        LightboxComponent
    ],
    declarations: [
        NcComponent, 
        NcPublishedComponent,
        NcComposeComponent, 
        NcArchiveComponent, 
        NcDetailComponent, 
        NcSidebarComponent, 
        NcTableComponent, 
        NcDraftComponent
    ],
    exports: [
        NcComposeComponent, 
        NcDraftComponent,
        NcTableComponent
    ]
})
export class NcModule {}
