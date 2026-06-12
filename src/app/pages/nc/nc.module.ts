import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgPrimeModule } from '../../../prime-ng.module';
import { NcDetailComponent } from './nc-detail/nc-detail.component';
import { NcDraftComponent } from './nc-draft/nc-draft.component';
import { NcArchiveComponent } from './nc-archive/nc-archive.component';
import { LightboxComponent } from '../../components/non-conformite/lightbox/lightbox';
import { FileUploadComponent } from '../../components/non-conformite/file-upload/file-upload.component';
import { NcTableComponent } from '../../components/non-conformite/nc-table/nc-table.component';


@NgModule({
    imports: [
        CommonModule, 
        FormsModule,
        NgPrimeModule, 
        FileUploadComponent,
        LightboxComponent
    ],
    declarations: [
        // NcComposeComponent, 
        NcArchiveComponent, 
        NcDetailComponent, 
        NcDetailComponent, 
        NcTableComponent, 
        NcDraftComponent
    ],
    exports: [
        // NcComposeComponent, 
        NcDraftComponent,
        NcTableComponent
    ]
})
export class NcModule {}
