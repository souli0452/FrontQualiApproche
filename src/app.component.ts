import { AfterViewInit, Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ShareConfirmToastComponent } from './app/components/share-confirm-toast/share-confirm-toast.component';
import { LoaderComponent } from './app/components/loader/loader.component';
import { AuthService } from './app/services/auth-services/auth.service';
import { KcUser } from './app/models';
import { take } from 'rxjs';
import { USER_PROFILE_KEY, USER_STRUCTURE_KEY } from './app/utils';
import { MessageService } from 'primeng/api';
import { Toast } from 'primeng/toast';
import { StructureService } from './app/pages/parametrages/structure/structure-service/structure-service';

@Component({
    selector: 'app-root',
    standalone: true,
    providers: [MessageService],
    imports: [RouterModule, ShareConfirmToastComponent, LoaderComponent, Toast],
    template: ` <p-toast /><app-share-confirm-toast></app-share-confirm-toast><router-outlet></router-outlet> <app-loader></app-loader>`
})
export class AppComponent implements AfterViewInit {
    user!: any;
    userCurrentUser!: KcUser;
    constructor(
        protected messageService: MessageService,
        private authService: AuthService,
        private structureService: StructureService,
    ) {}

    ngAfterViewInit() {
    }

    ngOnInit() {


    }

    fetchStucture(structureId: string) {
        this.structureService.getByStructureId(structureId).subscribe({
            next: (structure) => {
                localStorage.setItem(USER_STRUCTURE_KEY, JSON.stringify(structure));
            }
        });
    }
}
