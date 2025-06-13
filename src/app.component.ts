import { AfterViewInit, Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ShareConfirmToastComponent } from './app/components/share-confirm-toast/share-confirm-toast.component';
import { LoaderComponent } from './app/components/loader/loader.component';
import { AuthService } from './app/services/auth-services/auth.service';
import { KcUser } from './app/models';
import { take } from 'rxjs';
import { StructureService } from './app/pages/structure/structure-service';
import { USER_PROFILE_KEY, USER_STRUCTURE_KEY } from './app/utils';
import { MessageService } from 'primeng/api';
import { Toast } from 'primeng/toast';

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
        this.authService.getUserRoles().subscribe((roles) => {
            localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(roles.body));
        });
    }

    ngOnInit() {
        this.user = this.authService.getUser();
        this.authService.getUserRoles().subscribe((roles) => {
            localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(roles.body));
        });
        this.authService.getUserById(this.user!.userId).subscribe((value) => {
            this.userCurrentUser = value.body!;
            if (this.userCurrentUser.structure) {
                this.fetchStucture(this.userCurrentUser.structure);
            } else {
                this.messageService.add({ severity: 'info', summary: 'AVERTISSEMENT', detail: 'Votre utilisateur est mal configuré', life: 3000 });
            }
        });
    }

    fetchStucture(structureId: string) {
        this.structureService.getByStructureId(structureId).subscribe({
            next: (structure) => {
                localStorage.setItem(USER_STRUCTURE_KEY, JSON.stringify(structure));
            }
        });
    }
}
