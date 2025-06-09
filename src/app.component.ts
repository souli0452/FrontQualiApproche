import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ShareConfirmToastComponent } from './app/components/share-confirm-toast/share-confirm-toast.component';
import { LoaderComponent } from './app/components/loader/loader.component';
import { AuthService } from './app/services/auth-services/auth.service';
import { KcUser } from './app/models';
import { take } from 'rxjs';
import { StructureService } from './app/pages/structure/structure-service';
import { USER_STRUCTURE_KEY } from './app/utils';
import { MessageService } from 'primeng/api';
import { Toast } from 'primeng/toast';

@Component({
    selector: 'app-root',
    standalone: true,
    providers: [MessageService],
    imports: [RouterModule, ShareConfirmToastComponent, LoaderComponent, Toast],
    template: ` <p-toast /><app-share-confirm-toast></app-share-confirm-toast><router-outlet></router-outlet> <app-loader></app-loader>`
})
export class AppComponent {
    user!: any;
    userCurrentUser!: KcUser;
    constructor(
        private authService: AuthService,
        private structureService: StructureService,
        protected messageService: MessageService
    ) {}

    ngOnInit() {
        this.user = this.authService.getUser()!;
        this.authService.getUserById(this.user.userId).subscribe((value) => {
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
