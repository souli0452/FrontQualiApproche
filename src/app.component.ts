import { AfterViewInit, Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MessageService } from 'primeng/api';
import { AuthData } from './app/models/auth.model';
import { ShareConfirmToastComponent } from '@core/components/share-confirm-toast/share-confirm-toast.component';
import { QualiToastComponent } from '@core/notifications/quali-toast.component';
import { LoaderComponent } from '@core/components/loader/loader.component';
import { USER_STRUCTURE_KEY } from './app/utils/global/global-utils';
import { StructureService } from '@features/organigramme/services/structure.service';
import { InsideLoaderComponent } from '@core/components/inside-loader/inside-loader.component';

@Component({
    selector: 'app-root',
    standalone: true,
    providers: [],
    imports: [
        RouterModule, 
        ShareConfirmToastComponent,
        QualiToastComponent,
        InsideLoaderComponent,
    ],
    template: ` 
    <app-quali-toast></app-quali-toast>
    <app-share-confirm-toast></app-share-confirm-toast>
    <router-outlet></router-outlet>
    <app-inside-loader></app-inside-loader>
    `
})
export class AppComponent implements AfterViewInit {
    user!: any;
    userCurrentUser!: AuthData;
    constructor(
        protected messageService: MessageService,
        private structureService: StructureService,
    ) {}

    ngAfterViewInit() {}

    ngOnInit() {}

    fetchStucture(structureId: string) {
        this.structureService.getByStructureId(structureId).subscribe({
            next: (structure) => {
                localStorage.setItem(USER_STRUCTURE_KEY, JSON.stringify(structure));
            }
        });
    }
}
